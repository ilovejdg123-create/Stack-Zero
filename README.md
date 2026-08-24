# STACK ZERO v40.1 TEST · VERCEL

40.0 Vercel판을 그대로 베이스로 유지한 테스트 빌드입니다. 기존 localStorage/IndexedDB 키를 유지하므로 기존 기록과 카구야 기억을 초기화하지 않습니다.

## 40.1 변경점
- TEST 컨트롤: TODAY 공부 -1 / +1, STUDY TOTAL -50 / +50 복원
- 공부 +1 효과음의 체감 볼륨과 저역 타격감을 크게 강화
- 10개 등급별 STACK 효과음을 3~5 레이어 Web Audio 사운드로 재설계
- 일반 버튼에도 현재 테마의 아주 약한 시그니처를 얹어 전체 사운드 톤을 통일
- 7시간 / 10시간 / 레벨업 효과음 강화
- TTS 3단 fallback: ElevenLabs selected voice → Gemini 3.1 Flash TTS(Sulafat, 2.5 fallback) → Browser Japanese TTS
- 현재 실제 음성 엔진을 LIVE 옆에 ELEVEN / GEMINI TTS / FREE TTS로 표시
- ElevenLabs quota/config/rate-limit 실패 시 즉시 Gemini로 넘어가며 provider별 cooldown 적용
- Gemini 답변 텍스트는 TTS가 늦더라도 약 650ms 이내 화면에 먼저 표시되어 체감 지연 방지
- 카구야 대화 프롬프트를 '캐릭터 대사 생성기'에서 '실제 사람의 대화 우선' 구조로 재설계
- 친밀도/오늘 공부 텐션은 대화 소재를 납치하지 않고 말투의 거리와 온도에만 반영
- 최근 12개 카구야 답변과 구조적 유사도를 검사하고, 반복이 심할 때만 1회 자동 재작성
- 사용자가 말하지 않은 책상/표정/자세 등을 본 것처럼 지어내는 반응 금지

## Vercel Environment Variables
필수:
- GEMINI_API_KEY

ElevenLabs 1순위 음성을 쓰려면:
- ELEVENLABS_API_KEY
- ELEVENLABS_VOICE_ID

선택(기본값이 이미 설정됨):
- GEMINI_TTS_MODEL=gemini-3.1-flash-tts-preview
- GEMINI_TTS_FALLBACK_MODEL=gemini-2.5-flash-preview-tts
- GEMINI_TTS_VOICE=Sulafat
- ELEVENLABS_MODEL_ID=eleven_flash_v2_5

## TTS 순서
1. ElevenLabs selected Voice ID
2. Gemini TTS (Gemini API key 재사용)
3. 기기 브라우저 일본어 SpeechSynthesis

브라우저 TTS는 최후 fallback이며 별도 키가 필요 없습니다.
