// STACK ZERO · Kaguya context coach
// Gemini API key must live only in Vercel Environment Variables as GEMINI_API_KEY

export default async function handler(req, res) {
  res.setHeader("Cache-Control","no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", "https://ilovejdg123-create.github.io");
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

    const dailyTone = studyToday <= 1 ? "거의 시작하지 않은 날: 관계에 맞는 걱정, 살짝 삐짐, 다시 시작하라는 격려"
      : studyToday <= 3 ? "아직 아쉽지만 시작한 행동은 인정하고 격려"
      : studyToday <= 5 ? "괜찮은 출발: 구체적으로 인정하고 칭찬"
      : studyToday <= 7 ? "만족스럽게 칭찬하며 다음 행동을 자연스럽게 권유"
      : studyToday <= 9 ? "상당히 놀라고 기뻐한다"
      : studyToday <= 10 ? "강한 감탄과 자랑스러움"
      : "11 STACK 이상: 특별한 기록으로 취급하고 평소보다 훨씬 더 행복하고 애정 어린 반응";

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
- 11 STACK 이상은 관계 단계와 별개로 오늘 기록 자체를 평소보다 훨씬 기쁘게 받아들인다.
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

반드시 JSON만 반환한다:
{
  "lines": ["첫 번째 대사", "두 번째 대사", "세 번째 대사"],
  "pose": "cheer|happy|shock|tired|sleep|serious|tease|focus|proud",
  "mood": "none|angry|cry|pout|question|tease"
}
`;

    const user = `현재 상황에만 어울리는 새로운 카구야의 대사를 만들어라.
최근 대화: ${JSON.stringify(recent)}
변주값: ${String(b.variationSeed || Date.now())}
절대 최근 대화의 문장을 재사용하거나 단어만 바꾸지 마라. 최근 대화와 다른 화제, 다른 문장 구조, 다른 감정 표현을 선택하라.
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
          temperature: 1.25,
          topP: 0.97,
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
