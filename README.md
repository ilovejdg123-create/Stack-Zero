# STACK ZERO V36 — Gemini Diagnostic

V35 전체 프로젝트 구조를 유지한 상태에서 Gemini 진단용 API만 교체한 테스트 빌드입니다

## 포함
- index.html
- package.json
- api/coach.js
- assets/kaguya/mood/*
- assets/kaguya/stack/*

## Gemini
- Vercel Environment Variable: `GEMINI_API_KEY`
- 프론트 요청: `/api/coach`
- 모델: `gemini-2.5-flash-lite`
- Gemini 오류 발생 시 HTTP 상태와 오류 메시지를 API 응답에 포함
- API 키는 응답에 노출하지 않음

## 배포
GitHub 저장소 루트에 이 폴더의 **내용 전체**를 기존 파일에 덮어씌워 커밋하세요
Vercel 배포가 Ready가 된 뒤 `/api/coach` GET으로 상태를 확인할 수 있습니다
