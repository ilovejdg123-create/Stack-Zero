# STACK ZERO — Gemini real probe

This build keeps the full project structure and adds one important diagnostic:

`GET /api/coach?probe=1` now performs a REAL Gemini `generateContent` request using `GEMINI_API_KEY`.

It does not merely report that the key exists.

## Deploy

Upload/overwrite the contents of this ZIP into the root of the existing Stack-Zero GitHub repository. Keep the `api/` directory at the repository root.

Required environment variable in Vercel:

`GEMINI_API_KEY`

## Test

After Vercel says Ready, open:

`https://YOUR-DOMAIN/api/coach?probe=1`

Success looks like:

`{"ok":true,"provider":"gemini",...,"reply":"GEMINI_OK"}`

Failure still returns HTTP 200 for the probe so the browser can display the actual Gemini status and error message, e.g. `geminiHttpStatus`, `code`, and `error`.
