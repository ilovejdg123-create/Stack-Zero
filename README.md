# STACK ZERO v40 — Kaguya Context Final

## Included
- Gemini-powered Kaguya coach via `/api/coach`
- Real Gemini probe: `GET /api/coach?probe=1`
- Korean-time (KST) clock and date handling
- Daily schedule: time + task + done/delete
- Schedule context sent to Gemini so Kaguya can react to upcoming/completed plans
- Study / exercise / sleep event context
- Recent-message repetition suppression
- Kaguya persona and user context for 정동근
- Test mode `-50 / +50` cumulative study STACK controls
- Reward receive/use flow
- Dynamic level/mood avatar system

## Vercel environment variables
- `GEMINI_API_KEY` required
- `GEMINI_MODEL` optional; defaults to `gemini-3.5-flash-lite`

## Deploy
Upload the project contents to the connected GitHub repository and let Vercel create a new production deployment
