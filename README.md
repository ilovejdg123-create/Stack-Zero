# STACK ZERO v40.5 TEST — GROQ + JAPANESE AZURE VOICE

## Brain
- Primary: Groq `openai/gpt-oss-120b`
- Stronger conversational Kaguya prompt
- Groq reasoning effort: `medium`
- Anti-canned-response check: a highly repetitive/cliche Groq answer is regenerated once
- Fallback: Gemini

## Screen / Voice split
- Screen chat: Korean (`replyKo`)
- Spoken line: natural Japanese with the same meaning (`voiceJa`)

## Voice
- Primary: Azure Speech Japanese Neural TTS
- Default: `ja-JP-NanamiNeural`
- Test/select: Nanami / Aoi / Mayu / Shiori
- Baseline tuning: slightly faster and slightly higher pitch (normal: rate +7%, pitch +4%)
- Nanami uses Azure `chat` style when available
- Fallback: Gemini TTS (Japanese) → browser Japanese TTS

## Vercel environment variables
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION` (example: `koreacentral`)
- optional `AZURE_SPEECH_VOICE` (must be one of the supported Japanese voices above)

Never put API keys in `index.html` or client-side JavaScript
