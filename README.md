# STACK ZERO v36.3 — Kaguya Stack Face System

## Base
- v36.2의 일정 / Gemini context / QUEST / 보상 / localStorage / persistent theme 구조 보존

## Kaguya image system
- 기존 도형/SVG 캐릭터 렌더 제거
- 공부 **오늘 STACK**에 따라 기본 카구야 이미지 자동 변경
  - 0 → `stack_0_1.jpg`
  - 1 → `stack_1_2.jpg`
  - 2 → `stack_2_3.jpg`
  - 3 → `stack_3_4.jpg`
  - 4 → `stack_4_5.jpg`
  - 5~6 → `stack_5_7.jpg`
  - 7~8 → `stack_7_9.jpg`
  - 9~10 → `stack_9_11.jpg`
  - 11~14 → `stack_11_14.png`
- 11~14 STACK에서는 카구야 이미지 확대 + 하트 파티클 상시 활성화
- mood 이미지는 기본 STACK 이미지를 대체하지 않고 상황 반응 때만 일시적으로 표시
  - angry / sulk / question / cry
- Gemini가 향후 `mood` 값을 반환하면 직접 사용 가능하며, 현재는 대사 내용으로도 제한적으로 mood를 감지

## Gemini
- `GEMINI_API_KEY`는 프론트엔드에 넣지 말고 Vercel Environment Variables에 설정
- 기존 `/api/coach` 구조 유지

## Important
- 카구야 기본 얼굴 단계는 누적 TOTAL이 아니라 **오늘 공부 STACK(0~14)** 기준
- 등급/테마 시스템은 기존 누적 STUDY TOTAL 기준을 그대로 유지
