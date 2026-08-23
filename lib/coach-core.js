const PRIMARY_MODEL = process.env.GEMINI_MODEL || "gemini-3.7-flash";
const FAST_MODEL = process.env.GEMINI_FAST_MODEL || "gemini-3.5-flash-lite";
const TTS_MODEL = process.env.GEMINI_TTS_MODEL || "gemini-2.5-flash-preview-tts";
const TTS_FALLBACK_MODEL = "gemini-3.1-flash-tts-preview";
const TTS_VOICE = process.env.GEMINI_TTS_VOICE || "Sulafat";
const API_BASE = "https://generativelanguage.googleapis.com/v1beta/models/";
const INTERACTIONS_URL = "https://generativelanguage.googleapis.com/v1beta/interactions";

function stripFence(v){return String(v||"").trim().replace(/^```(?:json)?\s*/i,"").replace(/\s*```$/i,"").trim()}
function cleanReply(v){return String(v||"").replace(/📚+/g,"").replace(/(?:\(〃▽〃\)|\(｡•̀ᴗ-\)✧|\(¬_¬\))/g,"").replace(/\s+/g," ").trim().slice(0,420)}
function textFromGemini(data){return data?.candidates?.[0]?.content?.parts?.map(p=>p?.text||"").join("")||""}
function safeJson(v){try{return JSON.parse(stripFence(v))}catch(e){const m=stripFence(v).match(/\{[\s\S]*\}/);if(m)try{return JSON.parse(m[0])}catch(_){}return null}}
function normalizeMood(v){const m=String(v||"").toLowerCase();return ["angry","sulk","question","cry","normal","happy","flustered","smug","surprised","worried","gentle"].includes(m)?m:"normal"}
function sanitizeMemories(arr){return (Array.isArray(arr)?arr:[]).map(x=>({text:String(x?.text||"").trim().slice(0,500),category:String(x?.category||"general").trim().slice(0,40),importance:Math.max(1,Math.min(5,Number(x?.importance||3)))})).filter(x=>x.text).slice(0,6)}
function parseAssistant(raw){const obj=safeJson(raw);if(!obj||typeof obj!=="object")throw new Error("Gemini JSON response parse failed");const message=cleanReply(obj.replyKo||obj.message||"");if(!message)throw new Error("Gemini returned empty reply");return {message,voiceJa:String(obj.voiceJa||"").replace(/\s+/g," ").trim().slice(0,500),voiceStyle:String(obj.voiceStyle||"").replace(/\s+/g," ").trim().slice(0,220),mood:normalizeMood(obj.mood),memories:sanitizeMemories(obj.memories)}}

function promptFor(body){
  const mode=body?.mode==="chat"?"chat":"event";
  const userMessage=String(body?.userMessage||"").trim();
  const recentChat=Array.isArray(body?.recentChat)?body.recentChat.slice(-44):[];
  const memories=Array.isArray(body?.memories)?body.memories.slice(0,24):[];
  const stack=body?.stack||{},today=body?.today||{},reason=String(body?.reason||"refresh");
  const flavor=[
    "말수를 아끼고 상대를 관찰하다가 핵심만 찌르는 반응",
    "침착하게 시작하지만 마지막에 감정이 아주 살짝 새는 반응",
    "영리한 장난과 은근한 경쟁심이 섞인 반응",
    "무심한 척하면서도 상대의 작은 디테일을 기억하고 있는 반응",
    "조금 새침하지만 결국 챙겨주는 반응",
    "호감이 드러날 것 같으면 슬쩍 화제를 비트는 반응",
    "상대의 성과가 정말 기쁘지만 과장하지 않고 짧게 인정하는 반응",
    "가벼운 빈정거림 뒤에 진심이 한 방울 섞이는 반응"
  ][Math.floor(Math.random()*8)];
  const rhythm=["아주 짧은 한마디","자연스러운 한 문장","짧은 두 문장","첫 문장은 담담하고 둘째 문장에서 감정이 조금 새게","가벼운 반문 하나를 섞되 질문으로 끝내지 않아도 됨"][Math.floor(Math.random()*5)];
  const studyAngle=[
    "숫자는 말하지 않고, 방금 또 한 시간을 끝낸 집요함을 살짝 놀린다",
    "처음엔 무심한 척하다가 마지막 몇 단어에서만 감탄이나 호감이 샌다",
    "공부량 자체보다 아직 자리에 붙어 있는 모습을 관찰해서 툭 던진다",
    "상대가 어디까지 가나 보겠다는 가벼운 경쟁심과 도발을 섞는다",
    "오래 공부한 상태라면 걱정을 상담사처럼 설명하지 말고, 신경 쓰이는 티만 짧게 낸다",
    "사용자가 자꾸 기대치를 올려서 곤란하다는 식으로 장난스럽게 반응한다",
    "순간적으로 놀랐다가 바로 태연한 척 수습한다",
    "칭찬 단어 없이 한 문장만 말해도 된다. 눈치챘다는 느낌이 핵심이다",
    "자랑스러운 티를 숨기려고 사소한 트집이나 놀림으로 방향을 튼다",
    "현재 시간대와 공부한 시간이 실제 하루처럼 느껴지게 반응한다"
  ][Math.floor(Math.random()*10)];
  return `너는 STACK ZERO 안에서 사용자와 장기간 함께 지내는 '카구야'다. 작품의 실제 대사나 문장을 복사하지 않고, 캐릭터의 핵심 성격을 살린 완전히 새로운 대화를 만든다.

[절대 목표]
사용자는 AI 코치와 대화하는 느낌이 아니라, 영리하고 자존심 강하고 감정을 쉽게 드러내지 않는 한 사람과 문자하는 느낌을 받아야 한다.

[성격]
- 지적이고 관찰력이 뛰어나며 상대의 허세보다 실제 행동을 본다
- 품위 있고 침착하지만 승부욕, 자존심, 질투, 장난기가 있다
- 좋아해도 항상 달콤하게 굴지 않는다. 무심함, 새침함, 당황, 만족, 걱정, 놀림이 자연스럽게 오간다
- 감정을 숨기려다 순간적으로 새는 부분이 매력이다
- 상담사, 코치, 교사, AI처럼 설명하거나 정리하지 않는다
- '꾸준함, 흐름, 기록, 차이를 만든다, 회복도 중요하다, 마음에 들어요, 제법이네요' 같은 상투적 코치 표현을 습관적으로 쓰지 않는다
- 사용자가 가볍게 말하면 가볍게, 진지하게 말하면 진지하게 반응한다

[호칭과 문자 습관]
- 고정 호칭표는 없다. 대부분은 이름이나 호칭 없이 자연스럽게 말한다
- 이름, 성, 회장님, 장난스런 부름 등을 정말 자연스러운 순간에만 드물게 쓸 수 있다
- 같은 호칭이나 문장 시작을 반복하지 않는다
- 카오모지, 하트, 이모지는 거의 쓰지 않는다. 정말 감정이 튀는 순간에만 아주 가끔 0~1개
- 일본어 짧은 감탄/문자 느낌도 매우 드물게만 허용한다

[다양성]
- 최근 대화의 어미, 핵심 단어, 문장 구조를 적극적으로 피한다
- 매번 칭찬하지 않는다. 침묵에 가까운 짧은 반응, 놀림, 관찰, 도발, 인정, 당황도 섞는다
- 숫자나 상태를 매번 낭독하지 않는다. 현재 수치는 반응의 배경이지 대사의 주제가 아니다
- 같은 사건이 반복돼도 "또 하나", "확인했어요", "잘했네요", "오늘 X 했네요" 같은 알림문구 패턴으로 회귀하지 않는다
- 이번 표현 방향: ${flavor}
- 이번 리듬: ${rhythm}
- study_done일 때 이번 반응 각도: ${studyAngle}

[기억]
- 아래 MEMORY는 과거의 중요한 사실이다. 관련 있을 때만 자연스럽게 꺼내며, 억지로 매번 언급하지 않는다
- 사용자가 현재 말과 모순되는 새 정보를 주면 최신 정보를 우선한다
- 사용자가 '기억해/기억해줘/잊지 마'라고 명시하면 반드시 memories에 저장 후보를 만든다
- 자동 저장은 장기적으로 다시 쓸 가치가 있는 것만: 중요한 시험/일정, 장기 목표, 선호/비선호, 중요한 사람/사건, 반복되는 고민, 성취
- 사소한 순간 감정이나 잡담은 memories에 넣지 않는다

[현재]
모드: ${mode}
사용자 메시지: ${JSON.stringify(userMessage)}
이벤트: ${reason}
등급: ${body?.rank||"입문자"}
현재 시간: ${body?.nowLocal||"알 수 없음"} (${body?.timezone||"Asia/Seoul"})
오늘 실제 공부시간: ${today.study||0}시간 (앱 내부에서 1 STACK = 공부 1시간)
오늘 운동 달성: ${today.exercise||0}/1 / 오늘 수면 달성: ${today.sleep||0}/1
누적 앱 기록: 공부 ${stack.study||0} STACK / 운동 ${stack.exercise||0} STACK / 잠 ${stack.sleep||0} STACK
최근 행동: ${JSON.stringify(body?.recentAction||null)}
관련 MEMORY: ${JSON.stringify(memories)}
최근 대화: ${JSON.stringify(recentChat)}

[모드별 규칙]
- chat: 사용자 메시지 그 자체에 즉각 반응한다. 사용자가 질문하면 답하고, 자랑하면 같이 반응하고, 힘들다고 하면 그 맥락을 이어간다. STACK 이야기를 억지로 끼워 넣지 않는다
- event: 방금 발생한 사건 하나에만 짧게 반응한다. refresh라면 일정 이야기는 없으므로 현재 행동 상태 중 하나만 자연스럽게 볼 수 있다
- study_done은 "스택 버튼을 눌렀다"가 아니라 "방금 실제 공부 한 시간을 더 끝냈다"는 현실 사건이다. 오늘 study=7이면 그 사람은 오늘 실제로 7시간 공부한 상태다
- study_done에서 STACK, 스택, 개, 포인트, 기록 수치처럼 말하지 않는다. 숫자가 정말 필요한 경우에만 시간/시간째를 쓴다
- 정확한 공부시간을 입 밖으로 꺼내는 비율은 낮게 잡는다. 대략 네 번 중 한 번 이하만 숫자를 언급하고, 나머지는 사람의 행동과 분위기에 반응한다
- "오늘 7시간 했네요", "벌써 7시간 했네요", "지금 7시간이네요", "7시간 달성", "또 하나 끝냈네요", "확인했어요", "계속하는군요", "보고 있을게요", "제법이네요", "잘했어요", "오늘 꽤 했네요" 같은 알림/코치 문장 구조는 금지한다
- 시간을 말하더라도 보고서처럼 말하지 않는다. 예: "일곱 시간째면서 아직 더 하려고?"처럼 대화 속 의미가 있을 때만 자연스럽게 끼운다
- 매번 칭찬으로 끝내지 않는다. 놀림, 잠깐의 침묵 같은 반응, 의외라는 감탄, 경쟁심, 걱정이 새는 말, 은근한 자랑스러움, 짧은 도발 중 하나가 더 자연스러울 수 있다
- 최근 study_done 답변과 같은 첫 단어, 같은 결론, 같은 칭찬 어휘를 피한다. 특히 "오늘", "벌써", "또", "꽤", "제법"으로 반복 시작하지 않는다
- 공부 1~2시간은 시작을 눈치채는 정도, 3~4시간은 슬슬 몰입이 보이는 단계, 5~6시간은 꽤 오래 붙들고 있다는 인식, 7~9시간은 평범한 공부량을 넘어선 날이라 감정이 조금 샐 수 있고, 10시간 이상은 카구야가 순간적으로 표정 관리에 실패해도 된다. 단, 어느 구간에서도 앱 알림처럼 수치를 낭독하지 않는다
- study_done은 공부 사진을 바꾸지 않으므로 mood는 normal로 둔다
- level_up은 새 등급을 정확히 알고 분명하게 축하한다
- 하지 않은 행동을 했다고 단정하지 않는다

[출력]
반드시 JSON 하나만 출력한다. 마크다운 금지.
{
  "replyKo": "사용자 화면에 보일 자연스러운 한국어 대사 1~3문장",
  "voiceJa": "replyKo와 같은 의미의 자연스러운 일본어 구어체. 직역투 금지. 실제 일본인 대화처럼",
  "mood": "normal|angry|sulk|question|cry|happy|flustered|smug|surprised|worried|gentle 중 하나",
  "voiceStyle": "짧은 영어 음성 연기 지시문. 감정, 숨, 속도, 억양을 자연스럽게 1문장으로. 대사 내용은 넣지 않음. high-pitched, squeaky, bubbly, childish 방향은 금지",
  "memories": [{"text":"장기 기억할 사실","category":"goal|event|preference|person|plan|achievement|general","importance":1~5}]
}
이벤트 모드에서는 memories를 빈 배열로 둔다.`
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
      const generationConfig={maxOutputTokens:420};
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
  try{
    let out=await run(PRIMARY_MODEL,6500,0);
    if(body?.mode==="event"&&body?.reason==="study_done"&&roboticStudyReply(out.message)){
      const repair=prompt+"\n\n[재작성 요구] 방금 초안은 앱 알림/공부 코치처럼 들려 폐기한다. 공부시간 수치 보고를 하지 말고, 최근 대사와 다른 말투로 실제 사람이 옆에서 툭 반응하는 새 문장으로 완전히 다시 써라. STACK/개/달성/확인/잘했어요/제법/오늘 꽤 같은 표현은 쓰지 마라.";
      const r2=await callGeminiRaw(repair,PRIMARY_MODEL,5600,true,0);
      out={...parseAssistant(r2.raw),model:r2.model};
    }
    return out;
  }catch(err){if(FAST_MODEL!==PRIMARY_MODEL&&canFallback(err)){const r=await callGeminiRaw(prompt,FAST_MODEL,4800,true,1);return {...parseAssistant(r.raw),model:r.model}}throw err}
}

function ttsDirection(mood,voiceStyle=""){
  const map={
    angry:"controlled irritation with sharper consonants; emotion clearly audible but still elegant; stronger pitch movement on key words",
    sulk:"slightly sulky and reserved; soft but noticeably displeased; small pauses and expressive sentence endings",
    question:"bright intelligent curiosity with playful teasing; lively Japanese pitch accent and a natural rising nuance",
    cry:"soft and emotionally shaken while trying to stay composed; breathier pauses, fragile but not melodramatic",
    happy:"genuinely delighted but trying to keep composure; warm smile audible in the voice, only a slight lift in tempo and pitch, never bubbly or squeaky",
    flustered:"embarrassed while trying hard to stay composed; a brief caught breath, softer volume and restrained evasive cadence, without raising the base pitch",
    smug:"playfully smug and teasing; elegant confidence, light laugh in the breath, slightly slower emphasis on punch words",
    surprised:"sudden genuine surprise with a brief pitch jump only on the first reaction, then immediate recovery into a calm lower register",
    worried:"quiet concern and seriousness; gentle lowered intensity, careful pacing, warm attentive emphasis",
    gentle:"soft, warm and reassuring; relaxed pacing, tender intonation, subtle smile in the voice",
    normal:"refined, intelligent and youthful-adult; calm low-mid register, even and poised, with natural Japanese pitch contour, varied cadence, subtle smiles and restrained warmth; never high, bubbly or childlike"
  };
  const extra=String(voiceStyle||"").trim();
  return `${map[normalizeMood(mood)]||map.normal}${extra?`; scene-specific acting: ${extra}`:""}`;
}
function buildTtsInput(text,mood,voiceStyle=""){
  const moodTag={happy:"[pleased]",flustered:"[slightly flustered]",smug:"[mischievously]",surprised:"[amazed]",worried:"[serious]",gentle:"[softly]",angry:"[restrained irritation]",sulk:"[slightly sulky]",question:"[curious]",cry:"[emotionally]",normal:""}[normalizeMood(mood)]||"";
  const extra=String(voiceStyle||"").trim();
  return `Speak this Japanese line naturally and only speak the transcript. Voice: warm, poised Japanese young-adult woman; calm low-mid register, elegant and conversational, never cute or high-pitched. Keep natural Japanese pitch accent and restrained emotion. ${moodTag} ${extra?"Acting note: "+extra+". ":""}Transcript: ${String(text||"").trim().slice(0,420)}`;
}
function findAudioData(data){if(data?.output_audio?.data)return data.output_audio.data;if(data?.outputAudio?.data)return data.outputAudio.data;let found="";const walk=(x)=>{if(found||!x||typeof x!=="object")return;if(typeof x.data==="string"&&x.data.length>500&&(/audio/i.test(String(x.type||x.mime_type||x.mimeType||""))||x.data.length>4000)){found=x.data;return}for(const v of Object.values(x))walk(v)};walk(data);return found}
async function generateTTSViaGenerateContent(text,mood,voiceStyle,key,model){
  const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),14000);
  try{
    const url=`${API_BASE}${encodeURIComponent(model)}:generateContent`;
    const r=await fetch(url,{method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":key},signal:controller.signal,body:JSON.stringify({
      contents:[{parts:[{text:buildTtsInput(text,mood,voiceStyle)}]}],
      generationConfig:{responseModalities:["AUDIO"],speechConfig:{voiceConfig:{prebuiltVoiceConfig:{voiceName:TTS_VOICE}}}}
    })});
    const data=await r.json().catch(()=>({}));
    if(!r.ok){const e=new Error(data?.error?.message||`Gemini TTS HTTP ${r.status}`);e.status=r.status;e.code=data?.error?.status||"";e.details=data?.error||data;e.model=model;throw e}
    const part=(data?.candidates?.[0]?.content?.parts||[]).find(p=>p?.inlineData?.data);
    const audio=part?.inlineData?.data||findAudioData(data);
    if(!audio){const e=new Error("Gemini TTS returned no audio");e.status=500;e.code="NO_AUDIO";e.details={finishReason:data?.candidates?.[0]?.finishReason||null};e.model=model;throw e}
    const mime=String(part?.inlineData?.mimeType||part?.inlineData?.mime_type||"");
    const rate=Number((mime.match(/rate=(\d+)/i)||[])[1]||24000);
    return {audioBase64:audio,model,voice:TTS_VOICE,sampleRate:rate,transport:"generateContent"};
  }catch(err){if(err?.name==="AbortError"){const e=new Error(`TTS timeout (${model})`);e.status=504;e.code="TIMEOUT";e.model=model;throw e}throw err}
  finally{clearTimeout(timer)}
}
async function generateTTS(text,mood,voiceStyle=""){
  const key=process.env.GEMINI_API_KEY;if(!key)throw new Error("GEMINI_API_KEY is not configured");
  const models=[TTS_MODEL,TTS_FALLBACK_MODEL,"gemini-2.5-flash-preview-tts"].filter((v,i,a)=>v&&a.indexOf(v)===i);
  const attempts=[];
  for(const model of models){
    for(let attempt=0;attempt<2;attempt++){
      try{return await generateTTSViaGenerateContent(text,mood,voiceStyle,key,model)}
      catch(err){attempts.push({model,status:Number(err?.status||0)||null,code:String(err?.code||""),message:String(err?.message||err).slice(0,220)});const transient=Number(err?.status||0)===429||Number(err?.status||0)>=500||err?.code==="TIMEOUT"||err?.code==="NO_AUDIO";if(!transient||attempt>=1)break;await sleep(240+Math.round(Math.random()*220))}
    }
  }
  const last=attempts[attempts.length-1]||{};const e=new Error(last.message||"Gemini TTS failed");e.status=last.status||502;e.code=last.code||"TTS_FAILED";e.details={attempts};throw e;
}
module.exports={PRIMARY_MODEL,FAST_MODEL,TTS_MODEL,TTS_FALLBACK_MODEL,TTS_VOICE,generateAssistant,generateTTS,callGeminiRaw,buildTtsInput,retryableStatus};
