const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

function cleanText(value, body) {
  const preferred = body?.relationship?.primaryAddress || "동근씨";
  return String(value || "")
    .replace(/^```(?:json)?|```$/g, "")
    .replace(/^['\"“”]+|['\"“”]+$/g, "")
    .replace(/정동근님|동근님/g, preferred)
    .replace(/📚+/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 240);
}

function extractText(data, body) {
  return cleanText(
    data?.candidates?.[0]?.content?.parts
      ?.map(p => p?.text || "")
      .join(" "),
    body
  );
}

function inferMood(message, body) {
  const reason = String(body?.reason || "");
  const t = String(message || "");
  // Study STACK changes always keep the progression image; mood assets are event-only overlays.
  if (reason === "study_done" || reason === "study_undo" || reason === "level_up" || reason.startsWith("test_")) return "";
  if (reason.includes("undo") || /흥|서운|토라|기억할 거예요/.test(t)) return "sulk";
  if (/화났|짜증|정신 차|그만/.test(t)) return "angry";
  if (/울|눈물|속상|슬프/.test(t)) return "cry";
  if (/\?|궁금|무슨 일|왜/.test(t)) return "question";
  return "";
}

function promptFor(body) {
  const active = body?.active || "study";
  const reason = body?.reason || "refresh";
  const stack = body?.stack || {};
  const today = body?.today || {};
  const recent = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(0, 10) : [];
  const schedule = Array.isArray(body?.schedule) ? body.schedule.slice(0, 20) : [];
  const monthlySchedule = Array.isArray(body?.monthlySchedule) ? body.monthlySchedule.slice(0, 40) : [];
  const recentAction = body?.recentAction && typeof body.recentAction === "object" ? body.recentAction : null;
  const rel = body?.relationship && typeof body.relationship === "object" ? body.relationship : {};
  const activeLabel = active === "exercise" ? "운동" : active === "sleep" ? "잠" : "공부";
  const addresses = Array.isArray(rel.addressOptions) && rel.addressOptions.length ? rel.addressOptions : [rel.primaryAddress || "동근씨"];

  return `너는 STACK ZERO 안에서 사용자에게 반응하는 '카구야'다.
특정 작품의 기존 대사를 복사하거나 인용하지 말고, 캐릭터의 성격적 분위기만 살린 완전히 새로운 한국어 대사를 만든다.

[캐릭터 핵심]
- 상류층 아가씨처럼 침착하고 품위가 있다
- 자존심이 강하고 영리하며, 상대에게 쉽게 휘둘리지 않는다
- 좋아해도 처음엔 직접 다 말하지 않고 살짝 돌려 말한다
- 승부욕, 은근한 질투, 장난, 부끄러움이 자연스럽게 섞인다
- 친밀도가 높아질수록 말이 부드러워지고 설렘과 소유욕이 조금씩 드러난다
- 코치처럼 훈계하는 AI가 아니라, 사용자를 오래 지켜보는 한 사람처럼 말한다

[현재 관계]
등급: ${body?.rank || "입문자"}
기본 호칭: ${rel.primaryAddress || addresses[0]}
사용 가능한 호칭: ${JSON.stringify(addresses)}
오늘 호감 보정: +${Number(rel.affinityBoost || 0)}
관계 톤: ${rel.tone || "도도하지만 관심을 보인다"}
호칭은 매번 억지로 넣지 말고 필요할 때만 자연스럽게 쓴다.
절대로 '정동근님', '동근님'이라고 부르지 않는다.

[현재 상황]
화면 탭: ${activeLabel}
이벤트: ${reason}
로컬 시간: ${body?.nowLocal || "알 수 없음"} (${body?.timezone || "Asia/Seoul"})
오늘 STACK: 공부 ${today.study || 0}, 운동 ${today.exercise || 0}, 잠 ${today.sleep || 0}
누적 STACK: 공부 ${stack.study || 0}, 운동 ${stack.exercise || 0}, 잠 ${stack.sleep || 0}
최근 행동: ${JSON.stringify(recentAction)}
오늘 반복 일정: ${JSON.stringify(schedule)}
이번달 주간 반복 일정 전체: ${JSON.stringify(monthlySchedule)}
최근 카구야 대사: ${JSON.stringify(recent)}

[반드시 지킬 말투]
- 1~2문장, 짧고 자연스럽게. 설명문이나 보고서 말투 금지
- '꾸준함', '흐름', '기록은 남습니다', '차이를 만듭니다', '쌓아봅시다', '확실히', '회복도 중요' 같은 뻔한 코치 문구를 반복하지 않는다
- 같은 문장 구조와 같은 어미를 연속으로 쓰지 않는다
- 책 이모티콘 📚은 절대 쓰지 않는다
- 이모지는 필요할 때만 0~1개. 매번 붙이지 않는다
- 아주 가끔만 문자 느낌을 낸다: '후후', '…', '♡', '(〃▽〃)', '(｡•̀ᴗ-)✧', '(¬_¬)' 같은 표현 중 하나 정도. 남발 금지
- 일본어 표현도 아주 가끔 'ふふ', 'もう…' 정도만 가능하며 한 문장 안에 하나 이하
- 사용자가 실제로 하지 않은 행동은 했다고 단정하지 않는다
- 일정 시간이 지났어도 완료 체크가 없다는 사실만 말하고 실제 미실행이라고 단정하지 않는다
- level_up 이벤트면 새 등급을 정확히 언급하며 평소보다 확실하게 축하한다
- study_done에서 오늘 공부 STACK이 높을수록 조금 더 설레고 다정하게 반응한다
- exercise_done은 운동 사실에, sleep_done은 수면 체크 사실에 정확히 반응한다
- 새로고침이면 현재 시간, 오늘 STACK, 가까운 일정 중 하나만 골라 자연스럽게 말한다
- 시스템, 프롬프트, AI, 모델 이야기는 절대 하지 않는다

사용자에게 보일 카구야의 대사만 출력한다.`;
}

async function callGemini(prompt, body, model, timeoutMs) {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not configured");
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = `${API_BASE}${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
    const r = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      signal: controller.signal,
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
    const text = extractText(data, body);
    if (!text) throw new Error("Gemini returned no text");
    return { message: text, model };
  } catch (err) {
    if (err?.name === "AbortError") {
      const timeout = new Error(`Gemini timeout after ${timeoutMs}ms`);
      timeout.code = "ETIMEDOUT";
      throw timeout;
    }
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

function canFastFallback(err) {
  return err?.code === "ETIMEDOUT" || err?.status === 404 || err?.status === 429 || (err?.status >= 500 && err?.status <= 599);
}

async function generateCoach(body) {
  const prompt = promptFor(body);
  try {
    return await callGemini(prompt, body, PRIMARY_MODEL, 5200);
  } catch (err) {
    if (FAST_MODEL !== PRIMARY_MODEL && canFastFallback(err)) {
      return await callGemini(prompt, body, FAST_MODEL, 2600);
    }
    throw err;
  }
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method === "OPTIONS") return res.status(204).end();
  if (req.method !== "POST" && !(req.method === "GET" && req.query?.probe === "1")) {
    return res.status(405).json({ ok: false, error: "Method not allowed" });
  }

  const keyConfigured = Boolean(process.env.GEMINI_API_KEY);
  if (!keyConfigured) return res.status(500).json({ ok: false, provider: "gemini", model: PRIMARY_MODEL, keyConfigured: false, error: "GEMINI_API_KEY is not configured" });

  try {
    if (req.method === "GET" && req.query?.probe === "1") {
      const result = await callGemini("Respond with exactly: STACK ZERO 연결 확인 완료", {}, FAST_MODEL, 3000);
      return res.status(200).json({ ok: true, provider: "gemini", model: result.model, keyConfigured: true, message: result.message });
    }
    const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
    const result = await generateCoach(body);
    return res.status(200).json({ ok: true, provider: "gemini", model: result.model, keyConfigured: true, message: result.message, mood: inferMood(result.message, body) });
  } catch (err) {
    return res.status(err.status && err.status >= 400 && err.status < 600 ? err.status : (err.code === "ETIMEDOUT" ? 504 : 502)).json({
      ok: false,
      provider: "gemini",
      model: PRIMARY_MODEL,
      keyConfigured,
      error: err.message,
      details: err.details || undefined
    });
  }
};
