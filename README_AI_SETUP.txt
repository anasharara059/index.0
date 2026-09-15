INDEX AI + Vercel (clean static + function setup)

Files:
- index.html
- api/ai.mjs
- .env.example

Do NOT upload a real .env file or API key to GitHub.

Vercel automatically serves index.html and deploys api/ai.mjs as /api/ai.
In Vercel Environment Variables set:
GEMINI_API_KEY = your new Gemini API key
GEMINI_MODEL = gemini-3.6-flash

The frontend calls POST /api/ai.
