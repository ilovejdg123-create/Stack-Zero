# STACK ZERO V35 — Gemini 연결 수정본

- 프론트엔드의 카구야 요청은 `/api/coach` 하나로 통일
- `/api/coach`는 Gemini REST API만 호출
- `GEMINI_API_KEY`는 Vercel Environment Variables에서만 사용
- GET `/api/coach`로 Gemini endpoint health check 가능
- 기존 `coach-v31.js` 제거

배포 후 `https://<vercel-domain>/api/coach`에 접속하면 `provider: "gemini"`와 `keyConfigured`를 확인할 수 있습니다
