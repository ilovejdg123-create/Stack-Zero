# STACK ZERO v40.6 TEST — GROQ + JAPANESE AZURE VOICE

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
- Default: `ja-JP-MayuNeural`
- Test/select: Nanami / Aoi / Mayu / Shiori
- Baseline tuning: slightly faster and higher; Mayu receives an extra +2 percentage-point pitch lift (normal Mayu: rate +7%, pitch +6%)
- Mayu is the default voice; Nanami remains selectable and uses Azure `chat` style when available
- Fallback: Gemini TTS (Japanese) → browser Japanese TTS

## Vercel environment variables
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION` (example: `koreacentral`)
- optional `AZURE_SPEECH_VOICE` (must be one of the supported Japanese voices above)

Never put API keys in `index.html` or client-side JavaScript


## V40.6 final tune
- Study +1 event prompt no longer reads out `오늘 N시간` on every click; numeric mentions are reserved for meaningful milestones
- Added varied reaction modes and server-side rejection/regeneration for formulaic study-stack replies
- Default Azure Japanese voice is `ja-JP-MayuNeural`; Mayu receives a subtle +2 percentage-point pitch lift on top of mood prosody
- Added non-destructive CHAT follow-up, MAYU voice, and CHAT→VOICE diagnostic buttons
- Screen reply remains Korean (`replyKo`), spoken reply remains Japanese (`voiceJa`)
