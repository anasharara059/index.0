const MODEL = process.env.GEMINI_MODEL || 'gemini-3.6-flash';

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': 'no-store',
    },
  });
}

function extractText(data) {
  return (data?.candidates?.[0]?.content?.parts || [])
    .map((part) => part?.text || '')
    .join('')
    .trim();
}

export default async function handler(request) {
  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      },
    });
  }

  if (request.method !== 'POST') {
    return json({ error: 'Method not allowed. Use POST /api/ai.' }, 405);
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return json({ error: 'GEMINI_API_KEY is not configured in Vercel.' }, 500);
  }

  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: 'Invalid JSON body.' }, 400);
  }

  const message = String(body?.message || '').trim();
  if (!message) {
    return json({ error: 'Message is required.' }, 400);
  }

  const language = body?.language === 'ar' ? 'Arabic' : 'English';
  const context = body?.context || {};

  const prompt = [
    'You are the AI Study Coach inside the INDEX study assistant.',
    'Hierarchy: Subject -> Branch -> Lecture.',
    'Lectures are the schedulable study items.',
    'Use only the supplied INDEX data. Never invent subjects, branches, lectures, dates, priorities, or completed work.',
    'Be practical, concise, and specific. When suggesting schedule changes, use exact dates/times from the supplied data.',
    `Answer in ${language}.`,
    '',
    'INDEX DATA:',
    JSON.stringify(context),
    '',
    'USER REQUEST:',
    message,
  ].join('\n');

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(apiKey)}`;

  try {
    const upstream = await fetch(endpoint, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.25,
          maxOutputTokens: 1800,
        },
      }),
    });

    const data = await upstream.json().catch(() => ({}));

    if (!upstream.ok) {
      return json(
        {
          error:
            data?.error?.message ||
            `Gemini API returned HTTP ${upstream.status}.`,
        },
        upstream.status,
      );
    }

    const text = extractText(data);
    if (!text) {
      return json({ error: 'Gemini returned an empty response.' }, 502);
    }

    return json({ text, model: MODEL });
  } catch (error) {
    return json(
      { error: error?.message || 'Unable to contact Gemini API.' },
      502,
    );
  }
}
