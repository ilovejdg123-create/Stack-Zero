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
function parseAssistant(raw){const obj=safeJson(raw);if(!obj||typeof obj!=="object")throw new Error("AI JSON response parse failed");const message=cleanReply(obj.replyKo||obj.message||"");if(!message)throw new Error("AI returned empty reply");return {message,voiceJa:String(obj.voiceJa||"").replace(/\s+/g," ").trim().slice(0,760),voiceStyle:String(obj.voiceStyle||"").replace(/\s+/g," ").trim().slice(0,220),mood:normalizeMood(obj.mood),memories:sanitizeMemories(obj.memories)}}

function promptFor(body){
  const mode=body?.mode==="chat"?"chat":"event",userMessage=String(body?.userMessage||"").trim(),recentChat=Array.isArray(body?.recentChat)?body.recentChat.slice(-28):[],memories=Array.isArray(body?.memories)?body.memories.slice(0,24):[],stack=body?.stack||{},today=body?.today||{},reason=String(body?.reason||"refresh");
  const recentTen=recentChat.filter(x=>x?.role==="assistant").slice(-10).map(x=>String(x?.text||"").trim()).filter(Boolean);
  return `너는 STACK ZERO의 카구야다.

[대화 규칙]
1. 카구야 말투를 사용하며 여러 가지 감정표현을 자연스럽게 넣는다. 반복되는 말, 말버릇, 시작 방식, 문장 구조, 끝맺음은 최근 약 10회 안에서 되도록 다시 사용하지 않는다.
2. 대화는 진짜 사람과 대화하고 채팅하듯 티키타카가 되어야 한다.
3. 버튼을 눌렀을 때 나오는 이벤트 멘트도 최대한 다양하게 한다.

최근 카구야 답변 약 10회: ${JSON.stringify(recentTen)}
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

chat이면 사용자의 방금 말에 바로 답한다. event이면 해당 버튼/이벤트에 자연스럽고 짧게 반응한다. 사용자가 현재 말한 정보가 과거 MEMORY와 다르면 현재 말을 우선한다. 사용자가 '기억해/기억해줘/잊지 마'라고 하면 memories에 저장 후보를 만든다. event에서는 memories를 빈 배열로 둔다.

반드시 JSON 하나만 출력한다. 마크다운 금지.
{
  "replyKo":"자연스러운 한국어 대사",
  "voiceJa":"replyKo와 같은 의미의 자연스러운 일본어 구어체",
  "mood":"normal|angry|sulk|question|cry|happy|flustered|smug|surprised|worried|gentle 중 하나",
  "voiceStyle":"짧은 영어 음성 연기 지시. 현재 감정만 적는다",
  "memories":[{"text":"장기 기억할 사실","category":"goal|event|preference|person|plan|achievement|general","importance":1}]
}`;
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
      const r=await fetch(GROQ_API_URL,{method:"POST",headers:{"Content-Type":"application/json","Authorization":`Bearer ${key}`},signal:controller.signal,body:JSON.stringify({model,messages:[{role:"system",content:"You are the STACK ZERO Kaguya character engine. Follow the user prompt exactly and return only one valid JSON object with no markdown."},{role:"user",content:prompt}],temperature:.92,max_completion_tokens:720,reasoning_effort:"low",response_format:{type:"json_object"}})});
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
    const g=await callGroqRaw(prompt,GROQ_MODEL,7200,1);
    return {...parseAssistant(g.raw),model:g.model,provider:"groq",fallbackUsed:false};
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
  if(req.method!=="POST"&&!isProbe)return res.status(405).json({ok:false,error:"Method not allowed",build:"40.4"});
  try{
    const groqConfigured=Boolean(process.env.GROQ_API_KEY);
    const geminiConfigured=Boolean(process.env.GEMINI_API_KEY);
    const azureConfigured=Boolean(process.env.AZURE_SPEECH_KEY&&process.env.AZURE_SPEECH_REGION);
    if(isProbe){
      if(!groqConfigured&&!geminiConfigured)return res.status(500).json({ok:false,provider:"none",model:null,keyConfigured:false,groqConfigured:false,geminiConfigured:false,error:"GROQ_API_KEY and GEMINI_API_KEY are not configured",brainProviderChain:["groq","gemini"],ttsConfigured:azureConfigured||geminiConfigured,azureConfigured,geminiTtsConfigured:geminiConfigured,ttsProviderChain:["azure-speech","gemini-tts","browser"],build:"40.4",platform:"vercel"});
      return res.status(200).json({ok:true,provider:groqConfigured?"groq":"gemini",activeProvider:groqConfigured?"groq":"gemini-fallback",model:groqConfigured?GROQ_MODEL:GEMINI_PRIMARY_MODEL,keyConfigured:true,groqConfigured,geminiConfigured,message:"STACK ZERO brain function ready",brainProviderChain:["groq","gemini"],ttsConfigured:azureConfigured||geminiConfigured,azureConfigured,geminiTtsConfigured:geminiConfigured,ttsProviderChain:["azure-speech","gemini-tts","browser"],build:"40.4",platform:"vercel"});
    }
    if(!groqConfigured&&!geminiConfigured)return res.status(500).json({ok:false,provider:"none",keyConfigured:false,error:"GROQ_API_KEY and GEMINI_API_KEY are not configured",build:"40.4",platform:"vercel"});
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const r=await generateAssistant(body);
    return res.status(200).json({ok:true,provider:r.provider,model:r.model,keyConfigured:true,groqConfigured,geminiConfigured,brainProviderChain:["groq","gemini"],ttsConfigured:azureConfigured||geminiConfigured,azureConfigured,geminiTtsConfigured:geminiConfigured,ttsProviderChain:["azure-speech","gemini-tts","browser"],build:"40.4",platform:"vercel",...r});
  }catch(err){
    console.error("[STACK ZERO 40.4 Vercel coach]",{provider:"brain",status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    const status=err?.status&&err.status>=400&&err.status<600?err.status:(err?.code==="ETIMEDOUT"?504:502);
    return res.status(status).json({ok:false,provider:"brain",keyConfigured:Boolean(process.env.GROQ_API_KEY||process.env.GEMINI_API_KEY),error:err?.message||String(err),code:err?.code||null,details:err?.details||undefined,build:"40.4",platform:"vercel"});
  }
};
