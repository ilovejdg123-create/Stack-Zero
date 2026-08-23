# STACK ZERO 39.0 FINAL

Production build.

## Final behavior
- Fresh production namespace: STUDY / EXERCISE / SLEEP begin at 0 on first launch of 39.0 FINAL.
- Previous test level-up / quest celebration flags are not inherited, so milestones celebrate again when earned.
- Previous Kaguya test chat/memory DB is not inherited.
- Study is add-only: +1 hour, daily maximum 14. No -1 and no ±50 developer buttons.
- Latest user-provided Kaguya assets only: 9 STACK images + 10 mood images.
- STACK 10 is the love/high-impact threshold: enlarged Kaguya area + hearts + special sound.
- STACK 7 and 10 retain milestone sounds; rank-specific sounds and level-up sounds remain enabled.
- Exercise and sleep lock after confirmation for the day.
- History remains view-only; schedule/calendar is not included.
- Gemini chat + ElevenLabs TTS connection state is shown compactly beside LIVE.
- TTS uses the known-working Gemini 2.5 Flash TTS path with Sulafat and subtle client-side pitch lift.
- Chat mood images remain visible longer before reverting to the current STACK image.
- Relationship model has two independent layers:
  1. cumulative STUDY rank = long-term baseline closeness;
  2. today's study hours = temporary daily warmth / excitement.
- High daily study changes both text tone and TTS acting, while cumulative rank permanently softens Kaguya's baseline relationship.

## 39.1 FINAL — TTS quota hardening
- Gemini 3.1 Flash TTS Preview first, Gemini 2.5 Flash TTS Preview one-time fallback.
- No immediate same-model retry on 429/5xx.
- Double-429 starts a persistent client cooldown; text chat continues and TTS is retried only after cooldown expires.
- Existing 39.0 app progress and Kaguya memory are preserved.

## 39.2 FINAL — progressive TTS 429 backoff
- 429 waits increase 1m → 2m → 5m → 10m → 20m → 30m instead of repeatedly hammering the TTS API.
- Successful TTS resets the sequence back to 1m.
- Real Gemini Retry-After hints are respected when longer.
- Existing 39.0 production progress and Kaguya memory remain intact.

## 39.3 UI polish
- Top rank card: STUDY STACK label moved out of the number column into the open center-right area.
- Larger independent STUDY STACK label; total number stays aligned at the far right.
- Mobile grid spacing added to prevent rank/label/number overlap.
- Persistent data keys unchanged from 39.2.


## 39.4 FINAL · ElevenLabs TTS
- Gemini remains responsible for dialogue, memory, mood, and relationship logic.
- All speech synthesis moved to ElevenLabs. No Gemini TTS request remains in the active TTS path.
- Required Netlify env vars: `ELEVENLABS_API_KEY`, `ELEVENLABS_VOICE_ID`.
- Optional: `ELEVENLABS_MODEL_ID` (default `eleven_flash_v2_5`), `ELEVENLABS_OUTPUT_FORMAT` (default `mp3_44100_128`).
- Existing STACK data and Kaguya memory keys are preserved.
