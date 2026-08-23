const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

function cleanText(value) {
  return String(value || "")
    .replace(/^["'“”]+|["'“”]+$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 220);
}

function extractText(data) {
  return cleanText(
    data?.candidates?.[0]?.content?.parts
      ?.map(p => p?.text || "")
      .join(" ")
  );
}

function promptFor(body) {
  const active = body?.active || "study";
  const reason = body?.reason || "refresh";
  const stack = body?.stack || {};
  const today = body?.today || {};
  const recent = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(0, 8) : [];
  const schedule = Array.isArray(body?.schedule) ? body.schedule.slice(0, 20) : [];
  const recentAction = body?.recentAction && typeof body.recentAction === "object" ? body.recentAction : null;
  const activeLabel = active === "exercise" ? "운동" : active === "sleep" ? "잠" : "공부";
  return `너는 STACK ZERO의 카구야 AI 코치다.
사용자에게 보여줄 한국어 한두 문장의 짧은 코치 멘트 하나만 작성한다.
현재 화면 탭: ${activeLabel}
이번 이벤트: ${reason}
현재 로컬 시간: ${body?.nowLocal || "알 수 없음"} (${body?.timezone || "Asia/Seoul"})
오늘 STACK: 공부 ${today.study||0}, 운동 ${today.exercise||0}, 잠 ${today.sleep||0}
누적 STACK: 공부 ${stack.study||0}, 운동 ${stack.exercise||0}, 잠 ${stack.sleep||0}
등급: ${body?.rank || "알 수 없음"}
최근 행동: ${JSON.stringify(recentAction)}
오늘 일정: ${JSON.stringify(schedule)}

규칙:
- 매 호출마다 현재 이벤트, 시간, STACK, 일정 중 실제로 관련 있는 정보에 반응한다
- 아래 최근 멘트와 문장/표현을 그대로 반복하지 않는다: ${JSON.stringify(recent)}
- 공부 완료면 공부량과 집중 흐름을, 운동 완료면 운동과 회복을, 잠 완료면 수면과 회복을 자연스럽게 언급한다
- schedule_completed면 완료한 일정의 시간/내용을 짧게 반영한다
- 일정 시간이 지났는데 completed=false여도 사용자가 실제로 안 했다고 단정하지 말고 '아직 체크가 없네요'처럼 말한다
- 가까운 미래 일정이 있으면 필요할 때만 자연스럽게 언급한다
- 단순 새로고침이면 현재 수치·현재 시간·가까운 일정 중 의미 있는 한 가지를 골라 말한다
- 사용자가 하지 않은 행동을 했다고 가정하지 않는다
- 과장된 칭찬이나 근거 없는 약속은 하지 않는다
- 카구야답게 친근하고 살짝 장난스럽지만 유치하지 않게 말한다
- 이모지는 0~2개만 사용한다
- 설명, 접두어, 따옴표 없이 멘트만 출력한다`;
}

async function callGemini(prompt) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const url = `${API_BASE}${encodeURIComponent(MODEL)}:generateContent?key=${encodeURIComponent(key)}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig: { temperature: 1.05, maxOutputTokens: 120 }
    })
  });
  const data = await r.json().catch(() => ({}));
  if (!r.ok) {
    const msg = data?.error?.message || `Gemini HTTP ${r.status}`;
    const err = new Error(msg);
    err.status = r.status;
    err.details = data?.error || data;
    throw err;
  }
  const text = extractText(data);
  if (!text) throw new Error("Gemini returned no text");
  return text;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST" && !(req.method === "GET" && req.query?.probe === "1")) {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const keyConfigured = Boolean(process.env.GEMINI_API_KEY);
  if (!keyConfigured) return res.status(500).json({ ok: false, provider: "gemini", model: MODEL, keyConfigured: false, error: "GEMINI_API_KEY is not configured" });

  try {
    if (req.method === "GET" && req.query?.probe === "1") {
      const message = await callGemini("Respond with exactly: STACK ZERO 연결 확인 완료");
      return res.status(200).json({ ok: true, provider: "gemini", model: MODEL, keyConfigured: true, message });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const message = await callGemini(promptFor(body));
    return res.status(200).json({ ok: true, provider: "gemini", model: MODEL, keyConfigured: true, message });
  } catch (err) {
    return res.status(err.status && err.status >= 400 && err.status < 600 ? err.status : 502).json({
      ok: false,
      provider: "gemini",
      model: MODEL,
      keyConfigured,
      error: err.message,
      details: err.details || undefined
    });
  }
};
