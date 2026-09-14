import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { URL } from 'node:url';

const PORT = Number(process.env.PORT || 8787);
const API_KEY = process.env.GEMINI_API_KEY || '';
const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
const HTML = path.resolve(process.env.INDEX_HTML || './INDEX_Calendar_GoogleLike_AI.html');

function send(res,status,data,type='application/json'){
  res.writeHead(status,{'Content-Type':type,'Cache-Control':'no-store','Access-Control-Allow-Origin':'*'});
  res.end(type.includes('json')?JSON.stringify(data):data);
}
function baseSystem(){return `You are the built-in AI Study Coach for the INDEX study app. Be practical, concise, and precise. The user's data is authoritative: do not invent lectures, branches, subjects, or completed work. The hierarchy is Subject -> Branch -> Lecture. Treat lectures as the schedulable study items. Use the supplied calendar data to reason about workload, conflicts, gaps, priorities and realistic study plans. When proposing schedule changes, use exact dates and times and keep existing lecture names unchanged. Never claim that you changed the calendar; you can only suggest changes unless an app action is explicitly available.`}
async function askGemini(message, context, language){
  if(!API_KEY) throw new Error('GEMINI_API_KEY is not configured on the server.');
  const url=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(API_KEY)}`;
  const prompt = `${baseSystem()}\nRespond in ${language==='ar'?'Arabic':'English'} unless the user uses another language.\n\nAPP DATA:\n${JSON.stringify(context)}\n\nUSER REQUEST:\n${message}`;
  const body={contents:[{role:'user',parts:[{text:prompt}]}],generationConfig:{temperature:0.25,maxOutputTokens:1800}};
  const r=await fetch(url,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)});
  const j=await r.json().catch(()=>({}));
  if(!r.ok) throw new Error(j?.error?.message||`Gemini HTTP ${r.status}`);
  const text=j?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('')||'';
  if(!text) throw new Error('Gemini returned an empty response.');
  return text;
}

const server=http.createServer(async (req,res)=>{
  try{
    const u=new URL(req.url,`http://${req.headers.host||'localhost'}`);
    if(req.method==='GET' && (u.pathname==='/'||u.pathname.endsWith('.html'))){
      if(!fs.existsSync(HTML)) return send(res,404,'INDEX HTML not found','text/plain');
      return send(res,200,fs.readFileSync(HTML,'utf8'),'text/html; charset=utf-8');
    }
    if(req.method==='POST' && u.pathname==='/api/ai'){
      let raw='';for await(const ch of req) raw+=ch;
      const body=JSON.parse(raw||'{}');
      const message=String(body.message||'').trim();
      if(!message)return send(res,400,{error:'Message is required.'});
      const text=await askGemini(message,body.context||{},body.language||'en');
      return send(res,200,{text,model:MODEL});
    }
    send(res,404,{error:'Not found'});
  }catch(e){send(res,500,{error:e?.message||'Server error'});}
});
server.listen(PORT,()=>console.log(`INDEX AI server running at http://localhost:${PORT}`));
