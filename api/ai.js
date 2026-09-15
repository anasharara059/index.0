export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    const message = String(body.message || '').trim();
    if (!message) return res.status(400).json({ error: 'Message is required.' });

    const apiKey = process.env.GEMINI_API_KEY || '';
    if (!apiKey) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured in Vercel.' });

    const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
    const language = body.language === 'ar' ? 'Arabic' : 'English';
    const context = body.context || {};

    const system = `You are the built-in AI Study Coach for the INDEX study app. Be practical, concise, and precise. The user's data is authoritative: do not invent lectures, branches, subjects, or completed work. The hierarchy is Subject -> Branch -> Lecture. Treat lectures as the schedulable study items. Use the supplied calendar data to reason about workload, conflicts, gaps, priorities and realistic study plans. When proposing schedule changes, use exact dates and times and keep existing lecture names unchanged. Never claim that you changed the calendar; you can only suggest changes unless an app action is explicitly available.`;
    const prompt = `${system}\nRespond in ${language} unless the user uses another language.\n\nAPP DATA:\n${JSON.stringify(context)}\n\nUSER REQUEST:\n${message}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.25, maxOutputTokens: 1800 }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(response.status).json({ error: data?.error?.message || `Gemini HTTP ${response.status}` });
    }

    const text = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('') || '';
    if (!text) return res.status(502).json({ error: 'Gemini returned an empty response.' });

    return res.status(200).json({ text, model });
  } catch (error) {
    console.error('AI route error:', error);
    return res.status(500).json({ error: error?.message || 'Server error' });
  }
}
