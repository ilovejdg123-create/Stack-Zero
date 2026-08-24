# STACK ZERO v40.7 FINAL TEST — AFFECTION LADDER + MAYU MICRO TUNE

## Brain
- Primary: Groq `openai/gpt-oss-120b`
- Fallback: Gemini
- Korean screen reply (`replyKo`) / Japanese spoken reply (`voiceJa`)
- Anti-canned-response regeneration remains enabled

## 1 → 14 daily study affinity
- Today's study STACK now controls Kaguya's conversational distance in both chat and event reactions
- 1: cold/formal → 4: softening → 7: familiar → 10: affection showing → 14: extreme affection
- Each of the 14 stages has its own language/relationship guidance
- Server rejects obvious tone mismatches (too romantic at low stack / too businesslike at high stack) and regenerates once
- Local fallback reactions also use exact 1–14 stage pools

## Voice
- Default: Azure `ja-JP-MayuNeural`
- V40.7 Mayu micro-tune: +1 percentage point rate and +1 percentage point pitch versus V40.6
- Normal Mayu: rate +8%, pitch +7%
- Affinity stage is also passed into voice-style guidance
- Fallback: Gemini TTS → browser Japanese TTS

## Diagnostics
- `CHAT ↻` context follow-up test
- `MAYU ♪` direct Azure test
- `CHAT → VOICE` full brain → Korean/Japanese split → TTS test

## Vercel environment variables
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

Never put API keys in client-side files
