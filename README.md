# STACK ZERO V42

V36.1 Gemini 연결 구조를 베이스로, V41의 카구야 이미지 자산과 일정/프리미엄 UI를 통합한 버전입니다

## 포함 기능
- Gemini 3.5 Flash-Lite 기반 카구야 AI 코치
- TOTAL STACK 기준 전체 등급
- TODAY STACK 기준 당일 감정 강도
- TOTAL 등급 + TODAY STACK을 함께 Gemini에 전달
- 한국시간(KST) 실시간 컨텍스트
- 정동근 / 편입 도전 / 주말 알바 컨텍스트
- 오늘만 / 매주 일정 저장
- 일정 완료/삭제 상태 저장
- localStorage 기반 STACK / QUEST / 일정 / 보상 기록 유지
- 카구야 입력중 표시: `카구야님이 입력중 •••`
- 카구야 표정 이미지 9종
- 등급별 배경/광원/파티클 효과

## Vercel 환경변수
`GEMINI_API_KEY` 필수

선택: `GEMINI_MODEL`
기본값: `gemini-3.5-flash-lite`

## 배포 후 테스트
`/api/coach?probe=1`

정상이라면 JSON에 `ok: true`가 표시됩니다
