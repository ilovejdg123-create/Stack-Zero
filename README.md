# STACK ZERO V37.0

카구야 상호작용을 중심으로 정리한 정식 초기화 버전입니다

## V37.0 핵심
- **공식 신규 저장 키 `STACK_ZERO_V37_0` 사용**: 기존 테스트 기록을 불러오지 않고 공부/운동/잠/보상/축하 기록 모두 0에서 시작
- 일정/달력 시스템 완전 삭제
- 개발용 `+50 / -50` 완전 삭제
- 운동/잠은 한 번 체크하면 그날은 되돌릴 수 없음
- 기록지는 읽기 전용이며 과거 기록 수정/삭제 불가
- 공부 STACK 카구야 이미지 진행, 후반 파티클/하트, 등급 테마 유지

## KAGUYA LIVE CHAT
카구야 창 바로 아래의 얇은 입력창에서 일상 대화를 바로 할 수 있습니다

- 최근 대화는 **IndexedDB에 계속 저장**합니다. 임의로 50개에서 삭제하지 않습니다
- Gemini에는 매번 전체 로그를 보내지 않고 최근 직접 대화 중심의 문맥만 골라 전달합니다
- 스택 이벤트 대사가 채팅 문맥을 덮어쓰지 않도록 직접 대화 비중을 우선합니다
- 고정 호칭표 없음
- 이름/애칭/카오모지/이모지 강제 없음
- 최근 대화 표현을 참고해 같은 문장 구조와 말버릇 반복을 줄입니다

## LONG-TERM MEMORY
중요한 내용은 대화 로그와 별도의 IndexedDB `memories` 저장소에 보관합니다

자동 저장 후보:
- 중요한 시험/사건
- 장기 목표
- 계획
- 선호/비선호
- 중요한 사람
- 성취
- 반복되는 중요한 고민

`기억해`, `기억해줘`, `잊지 마`처럼 직접 말하면 중요도 높은 기억으로 처리합니다
관련 대화가 들어오면 저장된 MEMORY에서 관련도가 높은 내용을 골라 Gemini에 전달합니다

## 일본어 음성
카구야의 화면 답변은 한국어로 표시하고, Gemini는 같은 의미의 자연스러운 일본어 음성용 문장도 생성합니다

1. Gemini 대화 응답 생성
2. `voiceJa` 생성
3. Gemini TTS로 일본어 음성 합성
4. TTS 실패 시 기기의 일본어 SpeechSynthesis로 자동 fallback

기본 TTS:
- Model: `gemini-3.1-flash-tts-preview`
- Voice: `Leda`
- 특정 성우 음성을 복제하지 않는 독립적인 일본 여성 캐릭터 톤

화면의 🔊 버튼으로 음성을 켜고 끌 수 있습니다

## Gemini 모델
기본 대화 모델:
- Primary: `gemini-3.7-flash`
- Fallback: `gemini-2.5-flash`

환경변수로 변경 가능:
- `GEMINI_API_KEY` 필수
- `GEMINI_MODEL` 선택
- `GEMINI_FAST_MODEL` 선택
- `GEMINI_TTS_MODEL` 선택
- `GEMINI_TTS_VOICE` 선택

## Netlify
필요 파일을 통째로 GitHub에 올린 뒤 Netlify와 저장소를 연결합니다

필수 환경변수:
`GEMINI_API_KEY`

`netlify.toml`이 `/api/coach` 요청을 Netlify Function으로 연결합니다

## Vercel
`api/coach.js`도 동일한 V37.0 코어를 사용하므로 Vercel에서도 같은 구조로 작동합니다
