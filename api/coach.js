// STACK ZERO · Kaguya context coach · Gemini only
// GEMINI_API_KEY must exist only in Vercel Environment Variables

export default async function handler(req, res) {
  const origin = req.headers.origin || "";
  const allowed = new Set([
    "https://ilovejdg123-create.github.io",
    "https://stack-zero-k71c.vercel.app"
  ]);

  res.setHeader("Cache-Control", "no-store, max-age=0");
  res.setHeader("Access-Control-Allow-Origin", allowed.has(origin) ? origin : "*");
  res.setHeader("Vary", "Origin");
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type");

  if (req.method === "OPTIONS") return res.status(204).end();

  // Simple health check: useful for verifying the Vercel function without calling Gemini
  if (req.method === "GET") {
    return res.status(200).json({
      ok: true,
      provider: "gemini",
      model: "gemini-2.5-flash-lite",
      keyConfigured: Boolean(process.env.GEMINI_API_KEY)
    });
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const b = req.body || {};
    const active = ["study", "exercise", "sleep"].includes(b.active) ? b.active : "study";
    const today = b.today || {};
    const total = b.total || {};
    const yesterday = b.yesterday || {};
    const relationship = b.relationship || {};
    const recent = Array.isArray(b.recent) ? b.recent.slice(-30) : [];

    const studyToday = Math.max(0, Number(today.study || 0));
    const exerciseToday = Math.max(0, Number(today.exercise || 0));
    const sleepToday = Math.max(0, Number(today.sleep || 0));
    const studyTotal = Math.max(0, Number(total.study || 0));
    const relationStep = Math.max(0, Math.min(15, Number(relationship.step || 0)));

    const levels = [
      [0, "뉴비"], [100, "입문자"], [200, "노력가"], [300, "학습자"],
      [500, "깨달은 자"], [700, "실력자"], [900, "강자"], [1100, "상위권"],
      [1300, "전설"], [1500, "초월자"]
    ];
    let levelName = levels[0][1];
    let levelMin = 0;
    for (const [min, name] of levels) {
      if (studyTotal >= min) {
        levelMin = min;
        levelName = name;
      }
    }

    const relationshipTone = relationStep <= 2
      ? "거리가 있고 도도하지만 악의적이지 않다"
      : relationStep <= 5
      ? "조금씩 관심을 보이며 은근히 챙긴다"
      : relationStep <= 8
      ? "가까워져 장난과 칭찬이 자연스럽다"
      : relationStep <= 10
      ? "호감이 눈에 띄며 부끄러움과 다정함이 섞인다"
      : relationStep <= 12
      ? "좋아하는 감정을 자연스럽게 표현한다"
      : "매우 애정 어린 태도이며 특별한 상대처럼 대한다";

    const dailyTone = active === "study"
      ? studyToday <= 1 ? "거의 시작하지 않은 날: 걱정, 살짝 삐짐, 다시 시작하라는 격려"
        : studyToday <= 3 ? "아직 아쉽지만 시작한 행동을 인정하고 격려"
        : studyToday <= 5 ? "괜찮은 출발: 구체적으로 인정하고 칭찬"
        : studyToday <= 6 ? "기분 좋게 칭찬하며 자연스럽게 다음 행동을 권유"
        : studyToday === 7 ? "첫 번째 감정 피크: 평소보다 확실히 들뜨고 기뻐한다"
        : studyToday <= 10 ? "높은 만족감: 7보다 더 깊어진 기쁨과 호감"
        : studyToday === 11 ? "두 번째 감정 피크: 7보다 훨씬 강하게 행복해한다"
        : studyToday <= 13 ? "최고조로 계속 상승하는 행복감"
        : "오늘 공부 반응 최고조: 매우 행복하고 애정 어린 축하"
      : active === "exercise"
        ? exerciseToday > 0 ? "운동 기록을 확인하고 실제 운동 행동에 맞춰 반응한다" : "운동을 하지 않았다면 가볍게 걱정하거나 귀엽게 재촉한다"
        : sleepToday > 0 ? "잠 기록을 확인하고 회복과 컨디션에 맞춰 반응한다" : "잠 기록이 없다면 컨디션을 걱정한다";

    const activeLabel = { study: "공부", exercise: "운동", sleep: "잠" }[active];
    const key = process.env.GEMINI_API_KEY;
    if (!key) {
      return res.status(500).json({
        error: "GEMINI_API_KEY is not configured",
        provider: "gemini"
      });
    }

    const system = `
당신은 STACK ZERO의 시노미야 카구야 역할을 하는 AI 코치다.
사용자는 정동근이며, 앱 세계관에서는 특별한 상대처럼 대한다.
원작의 성격적 특징만 활용하고 원작 대사를 복사하지 않는다.

가장 중요한 규칙
- 미리 정해진 대사 목록에서 고르지 않는다. 매 호출마다 현재 상황을 바탕으로 새롭게 창작한다.
- 경우의 수를 인위적으로 제한하지 않는다.
- 최근 대화와 같은 문장, 도입부, 감탄사, 비유, 칭찬 패턴, 문장 구조를 반복하지 않는다.
- 최근 대화와 비슷한 내용만 단어를 바꾸는 방식도 금지한다.
- 현재 탭과 현재 기록을 반드시 반영한다.
- 데이터에 없는 숫자나 행동을 만들지 않는다.
- 1~3개의 짧은 대사를 만들되 억지로 3개를 채우지 않는다.
- 자연스러운 존댓말을 기본으로 하고 친밀도가 높아질수록 조금 더 친근하게 한다.
- 오늘 공부 STACK은 0부터 14까지 감정이 점진적으로 상승한다. 7에서 첫 번째 큰 감정 피크, 11에서 더 큰 두 번째 피크가 있다. 11 이전에도 계속 호감이 상승한다.
- 누적 공부 STACK은 장기적인 관계와 호칭의 친밀도를 결정한다. 오늘 공부 STACK과 섞지 않는다.
- 운동 STACK과 잠 STACK을 공부 STACK으로 부르지 않는다.
- 운동/잠 탭에서는 해당 기록을 중심으로 반응한다.
- 최고 친밀도라도 오늘 공부를 안 했다면 귀엽게 서운해하거나 걱정할 수 있다.
- 카구야 자신의 일상 이야기는 가끔만 한 문장 정도 섞는다.

현재 누적 공부 STACK: ${studyTotal}
현재 레벨: ${levelName} (${levelMin} STACK 이상)
관계 단계: ${relationStep}/15
관계 분위기: ${relationshipTone}
오늘 공부 STACK: ${studyToday}
어제 공부 STACK: ${Math.max(0, Number(yesterday.study || 0))}
오늘 운동 STACK: ${exerciseToday}
오늘 잠 STACK: ${sleepToday}
현재 탭: ${activeLabel}
현재 탭의 감정 방향: ${dailyTone}

응답은 반드시 JSON 하나만 반환한다.
형식:
{
  "lines": ["짧은 대사"],
  "pose": "cheer|happy|shock|tired|sleep|serious|tease|focus|proud",
  "mood": "none|angry|cry|pout|question|tease"
}
`;

    const variationSeed = String(b.variationSeed || `${Date.now()}-${Math.random()}`);
    const user = `
이번 호출의 변주값: ${variationSeed}
최근 대화 기록: ${JSON.stringify(recent)}

지금 상태에서 이전 대화와 확실히 다른 새 장면을 만들어라.
특히 최근 대화의 첫 단어와 문장 구조를 피하라.
현재 탭이 ${activeLabel}이므로 ${activeLabel} 기록에 대한 반응을 반드시 포함하라.
`;

    const model = "gemini-2.5-flash-lite";
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;

    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": key
      },
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
              pose: { type: "string", enum: ["cheer", "happy", "shock", "tired", "sleep", "serious", "tease", "focus", "proud"] },
              mood: { type: "string", enum: ["none", "angry", "cry", "pout", "question", "tease"] }
            },
            required: ["lines", "pose", "mood"]
          }
        }
      })
    });

    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      return res.status(502).json({
        error: data?.error?.message || `Gemini HTTP ${response.status}`,
        provider: "gemini",
        upstreamStatus: response.status
      });
    }

    const raw = data?.candidates?.[0]?.content?.parts?.map(p => p.text || "").join("").trim();
    let out;
    try {
      out = JSON.parse(raw);
    } catch {
      out = { lines: [raw || "오늘 기록을 확인했어요"], pose: "focus", mood: "none" };
    }

    const lines = Array.isArray(out?.lines)
      ? out.lines.map(x => String(x).trim()).filter(Boolean).slice(0, 3).map(x => x.slice(0, 120))
      : [];
    const safeLines = lines.length ? lines : ["오늘 기록을 확인했어요"];
    const poses = ["cheer", "happy", "shock", "tired", "sleep", "serious", "tease", "focus", "proud"];
    const moods = ["none", "angry", "cry", "pout", "question", "tease"];

    return res.status(200).json({
      ok: true,
      provider: "gemini",
      model,
      lines: safeLines,
      message: safeLines.join(" "),
      pose: poses.includes(out?.pose) ? out.pose : "focus",
      mood: moods.includes(out?.mood) ? out.mood : "none"
    });
  } catch (err) {
    return res.status(500).json({
      error: String(err?.message || err),
      provider: "gemini"
    });
  }
}
