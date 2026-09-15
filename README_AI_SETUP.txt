INDEX AI Coach — Vercel setup

1) Put index.html at the repository root.
2) Put api/ai.js in a folder named api at the repository root.
3) Keep package.json and .env.example at the root.
4) On Vercel add Environment Variable:
   GEMINI_API_KEY = your NEW Gemini API key
   Environment: Production (you can also enable Preview/Development)
5) Redeploy.

Do NOT upload a real .env file or the API key to GitHub.

The browser calls /api/ai. Vercel deploys api/ai.js as a Function and serves index.html at /. 
