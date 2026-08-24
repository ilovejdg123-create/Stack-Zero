# STACK ZERO v40.4 TEST — GROQ + AZURE

## Brain
- Primary: Groq `openai/gpt-oss-120b`
- Fallback: Gemini

## Voice
- Primary: Azure Speech Korean Neural TTS
- Test/select: JiMin / SeoHyeon / YuJin
- Fallback: Gemini TTS → browser Korean TTS

## Vercel environment variables
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION` (example: `koreacentral`)
- optional `AZURE_SPEECH_VOICE`

Never put API keys in `index.html` or client-side JavaScript.
