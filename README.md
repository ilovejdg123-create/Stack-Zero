# STACK ZERO V15 — Gemini AI Coach

OpenAI API 대신 Google Gemini API 무료 티어를 사용하는 버전입니다.

## Vercel 환경변수

Vercel → Project Settings → Environment Variables에서:

- Key: `GEMINI_API_KEY`
- Value: Google AI Studio에서 발급한 Gemini API 키
- Environment: Production and Preview

API 키는 절대로 `index.html`에 넣지 않습니다.

## 현재 모델

`gemini-2.5-flash-lite`

짧은 코치 문구 생성용으로 사용합니다.
