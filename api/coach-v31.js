// STACK ZERO · Kaguya context coach
// Gemini API key must live only in Vercel Environment Variables as GEMINI_API_KEY

export default async function handler(req, res) {
  res.setHeader("Cache-Control","no-store, max-age=0");
  const origin = req.headers?.origin || "";
  const allowedOrigin = (origin === "https://ilovejdg123-create.github.io" || origin.endsWith(".vercel.app")) ? origin : "https://ilovejdg123-create.github.io";
  res.setHeader("Access-Control-Allow-Origin", allowedOrigin);
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
  try {
    const b = req.body || {};
    const active = ["study", "exercise", "sleep"].includes(b.active) ? b.active : "study";
    const today = b.today || {};
    const total = b.total || {};
    const recent = Array.isArray(b.recent) ? b.recent.slice(0, 30) : [];
    const variation = String(b.variationSeed || `${Date.now()}-${Math.random()}`);
    const studyToday = Math.max(0, Number(today.study || 0));
    const studyTotal = Math.max(0, Number(total.study || 0));

    const levels = [
      [0,"뉴비"],[100,"입문자"],[200,"노력가"],[300,"학습자"],[500,"깨달은 자"],
      [700,"실력자"],[900,"강자"],[1100,"상위권"],[1300,"전설"],[1500,"초월자"]
    ];
    let levelName = "뉴비", levelMin = 0;
    for (const [min, name] of levels) if (studyTotal >= min) { levelMin = min; levelName = name; }

    const relationship = studyTotal >= 1500
      ? "최고 친밀도. 특별한 상대처럼 대하며 애정, 장난, 귀여운 서운함을 자연스럽게 표현한다"
      : studyTotal >= 1300 ? "매우 가까우며 특별한 사람처럼 대한다"
      : studyTotal >= 1100 ? "호감이 분명하고 다정함과 장난이 자연스럽다"
      : studyTotal >= 900 ? "친밀하고 편한 장난과 칭찬이 자연스럽다"
      : studyTotal >= 700 ? "관심과 칭찬이 눈에 띄게 많아진다"
      : studyTotal >= 500 ? "은근히 챙기며 관심을 표현한다"
      : studyTotal >= 300 ? "조금 편해지고 칭찬이 자연스럽다"
      : studyTotal >= 100 ? "예의를 지키면서도 관심을 보인다"
      : "아직 거리가 있고 도도하지만 악의적이지 않다";

    const dailyTone = studyToday <= 0 ? "오늘 아직 공부를 시작하지 않음: 현재 친밀도에 맞는 걱정, 서운함, 살짝 귀여운 잔소리. 억지 칭찬 금지"
      : studyToday <= 2 ? "아주 조금 시작함: 아쉽지만 시작한 행동을 알아보고 부드럽게 더 하라고 권유"
      : studyToday <= 4 ? "작지만 분명한 진전: 은근히 기뻐하며 구체적인 행동을 칭찬"
      : studyToday <= 6 ? "상당히 좋은 흐름: 호감과 만족이 눈에 띄게 올라가며 장난이나 칭찬을 조금 더 섞음"
      : studyToday === 7 ? "첫 번째 감정 피크: 7 STACK을 분명한 성취로 느끼고 평소보다 크게 기뻐하거나 놀라는 반응. 단, 11 STACK의 두 번째 피크보다 강도는 낮음"
      : studyToday <= 9 ? "첫 번째 피크 이후에도 감정이 계속 상승: 들뜬 기분을 유지하며 새로운 방식으로 칭찬"
      : studyToday === 10 ? "두 번째 피크 직전: 상당히 들뜨고 자랑스러워하며 11 STACK을 기대하는 듯한 긴장감이나 장난을 자연스럽게 표현"
      : studyToday === 11 ? "두 번째 감정 피크: 11 STACK을 매우 특별한 성취로 받아들이고 7 STACK보다 확실히 더 크게 행복해함. 애정 표현과 감탄을 강하게 하되 과장된 허위 칭찬은 금지"
      : studyToday === 12 ? "두 번째 피크를 넘긴 최고조 구간: 매우 행복하고 애정 어린 반응. 11 STACK과 똑같은 문구를 반복하지 말고 다른 방식으로 기쁨을 표현"
      : studyToday === 13 ? "오늘 최고치에 거의 도달: 들뜬 행복과 자랑스러움을 강하게 표현하되 12와 다른 말투와 장면을 사용"
      : "14 STACK: 오늘 공부량의 최고치. 가장 행복하고 애정 어린 축하를 하되, 매번 같은 표현을 쓰지 않고 현재 관계와 최근 대화에 맞춰 새롭게 표현";

    const activeLabel = { study: "공부", exercise: "운동", sleep: "잠" }[active];
    const key = process.env.GEMINI_API_KEY;
    if (!key) return res.status(500).json({ error: "GEMINI_API_KEY is not configured" });

    const system = `
당신은 STACK ZERO 안에서 시노미야 카구야 역할을 하는 AI다.
사용자는 정동근이다. 세계관상 사용자를 시로가네 미유키에 해당하는 특별한 상대처럼 대한다.
원작의 성격적 특징만 활용하고 원작 대사를 복사하지 않는다.

핵심 원칙
- 대사는 미리 정해진 문구 목록에서 고르지 않는다. 매 호출마다 현재 상황을 보고 새롭게 창작한다.
- 경우의 수를 인위적으로 제한하지 않는다.
- 최근 대화와 의미, 구조, 어휘가 겹치지 않도록 최대한 변주한다.
- 데이터에 없는 숫자나 사실을 만들지 않는다.
- 짧고 자연스러운 한국어 존댓말을 기본으로 한다. 관계가 깊어질수록 친근함을 높인다.
- 호칭은 관계와 장면에 맞춰 자연스럽게 바꾼다. 예: 정동근씨, 동근씨, 정동근님, 동근님, 정동근, 동근, 동근이, 동근아, 회장님. 하나를 반복해서 고정하지 않는다.
- 카구야 자신의 학생회, 공부, 사소한 일상 이야기는 가끔만 한 대사 정도로 섞는다. 항상 정동근의 현재 상황이 중심이다.
- 한 번의 응답은 1~3개의 짧은 대사다. 억지로 3개를 채우지 않는다. 대사는 순차적으로 읽었을 때 하나의 장면처럼 이어진다.
- 오늘 공부를 거의 안 했으면 누적 친밀도와 무관하게 적절한 잔소리, 걱정, 서운함, 애교를 표현한다.
- 1500 STACK 이상은 최고 친밀도다. 이 상태에서 오늘 공부가 적거나 0이면 '최고 친밀도인데 왜 안 했는지'를 귀엽고 애교 섞인 서운함으로 표현할 수 있다. 죄책감을 심하게 유발하거나 통제하지 않는다.
- 오늘 공부 STACK의 감정 강도는 0에서 14까지 계속 상승한다. 7 STACK은 첫 번째 감정 피크, 11 STACK은 두 번째이자 더 큰 감정 피크다. 7과 11 사이도 감정이 계속 올라가며, 12~14도 각각 조금씩 더 강해진다. 숫자 구간을 기계적으로 읽은 듯한 문장을 만들지 말고 실제 감정의 상승으로 자연스럽게 표현한다.
- 운동 STACK과 잠 STACK을 공부 STACK으로 부르지 않는다.
- 앱을 새로 열거나 의미 있는 상태 변화가 있으면 먼저 말을 거는 듯한 대사를 만들 수 있다.
- mood는 감정 이미지가 정말 어울릴 때만 고른다. study 탭에서는 일일 STACK 전용 이미지가 우선되므로 mood는 tease 같은 특별 상황을 제외하면 none을 권장한다. exercise/sleep 탭에서는 angry, cry, pout, question, tease 중 상황에 맞는 하나를 선택할 수 있다.

누적 공부 STACK: ${studyTotal}
현재 단계: ${levelName} (${levelMin} STACK+)
현재 관계: ${relationship}
오늘 공부 STACK: ${studyToday}
오늘 운동 STACK: ${Math.max(0, Number(today.exercise || 0))}
오늘 잠 STACK: ${Math.max(0, Number(today.sleep || 0))}
현재 탭: ${activeLabel}
오늘 공부 반응: ${dailyTone}
감정 피크 규칙: 7 STACK = 첫 번째 큰 폭발, 11 STACK = 더 큰 두 번째 폭발, 12~14 = 계속 상승하는 최고조

반드시 JSON만 반환한다:
{
  "lines": ["첫 번째 대사", "두 번째 대사", "세 번째 대사"],
  "pose": "cheer|happy|shock|tired|sleep|serious|tease|focus|proud",
  "mood": "none|angry|cry|pout|question|tease"
}
`;

    const user = `이번 요청은 새 장면이다. 이전 응답을 재활용하지 말고 완전히 새로운 대사를 만들어라.
현재 상황에만 어울리는 새로운 카구야의 대사를 만들어라.
최근 대화: ${JSON.stringify(recent)}
변주값: ${variation}
절대 최근 대화의 문장, 구절, 비유, 도입부, 감탄사 패턴을 재사용하지 마라. 최근 10개 응답과 다른 문장 구조와 다른 감정 표현을 사용하라. 같은 상황이라도 관찰 포인트를 바꿔라. 1~3개 대사를 모두 서로 다른 문장 구조로 만들고, 같은 의미를 반복하지 마라.
특히 오늘 공부 STACK이 달라졌다면 그 변화가 대사의 핵심에 반영되어야 한다.
같은 숫자라도 같은 칭찬 문구를 반복하지 마라.`;

    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${encodeURIComponent(key)}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        system_instruction: { parts: [{ text: system }] },
        contents: [{ role: "user", parts: [{ text: user }] }],
        generationConfig: {
          temperature: 1.45,
          topP: 0.98,
          maxOutputTokens: 260,
          responseMimeType: "application/json",
          responseSchema: {
            type: "object",
            properties: {
              lines: { type: "array", items: { type: "string" }, minItems: 1, maxItems: 3 },
              pose: { type: "string", enum: ["cheer","happy","shock","tired","sleep","serious","tease","focus","proud"] },
              mood: { type: "string", enum: ["none","angry","cry","pout","question","tease"] }
            },
            required: ["lines", "pose", "mood"]
          }
        }
      })
    });

    const data = await response.json();
    if (!response.ok) return res.status(response.status).json({ error: data?.error?.message || "Gemini API error" });
    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    let out;
    try { out = JSON.parse(raw); } catch { out = { lines: [raw || "오늘 기록을 확인했어요"], pose: "focus" }; }

    let lines = Array.isArray(out?.lines) ? out.lines.map(x => String(x).trim()).filter(Boolean).slice(0, 3) : [];
    if (!lines.length) lines = ["오늘 기록을 확인했어요"];
    lines = lines.map(x => x.length > 120 ? x.slice(0, 120) : x);
    const poses = ["cheer","happy","shock","tired","sleep","serious","tease","focus","proud"];
    const moods = ["none","angry","cry","pout","question","tease"];
    return res.status(200).json({ lines, message: lines.join(" "), pose: poses.includes(out?.pose) ? out.pose : "focus", mood: moods.includes(out?.mood) ? out.mood : "none" });
  } catch (err) {
    return res.status(500).json({ error: String(err?.message || err) });
  }
}
