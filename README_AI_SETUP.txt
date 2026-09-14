INDEX AI Coach

1) Create a NEW Gemini API key in Google AI Studio. Do not reuse or paste the exposed key from chat.
2) On Windows PowerShell:
   $env:GEMINI_API_KEY="YOUR_NEW_KEY"
   $env:GEMINI_MODEL="gemini-3.6-flash"
   node server.mjs
3) Open http://localhost:8787/ in your browser.

The API key stays on the Node server and is never placed inside the HTML file.
The AI panel can inspect the current Subject -> Branch -> Lecture hierarchy and scheduled calendar items and can analyze/prioritize/plan them.
