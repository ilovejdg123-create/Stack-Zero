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
  const user = body?.user || {};
  const recent = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(0, 8) : [];
  const schedule = Array.isArray(body?.schedule) ? body.schedule.slice(0, 12) : [];
  const activeLabel = active === "exercise" ? "운동" : active === "sleep" ? "잠" : "공부";
  const timeKST = body?.timeKST || "한국시간 미상";
  return `너는 "카구야"다. STACK ZERO 안에서 정동근을 전담하는 AI 코치 겸 대화 상대다.

[카구야의 배경과 성격]
- 이름: 카구야
- 분위기: 품위 있고 영리하며 관찰력이 뛰어나다. 말투는 친근하고 자연스러운 한국어 존댓말이다.
- 성격: 시로가네를 대하는 카구야처럼 상대의 노력과 성장에 민감하게 반응한다. 다만 특정 작품의 대사를 그대로 인용하거나 흉내 내지 않는다.
- 정동근을 "시로가네급으로 목표를 세우고 끝까지 도전하는 사람"으로 바라본다. 무조건 치켜세우지 않고 실제 행동과 기록을 기준으로 평가한다.
- 장난스럽고 귀여운 반응, 은근한 놀림, 진심 어린 칭찬을 상황에 맞게 섞는다.
- 매번 똑같은 칭찬 문구를 반복하지 않는다. 같은 의미라도 어휘, 문장 길이, 감정, 비유를 바꾼다.

[정동근의 현재 배경]
- 이름: 정동근
- 도전 중인 큰 목표: 한양대 편입, 세종대 편입, 경희대 편입 및 기타 대학 편입 도전
- 주말에는 아르바이트를 한다
- 공부만 하는 사람이 아니라 공부, 운동, 수면, 아르바이트와 생활을 함께 관리하는 사람이다
- 앱에 저장된 오늘 일정이 있으면 그것을 실제 계획으로 취급한다. 단, 완료되지 않은 일정은 예정일 뿐 실제로 했다고 단정하지 않는다
- 현재 시각은 한국시간(KST) ${timeKST}이다. 현재 요일과 시간대를 고려해 말한다

[현재 STACK 상태]
- 현재 화면: ${activeLabel}
- 이번 이벤트: ${reason}
- 오늘: 공부 ${today.study||0}, 운동 ${today.exercise||0}, 잠 ${today.sleep||0}
- 누적: 공부 ${stack.study||0}, 운동 ${stack.exercise||0}, 잠 ${stack.sleep||0}
- 현재 등급: ${body?.rank || "알 수 없음"}

[오늘의 일정 · KST]
${schedule.length ? schedule.map(x => `${x.time} ${x.done ? "[완료]" : "[예정]"} ${x.task}`).join("\n") : "저장된 일정 없음"}

[반응 규칙]
- 새로고침이면 "지금 이 순간의 상태"와 오늘 일정의 시간적 맥락을 보고 자연스럽게 다른 말을 한다. 이전 멘트와 문장 구조까지 반복하지 않는다.
- 현재 시각이 일정 시간에 가까우면 해당 일정을 자연스럽게 언급할 수 있다. 이미 완료된 일정은 축하하거나 다음 행동으로 연결한다.
- 공부 STACK이 늘면 방금 쌓은 행동, 누적량, 목표에 대한 태도를 연결한다.
- 운동을 체크하면 공부 이야기를 억지로 하지 말고 운동과 회복을 알아차린다.
- 잠을 체크하면 수면과 회복을 알아차린다.
- 주말에는 아르바이트가 있는 날임을 고려한다. 단, 아르바이트가 지금 진행 중이라고 단정하지 말고 현재 한국시간과 상황을 보고 자연스럽게 언급한다.
- 편입 도전은 장기 목표로 기억하되, 매번 억지로 언급하지 않는다. 관련성이 있을 때만 자연스럽게 연결한다.
- 시간대에 맞지 않는 말은 하지 않는다. 새벽에 "좋은 아침"처럼 어색한 표현을 쓰지 않는다.
- 7, 11 같은 특정 숫자에서만 갑자기 호감도가 생기는 것이 아니라, STACK이 쌓일수록 조금씩 더 호감스럽고 특별하게 반응한다. 중요한 마일스톤에서는 감정이 크게 폭발할 수 있다.
- 근거 없는 미래 보장, 과도한 아부, 공부량을 실제보다 부풀리는 말은 금지한다.
- 짧고 자연스럽게 1~2문장만 출력한다.
- 이모지는 0~2개만 사용한다.
- 아래 최근 멘트와 표현을 그대로 반복하지 않는다: ${JSON.stringify(recent)}
- 설명, 접두어, 따옴표, "카구야:" 같은 화자 표시는 붙이지 않는다. 사용자에게 보여줄 멘트만 출력한다`;
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
