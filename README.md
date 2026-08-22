# STACK ZERO V14 — AI Coach

이 버전은 GitHub Pages 단독 배포가 아니라 Vercel 같은 서버리스 호스팅이 필요합니다.

1. 이 폴더 전체를 GitHub 저장소에 올립니다
2. Vercel에서 해당 저장소를 Import 합니다
3. Vercel Project Settings → Environment Variables
4. `OPENAI_API_KEY` 이름으로 OpenAI API 키를 등록합니다
5. 재배포합니다

API 키는 절대로 `index.html`에 넣지 않습니다.

V14는 `/api/coach`를 통해 OpenAI Responses API를 호출하고, 실패하면 로컬 코치 문구로 fallback 합니다.
