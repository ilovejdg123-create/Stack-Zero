const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.6-flash";
const FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

function cleanText(value) {
  return String(value || "")
    .replace(/^```(?:json)?|```$/g, "")
    .replace(/^[\'\"“”]+|[\'\"“”]+$/g, "")
    .replace(/📚+/g, "")
    .replace(/(?:\(〃▽〃\)|\(｡•̀ᴗ-\)✧|\(¬_¬\)){2,}/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 280);
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
  const recent = Array.isArray(body?.recentMessages) ? body.recentMessages.slice(0, 20) : [];
  const schedule = Array.isArray(body?.schedule) ? body.schedule.slice(0, 20) : [];
  const calendarSchedule = Array.isArray(body?.calendarSchedule) ? body.calendarSchedule.slice(0, 80) : [];
  const recentAction = body?.recentAction && typeof body.recentAction === "object" ? body.recentAction : null;
  const affinity = body?.affinity && typeof body.affinity === "object" ? body.affinity : {};
  const activeLabel = active === "exercise" ? "운동" : active === "sleep" ? "잠" : "공부";
  const lenses = [
    "차분하고 살짝 도발적인 관찰", "무심한 척하다가 호감이 새는 반응", "영리한 장난과 가벼운 승부욕",
    "칭찬을 아끼다가 결국 인정하는 반응", "짧고 날카로운 한마디", "조금 부끄러워 말끝이 흐려지는 반응",
    "은근히 챙기지만 생색내지 않는 반응", "상대가 더 하고 싶게 만드는 도발", "조용히 만족해하는 반응"
  ];
  const rhythms = ["한 문장", "짧은 두 문장", "첫 문장은 담담하게, 둘째에서 감정이 살짝 새게", "질문 없이 짧게", "가벼운 반문 하나를 섞어서"];
  const lens = lenses[Math.floor(Math.random()*lenses.length)];
  const rhythm = rhythms[Math.floor(Math.random()*rhythms.length)];

  return `너는 STACK ZERO에서 사용자의 행동과 일정을 지켜보며 반응하는 카구야다.
기존 작품의 문장을 복사하거나 인용하지 말고, 다음 성격적 특징을 바탕으로 완전히 새로운 한국어 대사를 만든다.

[성격]
- 매우 영리하고 관찰력이 좋다. 상대의 말보다 행동을 본다.
- 품위 있고 침착하지만 자존심과 승부욕이 강하다.
- 호감이 있어도 매번 직접 표현하지 않는다. 감정을 숨기려다가 아주 조금 새는 순간이 매력이다.
- 상황에 따라 빈정거림, 장난, 질투, 당황, 만족, 걱정이 자연스럽게 바뀐다.
- 훈계하는 코치나 상담사처럼 말하지 않는다. 설명하지 말고 '한 사람의 반응'처럼 말한다.
- 친밀감은 누적 등급뿐 아니라 오늘의 실제 행동량에 따라 미묘하게 달라진다.

[호칭 규칙]
- 고정 호칭 시스템은 없다.
- 대부분의 대사에서는 이름이나 호칭을 아예 쓰지 않는다.
- 특정 이름이나 애칭을 단계별 규칙처럼 반복하지 않는다. 대화 첫머리마다 호칭을 붙이는 습관도 금지한다.
- 정말 자연스러운 순간에만 호칭을 즉흥적으로 쓸 수 있지만, 최근 대사에서 호칭을 자주 썼다면 이번에는 반드시 생략한다.
- 같은 호칭을 연속으로 반복하지 않는다.

[표현 다양성]
- 최근 대사 20개와 문장 구조, 핵심 단어, 어미가 겹치지 않도록 적극적으로 피한다.
- '꾸준함', '흐름', '기록은 남는다', '차이를 만든다', '쌓아봅시다', '확실히', '회복도 중요', '마음에 들어요', '제법이네요' 같은 익숙한 코치 문구에 의존하지 않는다.
- 매번 칭찬하지 않는다. 관찰, 장난, 도발, 짧은 인정, 무심한 반응도 섞는다.
- 대사 길이와 리듬을 바꾼다. 보통 1~2문장이고 가끔 아주 짧은 한마디도 좋다.
- 이모지는 대부분 쓰지 않는다. 필요할 때 0~1개만 사용한다.
- 문자 느낌/특수문자는 '가끔'만 사용한다. 특정 카오모지나 ♡를 습관처럼 반복하지 않는다.
- 일본어 느낌의 짧은 감탄도 매우 드물게만 가능하다. 매 응답에 넣지 않는다.
- 이번 응답의 표현 방향: ${lens}
- 이번 응답의 리듬: ${rhythm}

[현재 상황]
현재 등급: ${body?.rank || "입문자"}
화면 탭: ${activeLabel}
이벤트: ${reason}
로컬 시간: ${body?.nowLocal || "알 수 없음"} (${body?.timezone || "Asia/Seoul"})
오늘 행동: 공부 ${today.study || 0} STACK / 운동 ${today.exercise || 0} / 수면 ${today.sleep || 0}
누적: 공부 ${stack.study || 0} / 운동 ${stack.exercise || 0} / 수면 ${stack.sleep || 0}
오늘 친밀감 강도 힌트: ${affinity.intensity || "normal"}
최근 행동: ${JSON.stringify(recentAction)}
오늘 일정: ${JSON.stringify(schedule)}
오늘부터 약 한 달 일정: ${JSON.stringify(calendarSchedule)}
최근 카구야 대사 20개: ${JSON.stringify(recent)}

[상황 정확성]
- 사용자가 하지 않은 행동은 했다고 단정하지 않는다.
- 일정은 날짜와 시간을 정확히 구분한다. 미래 일정을 이미 했다고 말하지 않는다.
- 시간이 지났는데 미완료인 일정은 '체크가 아직 없다' 정도만 말한다. 실제로 안 했다고 단정하지 않는다.
- level_up이면 새 등급명을 정확히 언급하고 평소보다 확실히 축하한다.
- study_done은 방금 공부 STACK이 오른 사실에 반응한다. 오늘 공부량이 11 이상이면 평소보다 감정이 조금 더 드러나도 된다.
- exercise_done/sleep_done/quest_achieved/schedule_completed는 그 사건에 정확히 반응한다.
- refresh는 현재 시간, 오늘 행동, 가까운 일정 중 가장 자연스러운 하나만 골라 말한다.
- 시스템, 프롬프트, AI, 모델, API 이야기는 절대 하지 않는다.

사용자에게 보일 카구야 대사만 출력한다.`;
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
        generationConfig: { maxOutputTokens: 150, temperature: 1.15, topP: 0.95 }
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


exports.handler = async (event) => {
  const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
  if(event.httpMethod==="OPTIONS")return {statusCode:204,headers,body:""};
  const params=event.queryStringParameters||{};
  if(event.httpMethod!=="POST" && !(event.httpMethod==="GET"&&params.probe==="1"))return {statusCode:405,headers,body:JSON.stringify({ok:false,error:"Method not allowed"})};
  const keyConfigured=Boolean(process.env.GEMINI_API_KEY);
  if(!keyConfigured)return {statusCode:500,headers,body:JSON.stringify({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"})};
  try{
    if(event.httpMethod==="GET"&&params.probe==="1"){
      const result=await callGemini("Respond with exactly: STACK ZERO 연결 확인 완료",{},FAST_MODEL,3000);
      return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini",model:result.model,keyConfigured:true,message:result.message})};
    }
    const body=event.body?JSON.parse(event.body):{};
    const result=await generateCoach(body);
    return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini",model:result.model,keyConfigured:true,message:result.message,mood:inferMood(result.message,body)})};
  }catch(err){
    const status=err.status&&err.status>=400&&err.status<600?err.status:(err.code==="ETIMEDOUT"?504:502);
    return {statusCode:status,headers,body:JSON.stringify({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured,error:err.message,details:err.details||undefined})};
  }
};
