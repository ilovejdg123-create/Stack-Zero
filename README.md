# STACK ZERO 39.5 FINAL · FREE TTS FALLBACK

Production build based on 39.4.

## Voice pipeline
1. Gemini generates Kaguya dialogue, Japanese speech text, mood, memory and relationship tone.
2. ElevenLabs TTS is attempted first using `ELEVENLABS_API_KEY` + `ELEVENLABS_VOICE_ID`.
3. If ElevenLabs is rate-limited, out of free credits, unavailable, misconfigured, times out, or audio playback fails, STACK ZERO automatically falls back to the browser/OS Japanese Speech Synthesis voice.
4. Browser fallback needs no additional API key or paid account. It is intentionally used as the zero-cost safety net; voice quality depends on the device/browser.
5. ElevenLabs cooldown/backoff remains enabled so the app does not repeatedly hammer a limited API. While cooldown is active, speech goes directly to browser TTS.

## Existing production behavior preserved
- Existing STACK progress and Kaguya long-term memory are preserved.
- Gemini remains the dialogue/mood/memory engine.
- Current 9 STACK images + 10 mood images are preserved.
- 7/10 milestone sounds, 10-hour heart/enlarged Kaguya state, level themes, quests/rewards and relationship logic are unchanged.
- Cumulative study level controls permanent baseline closeness; today's study hours control daily warmth/excitement.
- LIVE connection indicators remain beside Kaguya status.

## Netlify environment variables
Required for high-quality ElevenLabs TTS:
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Optional:
- `ELEVENLABS_MODEL_ID` (default `eleven_flash_v2_5`)
- `ELEVENLABS_OUTPUT_FORMAT` (default `mp3_44100_128`)

If ElevenLabs is unavailable, browser TTS still works without any new environment variable.
