# STACK ZERO V37.1 · LIVE SYNC PATCH

V37.0 DEV50을 기준으로 **대화 안정성 + 일본어 감정 음성 + 채팅/음성 동시 시작**만 손본 패치입니다.
기존 STACK/테마/카구야 이미지/퀘스트/메모리 구조는 유지합니다.

## 이번 패치 핵심
- Gemini 3.7 호출에서 불필요한 구형 sampling 옵션(`temperature`, `topP`) 제거
- `gemini-3.7-flash`는 `thinkingLevel: low`로 설정해 채팅 지연 감소
- 일시적인 408/429/5xx/timeout에 대해 짧은 재시도 + 빠른 fallback 적용
- 기본 fallback을 `gemini-3.5-flash-lite`로 변경
- Netlify/Vercel 서버 로그에 실패 상태코드와 에러 종류 기록 (API key는 기록하지 않음)
- TTS preview의 간헐적 500/429/timeout에도 자동 재시도

## KAGUYA VOICE
기본 TTS:
- Model: `gemini-3.1-flash-tts-preview`
- Voice: `Leda`

보이스 방향:
- 기존보다 **아주 살짝 밝고 높은 음역**
- 어린아이/삑삑거리는 톤은 금지
- 일본어 pitch accent와 문장 끝 억양을 더 분명하게
- 감정에 따라 속도, 쉼, 숨, 말끝을 자연스럽게 변화
- `mood` 외에 Gemini가 매 답변별 `voiceStyle`을 같이 만들어 세부 연기를 지시

## 채팅 + 음성 SYNC
Netlify에 `/api/tts-stream` 스트리밍 함수가 추가되었습니다.

흐름:
1. 카구야 답변 JSON 생성 (`replyKo`, `voiceJa`, `mood`, `voiceStyle`)
2. `voiceJa`를 Gemini 3.1 Flash TTS 스트리밍으로 즉시 요청
3. **첫 오디오 청크가 도착하는 순간 한국어 채팅을 화면에 표시하고 음성 재생을 시작**
4. 스트리밍이 실패하면 기존 비스트리밍 Gemini TTS로 fallback
5. 그것도 실패하면 브라우저 일본어 SpeechSynthesis로 fallback

즉 기존처럼 `채팅 표시 → 몇 초 뒤 음성`이 아니라, 정상 스트리밍 시 둘이 거의 같은 순간 시작하도록 설계했습니다.

## LONG-TERM MEMORY
V37.0과 동일합니다.
- 전체 대화는 IndexedDB에 계속 저장
- 중요한 목표/시험/계획/취향/성취 등은 별도 MEMORY
- `기억해`, `기억해줘`, `잊지 마`는 중요 기억으로 처리

## 환경변수
필수:
- `GEMINI_API_KEY`

선택:
- `GEMINI_MODEL` (기본 `gemini-3.7-flash`)
- `GEMINI_FAST_MODEL` (기본 `gemini-3.5-flash-lite`)
- `GEMINI_TTS_MODEL` (기본 `gemini-3.1-flash-tts-preview`)
- `GEMINI_TTS_VOICE` (기본 `Leda`)

## DEV50
개발 편의를 위해 STUDY TOTAL `-50 / +50` 버튼은 그대로 남겨두었습니다.
TODAY 공부 0~14에는 영향을 주지 않습니다. 최종 공개판에서 제거하면 됩니다.


V37.2 RC
- latest 9 stack images / 10 mood images
- 10 stack heart threshold
- rc-only study ±50 buttons
- synthesized UI/study/level-up sounds


CLEAN BUILD
- removed all legacy kaguya assets
- only user-provided 19 current images remain

V37.3 RC pre-final fixes:
- exact latest uploaded Kaguya 19 assets
- Gemini-only synchronized TTS, no browser voice fallback
- calmer Sulafat voice direction
- strongly differentiated rank/UI SFX
- exact 7 fanfare and 10 heartbeat/heart-bloom SFX


V37.5 RC
- fixed shared WebAudio unlock for Gemini voice
- removed HTMLAudio async autoplay failure path
- deeper natural study-hour dialogue + anti-robotic rewrite

V37.6 RC
- TTS root-cause fix: GenerateContent TTS is primary, not a late fallback behind long Interactions retries.
- Frontend no longer burns ~5s on the stream path before requesting the reliable TTS path.
- TTS request timeout enlarged so server retry can actually finish.
- Shared WebAudio playback with 1.22 gain and 0.96 playback rate for a slightly calmer/lower presentation.
- Visible LIVE · TTS 오류 status if server-side TTS still fails, so remaining deployment/config errors are diagnosable.


V37.7 RC
- TTS primary switched to gemini-2.5-flash-preview-tts for reliability
- gemini-3.1-flash-tts-preview automatic fallback
- official x-goog-api-key GenerateContent path
- compact TTS prompt
- RC status now exposes exact TTS HTTP code
