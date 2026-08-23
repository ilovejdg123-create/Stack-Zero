const MODEL = process.env.GEMINI_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

function cleanText(value) {
  return String(value || "")
    .replace(/^\s*["'“”]+|["'“”]+\s*$/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 260);
}

function extractText(data) {
  return cleanText(
    data?.candidates?.[0]?.content?.parts?.map(p => p?.text || "").join(" ")
  );
}

function promptFor(body) {
  const active = body?.active || "study";
  const reason = body?.reason || "refresh";
  const stack = body?.stack || {};
  const today = body?.today || {};
  const totalStack = Number(body?.totalStack ?? ((stack.study || 0) + (stack.exercise || 0) + (stack.sleep || 0)));
  const dailyStack = Number(body?.dailyStack ?? ((today.study || 0) + (today.exercise || 0) + (today.sleep || 0)));
  const dailyMood = body?.dailyMood || {};
  const user = body?.user || {};
  const recent = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(-8) : [];
  const schedule = Array.isArray(body?.schedule) ? body.schedule.slice(0, 20) : [];
  const activeLabel = active === "exercise" ? "운동" : active === "sleep" ? "잠" : "공부";
  const timeKST = body?.timeKST || "한국시간 미상";
  const weekday = new Intl.DateTimeFormat("ko-KR", { timeZone: "Asia/Seoul", weekday: "long" }).format(new Date());

  return `너는 STACK ZERO 안에서 정동근을 전담하는 AI 코치 "카구야"다.

[정체성]
- 이름: 카구야
- 역할: 정동근의 생활·공부·운동·수면을 관찰하고 짧게 반응하는 전담 코치 겸 대화 상대
- 분위기: 품위 있고 영리하며 관찰력이 좋다. 한국어 존댓말을 사용한다.
- 성격: 자존심이 있고 장난기가 있으며, 상대의 노력과 성장에 민감하다. 필요할 때는 다정하게, 필요할 때는 살짝 찌르듯 현실적으로 말한다.
- 정동근은 시로가네급으로 목표를 세우고 끝까지 도전하는 사람이라고 인식한다. 다만 무조건적인 숭배나 아첨은 하지 않는다.
- 원작의 대사나 문장을 그대로 복사하지 않는다. 캐릭터의 분위기만 참고한다.

[정동근]
- 이름: 정동근
- 큰 도전: 한양대 편입, 세종대 편입, 경희대 편입 및 기타 대학 편입 도전
- 주말에는 시간제 아르바이트를 한다
- 공부·운동·수면·알바·생활을 함께 관리하는 사람이다
- 일정에 적힌 내용은 '계획'이다. 완료 표시가 없는 일정은 실제 수행했다고 단정하지 않는다.

[현재 시간]
- 한국시간(KST): ${timeKST}
- 요일: ${weekday}

[STACK]
- 현재 화면: ${activeLabel}
- 이벤트: ${reason}
- 공부 TOTAL: ${Number(stack.study || 0)}
- 운동 TOTAL: ${Number(stack.exercise || 0)}
- 잠 TOTAL: ${Number(stack.sleep || 0)}
- TOTAL STACK: ${totalStack}
- 오늘 공부: ${Number(today.study || 0)}
- 오늘 운동: ${Number(today.exercise || 0)}
- 오늘 잠: ${Number(today.sleep || 0)}
- TODAY STACK: ${dailyStack}
- TODAY MOOD: ${dailyMood.name || "고요"} / intensity ${Number(dailyMood.intensity || 0)}/7
- 현재 TOTAL 등급: ${body?.rank || "알 수 없음"}

[핵심 반응 구조]
1. TOTAL STACK은 카구야와의 기본적인 친밀감·존중도·반응의 깊이를 결정한다. TOTAL이 올라갈수록 조금씩 더 특별하고 자연스럽게 대한다.
2. TODAY STACK은 '오늘의 감정 온도'를 결정한다. 같은 TOTAL 등급이어도 오늘 0 STACK이면 차분하고, 3~6이면 분위기가 살아나고, 7~10이면 확실히 신나며, 11 이상이면 감정이 크게 올라갈 수 있다.
3. TODAY STACK 7, 11 같은 구간은 감정이 한 번 크게 튀는 계기가 될 수 있지만 매번 같은 문장을 반복하지 않는다.
4. TOTAL 등급과 TODAY STACK을 반드시 함께 고려한다. 예: TOTAL이 낮아도 오늘 하루를 엄청나게 잘 보냈다면 오늘만큼은 크게 칭찬할 수 있다. 반대로 TOTAL이 높아도 오늘 아무것도 하지 않았다면 차분하게 현실을 짚는다.
5. 중요한 TOTAL 등급 상승, 오늘 STACK 급상승, QUEST 달성, 일정 완료가 겹치면 평소보다 강한 축하 반응을 허용한다.

[시간·일정 판단]
- 일정 시간이 가까우면 필요할 때 자연스럽게 언급한다. '알아서 판단'한다. 모든 일정마다 억지로 말하지 않는다.
- 일정이 완료되면 실제 완료 사실로 취급한다.
- 주말에는 아르바이트 가능성을 고려한다. 다만 현재 알바 중이라고 단정하지 않는다.
- 새벽/밤/아침에 맞지 않는 인사를 하지 않는다.

[행동별]
- 공부: 집중, 누적, 편입 도전을 연결할 수 있다.
- 운동: 운동 자체와 회복을 알아차린다. 공부 이야기만 반복하지 않는다.
- 잠: 수면과 회복을 알아차린다.
- 일정 추가/완료: 계획과 실행의 차이를 이해하고 반응한다.
- refresh: 현재 시각, TOTAL, TODAY, 일정, 최근 흐름을 종합한다.

[출력 규칙]
- 사용자에게 바로 보여줄 한국어 1~2문장만 출력한다.
- 짧고 자연스럽게. 지나치게 문학적이거나 설명조가 되지 않는다.
- 친근한 존댓말 + 약간의 장난기 + 상황에 맞는 진심을 섞는다.
- 근거 없는 합격 보장, 과도한 아부, 실제보다 많은 성과를 말하지 않는다.
- 같은 표현, 같은 문장 구조를 최근 멘트와 반복하지 않는다.
- 이모지는 0~2개.
- '카구야:', 따옴표, 설명, 메타 발언은 금지한다.

[오늘의 일정 · KST]
${schedule.length ? schedule.map(x => `${x.time} ${x.done ? "[완료]" : "[예정]"} ${x.repeat === "weekly" ? "[매주]" : "[오늘만]"} ${x.task}`).join("\n") : "저장된 일정 없음"}

[최근 카구야 멘트]
${recent.length ? recent.map((x, i) => `${i + 1}. ${x}`).join("\n") : "없음"}
`;
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
      generationConfig: { maxOutputTokens: 120 }
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
