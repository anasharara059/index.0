module.exports = async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(204).end();

  if (req.method !== 'POST') {
    return res.status(405).json({
      error: 'Method not allowed. Use POST /api/ai.'
    });
  }

  const apiKey = process.env.GEMINI_API_KEY;

  if (!apiKey) {
    return res.status(500).json({
      error: 'GEMINI_API_KEY is not configured in Vercel.'
    });
  }

  let body = req.body || {};

  if (typeof body === 'string') {
    try {
      body = JSON.parse(body);
    } catch {
      return res.status(400).json({
        error: 'Invalid JSON body.'
      });
    }
  }

  const message = String(body?.message || '').trim();

  if (!message) {
    return res.status(400).json({
      error: 'Message is required.'
    });
  }

  const model = process.env.GEMINI_MODEL || 'gemini-3.6-flash';
  const language = body?.language === 'ar' ? 'Arabic' : 'English';
  const context = body?.context || {};

  const prompt = [
    'You are the AI Study Coach inside the INDEX study assistant.',
    'Hierarchy: Subject -> Branch -> Lecture. Lectures are the schedulable study items.',
    'Use only the supplied INDEX data. Never invent subjects, branches, lectures, dates, priorities, or completed work.',
    'Be practical, concise, and specific.',
    'When suggesting schedule changes, use exact dates and times from the supplied data.',
    `Answer in ${language}.`,
    '',
    'INDEX DATA:',
    JSON.stringify(context),
    '',
    'USER REQUEST:',
    message
  ].join('\n');

  const endpoint =
    `https://generativelanguage.googleapis.com/v1beta/models/` +
    `${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              {
                text: prompt
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1800
        }
      })
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return res.status(upstream.status).json({
        error:
          data?.error?.message ||
          `Gemini API returned HTTP ${upstream.status}.`
      });
    }

    const text = (data?.candidates?.[0]?.content?.parts || [])
      .map(p => p?.text || '')
      .join('')
      .trim();

    if (!text) {
      return res.status(502).json({
        error: 'Gemini returned an empty response.'
      });
    }

    return res.status(200).json({
      text,
      model
    });
  } catch (error) {
    console.error('AI function error:', error);

    return res.status(502).json({
      error: error?.message || 'Unable to contact Gemini API.'
    });
  }
};
