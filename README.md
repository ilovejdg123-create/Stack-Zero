# STACK ZERO v36.1 — Gemini Coach Fix

## Environment variable
- `GEMINI_API_KEY` = Google AI Studio API key
- `GEMINI_MODEL` = optional, defaults to `gemini-3.5-flash-lite`

## Test
- `GET /api/coach?probe=1` performs a real Gemini request
- The app calls `POST /api/coach` on refresh and when study/exercise/sleep changes
