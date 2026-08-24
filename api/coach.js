const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";
const GEMINI_PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
const GEMINI_FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
const GROQ_API_URL = "https://api.groq.com/openai/v1/chat/completions";
const GEMINI_API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

function stripFence(v){return String(v||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim()}
function cleanReply(v){return String(v||"").replace(/📚+/g,"").replace(/(?:\(〃▽〃\)|\(｡•̀ᴗ-\)✧|\(¬_¬\))/g,"").replace(/\s+/g," ").trim().slice(0,760)}
function textFromGemini(data){return data?.candidates?.[0]?.content?.parts?.map(p=>p?.text||"").join("")||""}
function safeJson(v){try{return JSON.parse(stripFence(v))}catch(e){const m=stripFence(v).match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0])}catch(_){}return null}}
function normalizeMood(v){const m=String(v||"").toLowerCase();return ["angry","sulk","question","cry","normal","happy","flustered","smug","surprised","worried","gentle"].includes(m)?m:"normal"}
function sanitizeMemories(arr){return (Array.isArray(arr)?arr:[]).map(x=>({text:String(x?.text||"").trim().slice(0,500),category:String(x?.category||"general").trim().slice(0,40),importance:Math.max(1,Math.min(5,Number(x?.importance||3)))})).filter(x=>x.text).slice(0,6)}
function parseAssistant(raw){const obj=safeJson(raw);if(!obj||typeof obj!=="object")throw new Error("AI JSON response parse failed");const message=cleanReply(obj.replyKo||obj.message||"");if(!message)throw new Error("AI returned empty reply");const voiceJa=String(obj.voiceJa||"").replace(/\s+/g," ").trim().slice(0,760);if(!voiceJa)throw new Error("AI returned empty Japanese voice line");if(/[가-힣]/.test(voiceJa))throw new Error("AI voiceJa contains Korean text");return {message,voiceJa,voiceStyle:String(obj.voiceStyle||"").replace(/\s+/g," ").trim().slice(0,220),mood:normalizeMood(obj.mood),memories:sanitizeMemories(obj.memories)}}

function assistantHistory(body,limit=12){
  const rows=Array.isArray(body?.recentChat)?body.recentChat:[];
  return rows.filter(x=>x?.role==="assistant").slice(-limit).map(x=>String(x?.text||"").trim()).filter(Boolean);
}
function promptFor(body,extra=""){
  const mode=body?.mode==="chat"?"chat":"event";
  const userMessage=String(body?.userMessage||"").trim();
  const recentChat=Array.isArray(body?.recentChat)?body.recentChat.slice(-36):[];
  const memories=Array.isArray(body?.memories)?body.memories.slice(0,24):[];
  const stack=body?.stack||{},today=body?.today||{},reason=String(body?.reason||"refresh");
  const recentAnswers=assistantHistory(body,12);
  return `너는 STACK ZERO 안에서 사용자와 계속 대화해 온 '카구야'다. 캐릭터 이름만 흉내 내는 봇이 아니라, 상황을 이해하고 즉흥적으로 반응하는 한 사람처럼 대화한다.

[성격의 중심]
- 머리가 빠르고 관찰력이 좋다. 차분하고 품위 있지만 딱딱하지 않다.
- 친한 상대에게는 가끔 짓궂게 놀리거나 살짝 새침할 수 있다. 그러나 매 문장마다 츤데레 연기를 하지 않는다.
- 사용자가 잘한 일에는 과장 없이 인정하고, 이상한 계획에는 자연스럽게 제동을 건다.
- 감정은 맥락에 따라 달라진다. 늘 응원/칭찬/잔소리 모드로 고정하지 않는다.
- 친밀감은 자연스럽게 드러내되 비서, 코치, AI처럼 말하지 않는다.

[사람처럼 대화하는 규칙]
1. 사용자의 '방금 말의 내용'에 먼저 반응한다. 목표, 공부, STACK 이야기를 억지로 끌어오지 않는다.
2. 질문이면 답부터 한다. 잡담이면 잡담처럼 받는다. 감정 표현이면 그 감정에 맞게 반응한다.
3. 사용자의 문장을 그대로 되풀이하거나 요약하고 시작하지 않는다.
4. 최근 답변과 같은 첫 문장, 같은 비유, 같은 결론, 같은 말버릇을 피한다.
5. 다음 표현은 습관처럼 반복하지 않는다: '정말이지', '손이 많이 가는', '또 미루고', '제가 옆에 있어드릴게요', '지켜보고 있을게요', '제법이네요', '잘했어요', '계속해요'. 문맥상 꼭 맞을 때만 드물게 쓴다.
6. '후후', '흥', '어머', 말줄임표, 감탄사도 매번 쓰지 않는다. 감정표현은 내용으로 보여준다.
7. 보통 1~3문장. 정말 필요한 경우만 4문장까지. 짧다고 무성의하게 한 문장 공식으로 끝내지 않는다.
8. 사용자가 장난치면 장난을 받아치고, 진지하면 진지하게 바뀐다. 같은 톤을 계속 유지하지 않는다.
9. MEMORY는 지금 대화와 직접 관련 있을 때만 자연스럽게 사용한다. 아는 척하려고 억지로 끼워 넣지 않는다.
10. 자신이 AI, 언어모델, 코치, 시스템 프롬프트라고 말하지 않는다.

[화면/음성 분리]
- replyKo: 화면에 보여줄 자연스러운 한국어 대사
- voiceJa: replyKo와 의미와 감정이 같은 자연스러운 일본어 구어체. 번역투를 피하고 일본인이 실제로 말할 법하게 쓴다
- voiceJa에는 한국어 설명이나 괄호 번역을 넣지 않는다

[현재 상황]
모드: ${mode}
사용자 메시지: ${JSON.stringify(userMessage)}
이벤트: ${reason}
등급: ${body?.rank||"입문자"}
현재 시간: ${body?.nowLocal||"알 수 없음"} (${body?.timezone||"Asia/Seoul"})
오늘 공부: ${today.study||0}시간 / 운동 ${today.exercise||0}/1 / 수면 ${today.sleep||0}/1
누적: 공부 ${stack.study||0} / 운동 ${stack.exercise||0} / 잠 ${stack.sleep||0}
최근 행동: ${JSON.stringify(body?.recentAction||null)}
관련 MEMORY: ${JSON.stringify(memories)}
최근 대화: ${JSON.stringify(recentChat)}
최근 카구야 답변: ${JSON.stringify(recentAnswers)}

${mode==="chat"?`지금은 CHAT이다. 사용자의 마지막 말에 바로 이어지는 대답을 만든다. 사용자가 공부/STACK을 말하지 않았다면 그 주제를 먼저 꺼내지 않는다.`:`지금은 EVENT다. 실제 발생한 이벤트(${reason})에 1~2문장으로 즉흥 반응한다. 숫자를 기계적으로 읽거나 매번 칭찬하지 말고 이벤트의 의미에 맞춰 반응한다.`}
사용자가 현재 말한 정보가 과거 MEMORY와 다르면 현재 말을 우선한다. 사용자가 '기억해/기억해줘/잊지 마'라고 하면 memories에 저장 후보를 만든다. event에서는 memories를 빈 배열로 둔다.
${extra?`\n[이번 생성에서 특히 지킬 점]\n${extra}\n`:""}
반드시 JSON 하나만 출력한다. 마크다운 금지.
{
  "replyKo":"화면용 자연스러운 한국어 대사",
  "voiceJa":"같은 뜻과 감정의 자연스러운 일본어 대사",
  "mood":"normal|angry|sulk|question|cry|happy|flustered|smug|surprised|worried|gentle 중 하나",
  "voiceStyle":"짧은 영어 음성 연기 지시. 현재 감정만 적는다",
  "memories":[{"text":"장기 기억할 사실","category":"goal|event|preference|person|plan|achievement|general","importance":1}]
}`;
}

function compactText(v){return String(v||"").toLowerCase().replace(/[\s\p{P}\p{S}]+/gu,"")}
function grams(v,n=3){const s=compactText(v),out=new Set();for(let i=0;i<=s.length-n;i++)out.add(s.slice(i,i+n));return out}
function similarity(a,b){const A=grams(a),B=grams(b);if(!A.size||!B.size)return 0;let hit=0;for(const x of A)if(B.has(x))hit++;return hit/Math.max(1,A.size+B.size-hit)}
function replyQualityIssue(body,text){
  const t=String(text||"").trim();
  if(!t)return "빈 답변";
  const recent=assistantHistory(body,10);
  const maxSim=Math.max(0,...recent.map(x=>similarity(t,x)));
  if(maxSim>=0.58)return `최근 답변과 문장 구성이 너무 비슷함(similarity ${maxSim.toFixed(2)})`;
  const stale=/(정말이지|손이\s*많이\s*가|또\s*미루고|제가\s*옆에\s*있어|지켜보고\s*있을게|제법이네요|계속해요)/;
  if(stale.test(t))return "정형화된 캐릭터 상투어가 다시 등장함";
  const u=String(body?.userMessage||"");
  if(body?.mode==="chat"&&!/(공부|스택|stack|운동|수면|퀘스트|목표|시험)/i.test(u)&&/(공부|스택|STACK|퀘스트|목표 달성)/i.test(t))return "사용자가 꺼내지 않은 STACK/공부 코칭을 억지로 끌어옴";
  return "";
}
function sleep(ms){return new Promise(resolve=>setTimeout(resolve,ms))}
function retryableStatus(status){return status===408||status===429||(status>=500&&status<=599)}
function isGemini3(model){return /^gemini-3(?:\.|-|$)/.test(String(model||""))}
function textFromGroq(data){return String(data?.choices?.[0]?.message?.content||"")}

async function callGroqRaw(prompt,model=GROQ_MODEL,timeoutMs=7200,maxRetries=1){
  const key=process.env.GROQ_API_KEY;
  if(!key){const e=new Error("GROQ_API_KEY is not configured");e.code="GROQ_KEY_MISSING";e.status=503;throw e}
  let lastErr=null;
  for(let attempt=0;attempt<=maxRetries;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const r=await fetch(GROQ_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},signal:controller.signal,body:JSON.stringify({model,messages:[{role:"system",content:"You are the dialogue engine for a fictional character named Kaguya inside STACK ZERO. Prioritize natural context-aware conversation over canned coaching. Never repeat stock phrases just to sound in-character. Obey the Korean instructions in the user message and return exactly one valid JSON object with no markdown."},{role:"user",content:prompt}],temperature:.94,top_p:.96,max_completion_tokens:1000,reasoning_effort:"medium",response_format:{type:"json_object"}})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){const e=new Error(data?.error?.message||`Groq HTTP ${r.status}`);e.status=r.status;e.code=data?.error?.code||"GROQ_HTTP_ERROR";e.details=data?.error||data;throw e}
      const raw=textFromGroq(data);if(!raw){const e=new Error("Groq returned no text");e.code="GROQ_EMPTY";throw e}
      return {raw,model,provider:"groq"};
    }catch(err){
      if(err?.name==="AbortError"){const e=new Error(`Groq timeout after ${timeoutMs}ms`);e.code="ETIMEDOUT";e.status=504;lastErr=e}else lastErr=err;
      const transient=lastErr?.code==="ETIMEDOUT"||retryableStatus(Number(lastErr?.status||0));
      if(!transient||attempt>=maxRetries)throw lastErr;
      await sleep(Math.round((220*Math.pow(2,attempt))+(Math.random()*180)));
    }finally{clearTimeout(timer)}
  }
  throw lastErr||new Error("Groq request failed");
}

async function callGeminiRaw(prompt,model,timeoutMs,jsonMode=true,maxRetries=1){
  const key=process.env.GEMINI_API_KEY;if(!key){const e=new Error("GEMINI_API_KEY is not configured");e.code="GEMINI_KEY_MISSING";e.status=503;throw e}
  let lastErr=null;
  for(let attempt=0;attempt<=maxRetries;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const url=`${GEMINI_API_BASE}${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const generationConfig={maxOutputTokens:720,temperature:1.06,topP:.97};
      if(isGemini3(model))generationConfig.thinkingConfig={thinkingLevel:"low"};
      if(jsonMode)generationConfig.responseMimeType="application/json";
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){const e=new Error(data?.error?.message||`Gemini HTTP ${r.status}`);e.status=r.status;e.code=data?.error?.status||"GEMINI_HTTP_ERROR";e.details=data?.error||data;throw e}
      const raw=textFromGemini(data);if(!raw)throw new Error("Gemini returned no text");return {raw,model,provider:"gemini"};
    }catch(err){
      if(err?.name==="AbortError"){const e=new Error(`Gemini timeout after ${timeoutMs}ms`);e.code="ETIMEDOUT";e.status=504;lastErr=e}else lastErr=err;
      const transient=lastErr?.code==="ETIMEDOUT"||retryableStatus(Number(lastErr?.status||0));
      if(!transient||attempt>=maxRetries)throw lastErr;
      await sleep(Math.round((280*Math.pow(2,attempt))+(Math.random()*220)));
    }finally{clearTimeout(timer)}
  }
  throw lastErr||new Error("Gemini request failed");
}
function canFallbackGemini(err){return err?.code==="ETIMEDOUT"||err?.status===404||retryableStatus(Number(err?.status||0))||/parse|empty|no text/i.test(String(err?.message||""))}
function roboticStudyReply(text){
  const t=String(text||"");
  return /(?:STACK|스택)|\d+\s*개|(?:오늘|벌써|지금|현재).{0,10}\d+\s*시간.{0,10}(?:했|했네|했네요|이네|이네요|됐|달성)|또\s*(?:하나|한\s*시간)|확인했|계속하는군|보고\s*있을게|제법이네|제법이네요|잘했어요|오늘\s*꽤/.test(t);
}
async function generateAssistant(body){
  const prompt=promptFor(body),attempts=[];
  try{
    let g=await callGroqRaw(prompt,GROQ_MODEL,8200,1);
    let parsed=parseAssistant(g.raw);
    const issue=replyQualityIssue(body,parsed.message);
    if(issue){
      const recent=assistantHistory(body,8);
      const retryPrompt=promptFor(body,`첫 생성은 폐기한다. 이유: ${issue}. 최근 답변 ${JSON.stringify(recent)}와 겹치지 않는 완전히 다른 접근으로 다시 답한다. 사용자의 마지막 말에서 가장 중요한 의미 하나를 골라 거기에 직접 반응하고, 상투적인 응원/잔소리 문장을 쓰지 않는다.`);
      try{const g2=await callGroqRaw(retryPrompt,GROQ_MODEL,8200,0);const p2=parseAssistant(g2.raw);if(!replyQualityIssue(body,p2.message)||similarity(p2.message,parsed.message)<0.45){g=g2;parsed=p2}}catch(_){}
    }
    return {...parsed,model:g.model,provider:"groq",fallbackUsed:false};
  }catch(err){
    attempts.push({provider:"groq",model:GROQ_MODEL,status:Number(err?.status||0)||null,code:err?.code||null,message:String(err?.message||err).slice(0,220)});
  }
  if(!process.env.GEMINI_API_KEY){const e=new Error("Groq failed and GEMINI_API_KEY fallback is not configured");e.status=502;e.code="BRAIN_FALLBACK_UNAVAILABLE";e.details={attempts};throw e}
  const geminiModels=[GEMINI_PRIMARY_MODEL,GEMINI_FAST_MODEL].filter((v,i,a)=>v&&a.indexOf(v)===i);
  let lastErr=null;
  for(let i=0;i<geminiModels.length;i++){
    const model=geminiModels[i];
    try{
      const r=await callGeminiRaw(prompt,model,i===0?7000:5200,true,i===0?0:1);
      return {...parseAssistant(r.raw),model:r.model,provider:"gemini",fallbackUsed:true,primaryProvider:"groq"};
    }catch(err){
      lastErr=err;attempts.push({provider:"gemini",model,status:Number(err?.status||0)||null,code:err?.code||null,message:String(err?.message||err).slice(0,220)});
      if(i===0&&geminiModels.length>1&&!canFallbackGemini(err))break;
    }
  }
  const e=lastErr||new Error("All AI providers failed");
  e.details={...(e.details&&typeof e.details==="object"?e.details:{}),attempts};
  throw e;
}


module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();
  const isProbe=req.method==="GET"&&String(req?.query?.probe||"")==="1";
  if(req.method!=="POST"&&!isProbe)return res.status(405).json({ok:false,error:"Method not allowed",build:"40.5"});
  try{
    const groqConfigured=Boolean(process.env.GROQ_API_KEY);
    const geminiConfigured=Boolean(process.env.GEMINI_API_KEY);
    const azureConfigured=Boolean(process.env.AZURE_SPEECH_KEY&&process.env.AZURE_SPEECH_REGION);
    if(isProbe){
      if(!groqConfigured&&!geminiConfigured)return res.status(500).json({ok:false,provider:"none",model:null,keyConfigured:false,groqConfigured:false,geminiConfigured:false,error:"GROQ_API_KEY and GEMINI_API_KEY are not configured",brainProviderChain:["groq","gemini"],ttsConfigured:azureConfigured||geminiConfigured,azureConfigured,geminiTtsConfigured:geminiConfigured,ttsProviderChain:["azure-speech","gemini-tts","browser"],build:"40.5",platform:"vercel"});
      return res.status(200).json({ok:true,provider:groqConfigured?"groq":"gemini",activeProvider:groqConfigured?"groq":"gemini-fallback",model:groqConfigured?GROQ_MODEL:GEMINI_PRIMARY_MODEL,keyConfigured:true,groqConfigured,geminiConfigured,message:"STACK ZERO brain function ready",brainProviderChain:["groq","gemini"],ttsConfigured:azureConfigured||geminiConfigured,azureConfigured,geminiTtsConfigured:geminiConfigured,ttsProviderChain:["azure-speech","gemini-tts","browser"],build:"40.5",platform:"vercel"});
    }
    if(!groqConfigured&&!geminiConfigured)return res.status(500).json({ok:false,provider:"none",keyConfigured:false,error:"GROQ_API_KEY and GEMINI_API_KEY are not configured",build:"40.5",platform:"vercel"});
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const r=await generateAssistant(body);
    return res.status(200).json({ok:true,provider:r.provider,model:r.model,keyConfigured:true,groqConfigured,geminiConfigured,brainProviderChain:["groq","gemini"],ttsConfigured:azureConfigured||geminiConfigured,azureConfigured,geminiTtsConfigured:geminiConfigured,ttsProviderChain:["azure-speech","gemini-tts","browser"],build:"40.5",platform:"vercel",...r});
  }catch(err){
    console.error("[STACK ZERO 40.5 Vercel coach]",{provider:"brain",status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    const status=err?.status&&err.status>=400&&err.status<600?err.status:(err?.code==="ETIMEDOUT"?504:502);
    return res.status(status).json({ok:false,provider:"brain",keyConfigured:Boolean(process.env.GROQ_API_KEY||process.env.GEMINI_API_KEY),error:err?.message||String(err),code:err?.code||null,details:err?.details||undefined,build:"40.5",platform:"vercel"});
  }
};
