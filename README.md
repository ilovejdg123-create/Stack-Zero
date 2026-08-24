# STACK ZERO v40.8 FINAL

Release build after V40.7 final testing

## Final cleanup
- Study control is now + only; study minus button removed
- Temporary STUDY -50 / +50 test controls removed
- Fresh release storage keys start progress, history, rewards, quest celebrations, level celebrations, and Kaguya chat/memory from zero
- All normal quest and level celebration messages remain enabled and will trigger again as milestones are reached
- Voice and link diagnostics moved to one small collapsed TEST drawer at the very bottom

## Kaguya
- Groq primary brain with Gemini fallback
- Korean chat text + equivalent Japanese voice text
- Azure Japanese TTS primary, Gemini TTS fallback, browser Japanese TTS final fallback
- Default Azure voice: ja-JP-MayuNeural
- V40.7 Mayu micro-tune retained: normal Mayu rate +8%, pitch +7%
- Daily study 1→14 affection ladder retained

## Vercel environment variables
- GROQ_API_KEY
- GEMINI_API_KEY
- AZURE_SPEECH_KEY
- AZURE_SPEECH_REGION
