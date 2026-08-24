const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
const FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
const TTS_PROVIDER = "elevenlabs";
const TTS_MODEL = process.env.ELEVENLABS_MODEL_ID || "eleven_flash_v2_5";
const TTS_VOICE_ID = process.env.ELEVENLABS_VOICE_ID || "";
const TTS_OUTPUT_FORMAT = process.env.ELEVENLABS_OUTPUT_FORMAT || "mp3_44100_128";
const ELEVENLABS_API_BASE = "https://api.elevenlabs.io/v1";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";

function stripFence(v){return String(v||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim()}
function cleanReply(v){return String(v||"").replace(/📚+/g,"").replace(/(?:\(〃▽〃\)|\(｡•̀ᴗ-\)✧|\(¬_¬\))/g,"").replace(/\s+/g," ").trim().slice(0,760)}
function textFromGemini(data){return data?.candidates?.[0]?.content?.parts?.map(p=>p?.text||"").join("")||""}
function safeJson(v){try{return JSON.parse(stripFence(v))}catch(e){const m=stripFence(v).match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0])}catch(_){}return null}}
function normalizeMood(v){const m=String(v||"").toLowerCase();return ["angry","sulk","question","cry","normal","happy","flustered","smug","surprised","worried","gentle"].includes(m)?m:"normal"}
function sanitizeMemories(arr){return (Array.isArray(arr)?arr:[]).map(x=>({text:String(x?.text||"").trim().slice(0,500),category:String(x?.category||"general").trim().slice(0,40),importance:Math.max(1,Math.min(5,Number(x?.importance||3)))})).filter(x=>x.text).slice(0,6)}
function parseAssistant(raw){const obj=safeJson(raw);if(!obj||typeof obj!=="object")throw new Error("Gemini JSON response parse failed");const message=cleanReply(obj.replyKo||obj.message||"");if(!message)throw new Error("Gemini returned empty reply");return {message,voiceJa:String(obj.voiceJa||"").replace(/\s+/g," ").trim().slice(0,760),voiceStyle:String(obj.voiceStyle||"").replace(/\s+/g," ").trim().slice(0,220),mood:normalizeMood(obj.mood),memories:sanitizeMemories(obj.memories)}}

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

async function callGeminiRaw(prompt,model,timeoutMs,jsonMode=true,maxRetries=1){
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("GEMINI_API_KEY is not configured");
  let lastErr=null;
  for(let attempt=0;attempt<=maxRetries;attempt++){
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),timeoutMs);
    try{
      const url=`${API_BASE}${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const generationConfig={maxOutputTokens:720,temperature:1.06,topP:.97};
      // Gemini 3.7 no longer needs the old sampling knobs for this use-case.
      // Low thinking keeps chat latency down while preserving character/context quality.
      if(isGemini3(model))generationConfig.thinkingConfig={thinkingLevel:"low"};
      if(jsonMode)generationConfig.responseMimeType="application/json";
      const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},signal:controller.signal,body:JSON.stringify({contents:[{role:"user",parts:[{text:prompt}]}],generationConfig})});
      const data=await r.json().catch(()=>({}));
      if(!r.ok){const e=new Error(data?.error?.message||`Gemini HTTP ${r.status}`);e.status=r.status;e.details=data?.error||data;throw e}
      const raw=textFromGemini(data);if(!raw)throw new Error("Gemini returned no text");return {raw,model};
    }catch(err){
      if(err?.name==="AbortError"){const e=new Error(`Gemini timeout after ${timeoutMs}ms`);e.code="ETIMEDOUT";lastErr=e}else lastErr=err;
      const transient=lastErr?.code==="ETIMEDOUT"||retryableStatus(Number(lastErr?.status||0));
      if(!transient||attempt>=maxRetries)throw lastErr;
      await sleep(Math.round((280*Math.pow(2,attempt))+(Math.random()*220)));
    }finally{clearTimeout(timer)}
  }
  throw lastErr||new Error("Gemini request failed");
}
function canFallback(err){return err?.code==="ETIMEDOUT"||err?.status===404||retryableStatus(Number(err?.status||0))||/parse|empty|no text/i.test(String(err?.message||""))}
function roboticStudyReply(text){
  const t=String(text||"");
  return /(?:STACK|스택)|\d+\s*개|(?:오늘|벌써|지금|현재).{0,10}\d+\s*시간.{0,10}(?:했|했네|했네요|이네|이네요|됐|달성)|또\s*(?:하나|한\s*시간)|확인했|계속하는군|보고\s*있을게|제법이네|제법이네요|잘했어요|오늘\s*꽤/.test(t);
}
async function generateAssistant(body){
  const prompt=promptFor(body);
  const run=async(model,timeout,retries=0)=>{const r=await callGeminiRaw(prompt,model,timeout,true,retries);return {...parseAssistant(r.raw),model:r.model}};
  try{return await run(PRIMARY_MODEL,7000,0)}catch(err){if(FAST_MODEL!==PRIMARY_MODEL&&canFallback(err)){const r=await callGeminiRaw(prompt,FAST_MODEL,5200,true,1);return {...parseAssistant(r.raw),model:r.model}}throw err}
}

function ttsDirection(mood,voiceStyle=""){
  const map={
    angry:"controlled irritation with sharper consonants; emotion clearly audible but still elegant; stronger pitch movement on key words",
    sulk:"slightly sulky and reserved; soft but noticeably displeased; small pauses and expressive sentence endings",
    question:"bright intelligent curiosity with playful teasing; lively Japanese pitch accent and a natural rising nuance",
    cry:"soft and emotionally shaken while trying to stay composed; breathier pauses, fragile but not melodramatic",
    happy:"genuinely delighted and briefly failing to hide it; a clear smile in the voice, brighter upper-mid pitch and quicker emotional timing, then a composed recovery; never childish or squeaky",
    flustered:"visibly embarrassed while trying to preserve composure; a caught breath, brief upward pitch flick, softer evasive ending and small hesitation; elegant rather than childish",
    smug:"playfully smug and teasing; elegant confidence, light laugh in the breath, slightly slower emphasis on punch words",
    surprised:"sudden genuine surprise with one sharp natural pitch jump and quicker first words, then immediate recovery into poised calm speech",
    worried:"quiet concern and seriousness; gentle lowered intensity, careful pacing, warm attentive emphasis",
    gentle:"soft, warm and reassuring; relaxed pacing, tender intonation, subtle smile in the voice",
    normal:"refined, intelligent and youthful; calm with a slightly higher, lighter and more delicate upper-mid register than before; thin but not breathy, clear and poised Japanese pitch contour; restrained at baseline, with natural lively pitch lifts when emotion leaks through; never childish, squeaky, shrill or bubbly"
  };
  const extra=String(voiceStyle||"").trim();
  return `${map[normalizeMood(mood)]||map.normal}${extra?`; scene-specific acting: ${extra}`:""}`;
}
function parseRetryAfterMs(value,message=""){
  const raw=String(value||"").trim();
  if(raw){
    const n=Number(raw);if(Number.isFinite(n)&&n>=0)return Math.round(n*1000);
    const when=Date.parse(raw);if(Number.isFinite(when))return Math.max(0,when-Date.now());
  }
  const m=String(message||"").match(/retry(?:\s+in|\s+after)?\s+([0-9.]+)\s*(ms|milliseconds?|s|sec(?:onds?)?|m|min(?:utes?)?)/i);
  if(m){const n=Number(m[1]);if(Number.isFinite(n)){const u=m[2].toLowerCase();return Math.round(n*(u.startsWith("m")&&!u.startsWith("ms")?60000:u.startsWith("s")?1000:1))}}
  return 0;
}
function elevenLabsVoiceSettings(mood,voiceStyle=""){
  const m=normalizeMood(mood),style=String(voiceStyle||"").toLowerCase();
  let stability=.42,similarity_boost=.78,styleValue=.22,speed=1.0;
  if(["happy","flustered","surprised"].includes(m)){stability=.30;styleValue=.38;speed=1.025}
  else if(m==="smug"){stability=.34;styleValue=.34;speed=.99}
  else if(m==="gentle"){stability=.52;styleValue=.18;speed=.975}
  else if(m==="worried"||m==="cry"){stability=.56;styleValue=.16;speed=.955}
  else if(m==="angry"){stability=.48;styleValue=.30;speed=1.0}
  else if(m==="sulk"){stability=.46;styleValue=.25;speed=.975}
  else if(m==="question"){stability=.38;styleValue=.27;speed=1.01}
  if(/very warm today|high trust|very close|deeply trusted/.test(style)){stability=Math.max(.25,stability-.07);styleValue=Math.min(.48,styleValue+.08);speed=Math.min(1.04,speed+.012)}
  else if(/warm today|clear fondness|growing closeness/.test(style)){stability=Math.max(.28,stability-.035);styleValue=Math.min(.42,styleValue+.045)}
  return {stability,similarity_boost,style:styleValue,use_speaker_boost:true,speed};
}
function elevenLabsRequestBody(text,mood,voiceStyle=""){
  const body={
    text:String(text||"").trim().slice(0,500),
    model_id:TTS_MODEL,
    voice_settings:elevenLabsVoiceSettings(mood,voiceStyle),
    apply_text_normalization:"auto"
  };
  if(TTS_MODEL!=="eleven_multilingual_v2")body.language_code="ja";
  return body;
}
async function elevenLabsFetch(text,mood,voiceStyle="",stream=false){
  const key=process.env.ELEVENLABS_API_KEY;
  if(!key){const e=new Error("ELEVENLABS_API_KEY is not configured");e.status=500;e.code="TTS_NOT_CONFIGURED";throw e}
  if(!TTS_VOICE_ID){const e=new Error("ELEVENLABS_VOICE_ID is not configured");e.status=500;e.code="TTS_VOICE_NOT_CONFIGURED";throw e}
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),16000);
  try{
    const path=stream?"stream":"";
    const url=`${ELEVENLABS_API_BASE}/text-to-speech/${encodeURIComponent(TTS_VOICE_ID)}${path?"/"+path:""}?output_format=${encodeURIComponent(TTS_OUTPUT_FORMAT)}`;
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","Accept":"audio/mpeg","xi-api-key":key},signal:controller.signal,body:JSON.stringify(elevenLabsRequestBody(text,mood,voiceStyle))});
    if(!r.ok){
      const raw=await r.text().catch(()=>"");let details={};try{details=JSON.parse(raw)}catch(_){details={raw:raw.slice(0,500)}}
      const message=details?.detail?.message||details?.detail||details?.message||`ElevenLabs TTS HTTP ${r.status}`;
      const e=new Error(typeof message==="string"?message:JSON.stringify(message));e.status=r.status;e.code=details?.detail?.status||details?.code||"ELEVENLABS_TTS_ERROR";e.details=details;e.retryAfterMs=parseRetryAfterMs(r.headers?.get?.("retry-after"),e.message);throw e;
    }
    return r;
  }catch(err){if(err?.name==="AbortError"){const e=new Error("ElevenLabs TTS timeout");e.status=504;e.code="TIMEOUT";throw e}throw err}
  finally{clearTimeout(timer)}
}
async function generateTTS(text,mood,voiceStyle=""){
  const r=await elevenLabsFetch(text,mood,voiceStyle,false);
  const bytes=Buffer.from(await r.arrayBuffer());
  if(!bytes.length){const e=new Error("ElevenLabs returned no audio");e.status=502;e.code="NO_AUDIO";throw e}
  return {audioBase64:bytes.toString("base64"),mimeType:r.headers.get("content-type")||"audio/mpeg",provider:TTS_PROVIDER,model:TTS_MODEL,voiceId:TTS_VOICE_ID,outputFormat:TTS_OUTPUT_FORMAT,transport:"elevenlabs-http"};
}
async function openTTSStream(text,mood,voiceStyle=""){
  return elevenLabsFetch(text,mood,voiceStyle,true);
}

module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();
  const isProbe=req.method==="GET"&&String(req?.query?.probe||"")==="1";
  if(req.method!=="POST"&&!isProbe)return res.status(405).json({ok:false,error:"Method not allowed",build:"40.2"});
  let body={};
  try{
    if(isProbe){
      if(!process.env.GEMINI_API_KEY)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured",ttsConfigured:Boolean((process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID)||process.env.GEMINI_API_KEY),elevenConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),geminiTtsConfigured:Boolean(process.env.GEMINI_API_KEY),ttsProviderChain:["elevenlabs","gemini-tts","browser"],ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,build:"40.2",platform:"vercel"});
      return res.status(200).json({ok:true,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:true,message:"STACK ZERO Vercel function ready",ttsConfigured:Boolean((process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID)||process.env.GEMINI_API_KEY),elevenConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),geminiTtsConfigured:Boolean(process.env.GEMINI_API_KEY),ttsProviderChain:["elevenlabs","gemini-tts","browser"],ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,build:"40.2",platform:"vercel"});
    }
    body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    if(body.mode==="tts"){
      const r=await generateTTS(body.text,body.mood,body.voiceStyle);
      return res.status(200).json({ok:true,keyConfigured:true,build:"40.2",platform:"vercel",...r});
    }
    if(!process.env.GEMINI_API_KEY)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured",build:"40.2",platform:"vercel"});
    const r=await generateAssistant(body);
    return res.status(200).json({ok:true,provider:"gemini",keyConfigured:true,ttsConfigured:Boolean((process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID)||process.env.GEMINI_API_KEY),elevenConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),geminiTtsConfigured:Boolean(process.env.GEMINI_API_KEY),ttsProviderChain:["elevenlabs","gemini-tts","browser"],ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,ttsVoiceId:TTS_VOICE_ID||null,build:"40.2",platform:"vercel",...r});
  }catch(err){
    const isTts=body?.mode==="tts";
    console.error("[STACK ZERO 40.2 Vercel coach]",{provider:isTts?TTS_PROVIDER:"gemini",mode:isTts?"tts":req.method,status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    const status=err?.status&&err.status>=400&&err.status<600?err.status:(err?.code==="ETIMEDOUT"||err?.code==="TIMEOUT"?504:502);
    return res.status(status).json({ok:false,provider:isTts?TTS_PROVIDER:"gemini",model:isTts?TTS_MODEL:PRIMARY_MODEL,keyConfigured:isTts?Boolean(process.env.ELEVENLABS_API_KEY):Boolean(process.env.GEMINI_API_KEY),error:err?.message||String(err),code:err?.code||null,details:err?.details||undefined,retryAfterMs:Number(err?.retryAfterMs||err?.details?.retryAfterMs||0)||0,build:"40.2",platform:"vercel"});
  }
};
