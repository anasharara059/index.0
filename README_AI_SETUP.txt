INDEX AI - Vercel setup

Put these files in the GitHub repository root:
- index.html
- server.js
- package.json
- .env.example
- README_AI_SETUP.txt

In Vercel Project Settings -> Environment Variables add:
GEMINI_API_KEY = your NEW Gemini API key

Do NOT commit a real .env file or API key to GitHub.

This version intentionally uses a root server.js so Vercel has an explicit Node entrypoint and serves index.html plus /api/ai.
