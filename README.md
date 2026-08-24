# STACK ZERO V1.0 · PIN SYNC

완성본입니다. V40.8의 STACK / QUEST / Groq→Gemini / Mayu TTS 기능을 유지하면서 PIN 기반 기기간 동기화를 추가했습니다.

## Vercel 환경변수
기존 값은 그대로 유지합니다.
- `GROQ_API_KEY`
- `GEMINI_API_KEY`
- `AZURE_SPEECH_KEY`
- `AZURE_SPEECH_REGION`

PIN 동기화용으로 아래 2개를 추가합니다.
- `SUPABASE_URL`
- `SUPABASE_SECRET_KEY` (권장 · `sb_secret_...`)
- 또는 기존 프로젝트라면 `SUPABASE_SERVICE_ROLE_KEY`도 호환

선택 사항:
- `STACK_ZERO_SESSION_SECRET` : 긴 랜덤 문자열. 없으면 service role key를 세션 서명에도 사용합니다.

## Supabase 최초 1회 설정
1. Supabase 프로젝트를 만듭니다
2. SQL Editor에서 `SUPABASE_SETUP.sql` 전체를 실행합니다
3. Project Settings/API에서 Project URL과 **Secret key (`sb_secret_...`)**를 확인합니다
4. Vercel 환경변수에 `SUPABASE_URL`, `SUPABASE_SECRET_KEY`로 저장합니다
5. Redeploy 합니다

`SUPABASE_SECRET_KEY` / `SUPABASE_SERVICE_ROLE_KEY`는 절대 브라우저 코드나 GitHub 공개 코드에 직접 넣지 마세요. 이 버전은 Vercel 서버 함수에서만 읽습니다.

## PIN 동작
- 첫 화면 `새로 시작하기` → 숫자 6~12자리 PIN 설정
- 다른 기기 → `로그인` → 같은 PIN 입력
- STACK, 오늘 기록, QUEST, 보상, 기록지, 카구야 최근 대화와 MEMORY가 같은 PIN 계정으로 동기화됩니다
- 로그인한 기기는 세션을 기억해 다음 접속부터 자동 로그인합니다
- 포커스 복귀 및 약 10초 주기로 다른 기기의 변경을 확인합니다
- 동시 수정 충돌이 감지되면 STACK/기록/카구야 메모리를 병합한 뒤 다시 저장합니다

PIN 자체는 서버 DB에 원문으로 저장하지 않고 서버 비밀값과 함께 SHA-256 해시로 식별합니다. PIN이 유일한 로그인 수단이므로 잊어버리면 복구할 수 없습니다.

## V1 조정
- 기본 일본어 음성: Azure `ja-JP-MayuNeural`
- Mayu 튜닝 유지: 일반 기준 rate 약 +8%, pitch 약 +7%
- UI/버튼 효과음 마스터 볼륨: V40.8 대비 상향
- TEST 서랍 안에 SYNC 상태 / 지금 동기화 / 로그아웃 추가
