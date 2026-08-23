# STACK ZERO v40.0 · VERCEL

39.8 AUDITED FINAL을 그대로 유지하면서 배포 플랫폼만 Netlify → Vercel로 옮긴 빌드입니다.

## Vercel 환경변수
- `GEMINI_API_KEY`
- `ELEVENLABS_API_KEY`
- `ELEVENLABS_VOICE_ID`

Vercel Project Settings → Environment Variables에서 위 3개를 추가하세요. Preview에서 먼저 시험할 경우 Preview에도 적용하세요. API 키 값은 코드나 GitHub에 넣지 마세요.

## API
- `/api/coach` : Gemini 대화 + ElevenLabs TTS(JSON base64)
- `/api/coach?probe=1` : 함수/환경변수 배치 상태 확인(실제 Gemini 호출 없음)
- `/api/tts-stream` : ElevenLabs 스트리밍 엔드포인트 유지

## TTS 동작
ElevenLabs를 먼저 사용하고, 실패/한도/429/설정 문제 시 프론트에서 브라우저 일본어 TTS로 자동 fallback합니다. 결제 전환 코드는 없습니다.

## 유지 사항
39.8의 UI, 버튼/등급별 효과음, 7/10시간 특수음, 9 STACK 이미지 + 10 mood 이미지, 퀘스트/보상, 운동/수면 잠금, 읽기 전용 기록, Gemini 기억/호감도/오늘 텐션 로직을 그대로 유지합니다.

오른쪽 아래에는 `STACK ZERO v40.0 · VERCEL`이 표시됩니다.
