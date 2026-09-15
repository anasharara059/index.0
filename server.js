const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const INDEX = path.join(ROOT, 'index.html');

function send(res, status, body, type='text/plain; charset=utf-8') {
  res.writeHead(status, {'Content-Type': type, 'Cache-Control':'no-store'});
  res.end(body);
}

function readJson(req) {
  return new Promise((resolve, reject) => {
    let raw = '';
    req.on('data', chunk => {
      raw += chunk;
      if (raw.length > 1024 * 1024) {
        req.destroy();
        reject(new Error('Request too large'));
      }
    });
    req.on('end', () => {
      try { resolve(raw ? JSON.parse(raw) : {}); }
      catch (e) { reject(new Error('Invalid JSON')); }
    });
    req.on('error', reject);
  });
}

async function handleAI(req, res) {
  if (req.method === 'OPTIONS') return send(res, 204, '');
  if (req.method !== 'POST') return send(res, 405, JSON.stringify({error:'Method not allowed'}), 'application/json; charset=utf-8');

  try {
    const body = await readJson(req);
    const message = String(body.message || '').trim();
    if (!message) return send(res, 400, JSON.stringify({error:'Message is required'}), 'application/json; charset=utf-8');

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) return send(res, 500, JSON.stringify({error:'GEMINI_API_KEY is missing in Vercel Environment Variables'}), 'application/json; charset=utf-8');

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const language = body.language === 'ar' ? 'Arabic' : 'English';
    const context = body.context || {};
    const prompt = `You are the AI Study Coach inside INDEX.\nTreat Subject -> Branch -> Lecture as the hierarchy. Lectures are the schedulable study items. Use only the supplied app data. Do not invent records. Give concise, actionable advice. Answer in ${language}.\n\nAPP DATA:\n${JSON.stringify(context)}\n\nUSER:\n${message}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const upstream = await fetch(url, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body:JSON.stringify({
        contents:[{role:'user', parts:[{text:prompt}]}],
        generationConfig:{temperature:0.25, maxOutputTokens:1800}
      })
    });

    const data = await upstream.json().catch(()=>({}));
    if (!upstream.ok) {
      return send(res, upstream.status, JSON.stringify({error:data?.error?.message || `Gemini HTTP ${upstream.status}`}), 'application/json; charset=utf-8');
    }
    const text = data?.candidates?.[0]?.content?.parts?.map(p=>p.text||'').join('') || '';
    if (!text) return send(res, 502, JSON.stringify({error:'Gemini returned an empty response'}), 'application/json; charset=utf-8');
    return send(res, 200, JSON.stringify({text, model}), 'application/json; charset=utf-8');
  } catch (err) {
    return send(res, 500, JSON.stringify({error:err.message || 'Server error'}), 'application/json; charset=utf-8');
  }
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  if (url.pathname === '/api/ai') return handleAI(req, res);
  if (url.pathname === '/' || url.pathname === '/index.html') {
    try {
      const html = fs.readFileSync(INDEX, 'utf8');
      return send(res, 200, html, 'text/html; charset=utf-8');
    } catch (e) {
      return send(res, 500, `INDEX HTML error: ${e.message}`);
    }
  }
  return send(res, 404, 'Not found');
});

server.listen(PORT, () => console.log(`INDEX server listening on ${PORT}`));
