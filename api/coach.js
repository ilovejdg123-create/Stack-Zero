// STACK ZERO · Kaguya Coach · Gemini diagnostic build
// Vercel Environment Variable: GEMINI_API_KEY

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store, max-age=0');
  const origin = req.headers?.origin || '';
  const allowed = origin === 'https://ilovejdg123-create.github.io' || origin.endsWith('.vercel.app') ? origin : 'https://ilovejdg123-create.github.io';
  res.setHeader('Access-Control-Allow-Origin', allowed);
  res.setHeader('Vary', 'Origin');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(204).end();

  const key = process.env.GEMINI_API_KEY;
  const debug = req.query?.debug === '1';

  if (req.method === 'GET') {
    return res.status(200).json({
      ok: true,
      provider: 'gemini',
      model: 'gemini-2.5-flash-lite',
      keyConfigured: Boolean(key),
      debug,
      timestamp: new Date().toISOString()
    });
  }
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });
  if (!key) return res.status(500).json({ error: 'GEMINI_API_KEY is not configured', code: 'MISSING_KEY' });

  try {
    const b = req.body || {};
    const active = ['study', 'exercise', 'sleep'].includes(b.active) ? b.active : 'study';
    const today = b.today || {};
    const total = b.total || {};
    const recent = Array.isArray(b.recent) ? b.recent.slice(0, 12) : [];
    const studyToday = Math.max(0, Number(today.study || 0));
    const studyTotal = Math.max(0, Number(total.study || 0));
    const variation = String(b.variationSeed || `${Date.now()}-${Math.random()}`);

    const levels = [[0,'뉴비'],[100,'입문자'],[200,'노력가'],[300,'학습자'],[500,'깨달은 자'],[700,'실력자'],[900,'강자'],[1100,'상위권'],[1300,'전설'],[1500,'초월자']];
    let levelName = '뉴비', levelMin = 0;
    for (const [min, name] of levels) if (studyTotal >= min) { levelMin = min; levelName = name; }

    const relationship = studyTotal >= 1500 ? '최고 친밀도. 애정과 장난, 귀여운 서운함을 자연스럽게 표현한다'
      : studyTotal >= 1300 ? '매우 가까우며 특별한 사람처럼 대한다'
      : studyTotal >= 1100 ? '호감이 분명하고 다정함과 장난이 자연스럽다'
      : studyTotal >= 900 ? '친밀하고 편한 장난과 칭찬이 자연스럽다'
      : studyTotal >= 700 ? '관심과 칭찬이 눈에 띄게 많아진다'
      : studyTotal >= 500 ? '은근히 챙기며 관심을 표현한다'
      : studyTotal >= 300 ? '조금 편해지고 칭찬이 자연스럽다'
      : studyTotal >= 100 ? '예의를 지키면서도 관심을 보인다'
      : '아직 거리가 있고 도도하지만 악의적이지 않다';

    const dailyTone = studyToday <= 0 ? '오늘 아직 공부를 시작하지 않음: 걱정, 서운함, 살짝 귀여운 잔소리'
      : studyToday <= 2 ? '아주 조금 시작함: 시작한 행동을 알아보고 부드럽게 더 하라고 권유'
      : studyToday <= 6 ? '좋은 흐름: 구체적으로 인정하고 칭찬'
      : studyToday === 7 ? '첫 번째 감정 피크: 평소보다 확실히 크게 기뻐한다'
      : studyToday <= 10 ? '7 이후에도 감정이 계속 상승한다'
      : studyToday === 11 ? '두 번째이자 더 큰 감정 피크: 매우 기뻐하고 애정 어린 반응'
      : '11 이후에도 12~14에서 조금씩 더 행복하고 들뜬 반응';

    const activeLabel = { study: '공부', exercise: '운동', sleep: '잠' }[active];

    const prompt = `
너는 STACK ZERO의 카구야 스타일 AI 코치다. 원작 대사를 복사하지 말고 성격적 특징만 참고한다.
사용자: 정동근
누적 공부 STACK: ${studyTotal}
현재 단계: ${levelName} (${levelMin}+)
현재 관계: ${relationship}
오늘 공부 STACK: ${studyToday}
오늘 운동 STACK: ${Math.max(0, Number(today.exercise || 0))}
오늘 잠 STACK: ${Math.max(0, Number(today.sleep || 0))}
현재 탭: ${activeLabel}
오늘 반응 방향: ${dailyTone}
변주값: ${variation}
최근 대화: ${JSON.stringify(recent)}

규칙:
- 매번 완전히 새로운 짧은 한국어 대사를 창작한다
- 최근 대화의 문장, 도입부, 감탄사, 비유, 호칭 패턴을 재사용하지 않는다
- 경우의 수를 제한하지 않는다
- 오늘 상태 변화가 대사의 핵심에 반영되어야 한다
- 운동/잠을 공부 STACK이라고 부르지 않는다
- 7 STACK은 첫 번째 감정 피크, 11 STACK은 더 큰 두 번째 피크이며 12~14도 계속 상승한다
- 오늘 공부가 0이면 친밀도가 높아도 귀엽게 서운해할 수 있다
- 1~3개의 짧은 대사만 만든다
- JSON 외의 글은 절대 출력하지 않는다

반드시 다음 형태의 JSON만 출력:
{"lines":["대사"],"pose":"cheer|happy|shock|tired|sleep|serious|tease|focus|proud","mood":"none|angry|cry|pout|question|tease"}
`;

    const model = 'gemini-2.5-flash-lite';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 25000);
    let response;
    let rawText = '';
    try {
      response = await fetch(url, {
        method: 'POST',
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': key
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            temperature: 1.35,
            topP: 0.97,
            maxOutputTokens: 260,
            responseMimeType: 'application/json'
          }
        })
      });
      rawText = await response.text();
    } catch (e) {
      const msg = e?.name === 'AbortError' ? 'Gemini request timed out after 25s' : String(e?.message || e);
      return res.status(502).json({ error: msg, code: e?.name || 'FETCH_ERROR', provider: 'gemini', debug: true });
    } finally {
      clearTimeout(timeout);
    }

    let data = null;
    try { data = JSON.parse(rawText); } catch {}

    if (!response.ok) {
      return res.status(502).json({
        error: data?.error?.message || rawText || 'Gemini returned an error',
        code: data?.error?.status || `HTTP_${response.status}`,
        geminiHttpStatus: response.status,
        provider: 'gemini',
        debug: true
      });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || '').join('').trim() || '';
    let out;
    try { out = JSON.parse(raw); }
    catch { out = { lines: [raw || '오늘 기록을 확인했어요'], pose: 'focus', mood: 'none' }; }

    const lines = Array.isArray(out?.lines) ? out.lines.map(x => String(x).trim()).filter(Boolean).slice(0,3) : [];
    const safeLines = lines.length ? lines.map(x => x.slice(0,120)) : ['오늘 기록을 확인했어요'];
    const poses = ['cheer','happy','shock','tired','sleep','serious','tease','focus','proud'];
    const moods = ['none','angry','cry','pout','question','tease'];
    return res.status(200).json({
      lines: safeLines,
      message: safeLines.join(' '),
      pose: poses.includes(out?.pose) ? out.pose : 'focus',
      mood: moods.includes(out?.mood) ? out.mood : 'none',
      provider: 'gemini',
      model,
      debug: false
    });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err), code: 'SERVER_ERROR', debug: true });
  }
}
