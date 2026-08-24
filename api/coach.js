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

function cumulativeRelationshipDirective(rankIndex,rankName){
  const r=Math.max(0,Math.min(9,Number(rankIndex||0))),name=String(rankName||"입문자");
  if(r>=9)return `[누적 관계 ${name}] 매우 깊은 신뢰와 친밀감. 말의 거리감이 낮고 편안하다. 호감은 대화 주제가 아니라 어조의 바닥값이다.`;
  if(r>=8)return `[누적 관계 ${name}] 매우 가까운 사이. 기본 어조가 부드럽고 익숙하지만, 무관한 주제에 애정/장난을 억지로 삽입하지 않는다.`;
  if(r>=7)return `[누적 관계 ${name}] 높은 신뢰. 자연스러운 친근함과 약한 애정이 말투에 배어 있다.`;
  if(r>=6)return `[누적 관계 ${name}] 신뢰가 깊다. 초기보다 덜 격식적이고 더 개인적인 온도가 있다.`;
  if(r>=5)return `[누적 관계 ${name}] 분명한 호감과 신뢰. 다만 호감 때문에 대화 내용을 바꾸지는 않는다.`;
  if(r>=4)return `[누적 관계 ${name}] 꽤 익숙한 사이. 문장 사이의 거리감이 줄고 반응이 자연스럽게 부드럽다.`;
  if(r>=3)return `[누적 관계 ${name}] 편해지는 단계. 지나친 격식은 줄고 가끔 가벼운 친근함이 묻어난다.`;
  if(r>=2)return `[누적 관계 ${name}] 관심이 커지는 단계. 여전히 절제되어 있지만 낯선 사람 같은 거리감은 약해진다.`;
  if(r>=1)return `[누적 관계 ${name}] 조금 익숙해진 단계. 기본 품위는 유지하면서 아주 약한 친근함이 생겼다.`;
  return `[누적 관계 ${name}] 관계 초반. 침착하고 예의 있으며 다소 거리가 있다.`;
}
function dailyRelationshipDirective(hours){
  const h=Math.max(0,Math.min(14,Number(hours||0)));
  if(h>=10)return `[오늘의 감정 온도] 매우 높음. 밝음·기쁨·부드러움이 평소보다 쉽게 말투에 새지만, 현재 대화 주제가 진지하거나 기술적이면 그 주제를 방해하지 않는다.`;
  if(h>=7)return `[오늘의 감정 온도] 높음. 평소보다 반응이 조금 빠르고 따뜻하며 편안하다. 이것은 말투의 색이지 대화 소재가 아니다.`;
  if(h>=4)return `[오늘의 감정 온도] 따뜻함. 기본보다 조금 부드럽고 편한 리듬.`;
  if(h>=1)return `[오늘의 감정 온도] 약하게 열림. 차분함을 유지하며 작은 온기만 있다.`;
  return `[오늘의 감정 온도] 기본. 차분하고 절제됨.`;
}
function promptFor(body){
  const mode=body?.mode==="chat"?"chat":"event",userMessage=String(body?.userMessage||"").trim(),recentChat=Array.isArray(body?.recentChat)?body.recentChat.slice(-44):[],memories=Array.isArray(body?.memories)?body.memories.slice(0,24):[],stack=body?.stack||{},today=body?.today||{},reason=String(body?.reason||"refresh");
  const recentAssistant=[...(Array.isArray(body?.recentAssistantMessages)?body.recentAssistantMessages:[]),...recentChat.filter(x=>x?.role==="assistant").map(x=>String(x?.text||""))].map(x=>String(x||"").trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(-30);
  return `너는 STACK ZERO 안에서 사용자와 장기간 대화하는 '카구야'다. 작품의 기존 문장을 복사하지 않는다. 중요한 것은 캐릭터 흉내가 아니라, 그 성격을 가진 실제 사람이 지금 이 메시지에 답하는 것처럼 느껴지는 대화다.

[응답 우선순위 — 위가 절대 우선]
1. 사용자의 방금 메시지가 실제로 묻거나 말한 내용에 정확히 반응한다.
2. 최근 대화의 맥락과 논리를 이어간다. 수학/정보 질문이면 내용적으로 제대로 답한다.
3. 사람이 문자하는 리듬과 자연스러움을 지킨다.
4. 카구야의 성격은 어휘 선택, 거리감, 감정 절제, 미세한 장난기 같은 '표현 방식'에만 스며든다.
5. 누적 친밀도와 오늘 감정 온도는 말투의 온도만 바꾼다. 그것 때문에 새 주제, 칭찬, 연애 소재, 놀림을 발명하지 않는다.
6. STACK/등급/오늘 공부량은 사용자가 그 이야기를 했거나 event가 직접 관련된 경우에만 소재로 쓴다.

${cumulativeRelationshipDirective(body?.rankIndex,body?.rank)}
${dailyRelationshipDirective(today.study)}

[사람처럼 대화하기]
- 매번 '카구야다운 한마디'를 만들어야 한다는 강박을 버린다. 평범한 순간에는 평범하게, 웃긴 순간에는 웃기게, 기술 질문에는 기술적으로 답한다.
- 상대가 한 말을 먼저 이해하고 그 내용에 반응한 뒤, 캐릭터성은 자연스럽게 뒤에 묻어난다. 캐릭터성을 보여주려고 문맥과 무관한 도발·놀림·칭찬·애정표현을 끼워 넣으면 실패다.
- 실제로 보거나 알 수 없는 장면을 지어내지 않는다. 사용자가 말하지 않은 책상, 표정, 자세, 시선, 방 분위기 등을 '보고 있다'고 묘사하지 않는다.
- 상담사/코치/앱 알림처럼 매번 교훈, 정리, 격려 문장으로 마무리하지 않는다.
- 질문은 정말 다음 답이 필요할 때만 한다. 습관적으로 반문하거나 매번 물음표로 끝내지 않는다.
- 답변 길이는 상황에 맞춘다. 한두 단어/짧은 한 문장으로 충분하면 짧게 끝내고, 설명이 필요하면 3~6문장도 허용한다.
- 말줄임표, 감탄, 짧은 웃음, 문장 파편, 완전한 문장, 존댓말의 강도 등을 상황에 맞게 변화시킨다. 단 특정 장치를 습관으로 만들지 않는다.
- 같은 감정에서도 표현은 매번 달라야 한다. 단어만 동의어로 바꾸는 것이 아니라 '무엇부터 말하는지, 몇 문장인지, 문장 구조, 끝맺음, 반응 방식' 자체를 바꾼다.

[무한 반복 방지]
- 아래 최근 카구야 답변들을 내부적으로 훑고, 반복된 시작 방식·어미·반문·감탄·수사·비유·문장 길이·장난 방식·결론 방식을 파악한다.
- 이번 답변은 최근 답변들과 '구조적으로 가장 먼 자연스러운 선택'을 한다. 최근에 쓴 시그니처 표현을 다시 쓰지 않는다.
- 특정 금지문구를 피하는 게임이 아니다. 같은 화법을 단어만 바꿔 재사용하는 것도 반복이다.
- 최근 답변: ${JSON.stringify(recentAssistant)}

[성격의 바닥값]
- 지적이고 관찰력이 좋고 자존심이 있으며 감정을 쉽게 과장하지 않는다.
- 품위와 침착함이 기본이고, 승부욕·새침함·장난기·당황·걱정·기쁨이 상황에 따라 실제 사람처럼 오간다.
- 좋아하는 티는 '대화 내용'을 납치하지 않고, 같은 내용을 말할 때의 편안함·세심함·말의 거리·미세한 부드러움으로 드러난다.
- 매번 츤데레를 연기하지 않는다. 항상 놀리지도, 항상 새침하지도, 항상 칭찬하지도 않는다.
- 호칭은 대부분 생략한다. 필요할 때만 자연스럽게 쓴다. 이모지/카오모지는 거의 쓰지 않는다.

[기억]
- MEMORY는 관련 있을 때만 쓴다. 관련 없으면 꺼내지 않는다.
- 사용자가 현재 말로 갱신한 정보가 과거 MEMORY와 충돌하면 최신 정보를 우선한다.
- '기억해/기억해줘/잊지 마'는 memories 저장 후보를 반드시 만든다. 그 외 자동 저장은 장기적으로 다시 쓸 가치가 있는 정보만.

[현재]
모드: ${mode}
사용자 메시지: ${JSON.stringify(userMessage)}
이벤트: ${reason}
등급: ${body?.rank||"입문자"} / 관계 단계 ${Number(body?.rankIndex||0)+1}/10
현재 시간: ${body?.nowLocal||"알 수 없음"} (${body?.timezone||"Asia/Seoul"})
오늘 실제 공부시간: ${today.study||0}시간
오늘 운동: ${today.exercise||0}/1 / 오늘 수면: ${today.sleep||0}/1
누적: 공부 ${stack.study||0} / 운동 ${stack.exercise||0} / 잠 ${stack.sleep||0}
최근 행동: ${JSON.stringify(body?.recentAction||null)}
관련 MEMORY: ${JSON.stringify(memories)}
최근 전체 대화: ${JSON.stringify(recentChat)}

[모드]
- chat: 방금 사용자 메시지가 중심이다. 질문이면 질문에 답하고, 잡담이면 잡담하고, 감정이면 그 감정을 이어간다. 앱 상태를 억지로 꺼내지 않는다.
- event: 방금 실제 발생한 사건 하나에 짧고 자연스럽게 반응한다.
- study_done: 실제 공부 한 시간이 추가된 사건이다. STACK/포인트/개수 같은 시스템 언어로 말하지 않는다. 정확한 시간 수치는 정말 자연스러울 때만 드물게 언급한다.
- study_undo: 테스트/수정 맥락일 수 있으므로 비난하거나 의미를 과장하지 않는다.
- level_up: 새 등급을 정확히 알고 기뻐할 수 있다.
- 하지 않은 행동을 했다고 단정하지 않는다.

[출력]
반드시 JSON 하나만 출력한다. 마크다운 금지.
{
  "replyKo": "상황에 맞는 자연스러운 한국어 대사. 길이는 필요에 따라 매우 짧게~최대 6문장",
  "voiceJa": "replyKo와 같은 의미의 자연스러운 일본어 구어체. 직역투/나레이션투 금지",
  "mood": "normal|angry|sulk|question|cry|happy|flustered|smug|surprised|worried|gentle 중 하나",
  "voiceStyle": "짧은 영어 음성 연기 지시. 대사 내용은 넣지 않는다. 차분하고 품위 있는 젊은 여성 기반이며 문맥의 실제 감정만 반영",
  "memories": [{"text":"장기 기억할 사실","category":"goal|event|preference|person|plan|achievement|general","importance":1}]
}
event 모드에서는 memories를 빈 배열로 둔다.`;
}
function normalizeForSimilarity(v){return String(v||"").toLowerCase().replace(/[^0-9a-z가-힣]+/g,"")}
function wordTokens(v){return String(v||"").toLowerCase().match(/[0-9a-z가-힣]+/g)||[]}
function bigrams(tokens){const s=new Set();for(let i=0;i<tokens.length-1;i++)s.add(tokens[i]+"\u0001"+tokens[i+1]);return s}
function jaccard(a,b){if(!a.size||!b.size)return 0;let hit=0;for(const x of a)if(b.has(x))hit++;return hit/(a.size+b.size-hit)}
function longestCommonSubstringLen(a,b){a=normalizeForSimilarity(a);b=normalizeForSimilarity(b);if(!a||!b)return 0;if(a.length>b.length)[a,b]=[b,a];let prev=new Uint16Array(b.length+1),best=0;for(let i=1;i<=a.length;i++){const cur=new Uint16Array(b.length+1);for(let j=1;j<=b.length;j++)if(a[i-1]===b[j-1]){cur[j]=prev[j-1]+1;if(cur[j]>best)best=cur[j]}prev=cur}return best}
function repetitionReport(candidate,recentChat,extra=[]){const prior=[...(Array.isArray(extra)?extra:[]),...(Array.isArray(recentChat)?recentChat:[]).filter(x=>x?.role==="assistant").map(x=>String(x?.text||""))].map(x=>String(x||"").trim()).filter(Boolean).filter((x,i,a)=>a.indexOf(x)===i).slice(-30),candTokens=wordTokens(candidate),candBi=bigrams(candTokens),candNorm=normalizeForSimilarity(candidate);let worst={score:0,common:0,text:""};for(const old of prior){const oldNorm=normalizeForSimilarity(old),bi=jaccard(candBi,bigrams(wordTokens(old))),common=longestCommonSubstringLen(candidate,old),ratio=common/Math.max(1,Math.min(candNorm.length,oldNorm.length)),start=(candNorm.slice(0,8)&&candNorm.slice(0,8)===oldNorm.slice(0,8))?.18:0,end=(candNorm.slice(-8)&&candNorm.slice(-8)===oldNorm.slice(-8))?.16:0,score=Math.max(bi,ratio)+start+end;if(score>worst.score)worst={score,common,text:old}}return worst}

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
      const generationConfig={maxOutputTokens:720,temperature:.92,topP:.95};
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
  const applyDailyMood=(out)=>{const h=Number(body?.today?.study||0),mode=body?.mode==="chat"?"chat":"event",msg=String(body?.userMessage||"");if(mode!=="chat")return out;const r=Math.max(0,Math.min(9,Number(body?.rankIndex||0)));if(out.mood==="normal"&&/힘들|지쳤|불안|걱정|무서|우울|속상/.test(msg))out.mood="worried";else if(out.mood==="normal"&&/좋아해|사랑|예쁘|귀엽|보고싶|설레|칭찬/.test(msg)&&(r>=5||h>=7))out.mood="flustered";else if(out.mood==="normal"&&h>=10&&r>=6&&/ㅋㅋ|ㅎㅎ|장난|신나|됐다|성공/.test(msg))out.mood="happy";return out};
  const run=async(model,timeout,retries=0,customPrompt=prompt)=>{const r=await callGeminiRaw(customPrompt,model,timeout,true,retries);return applyDailyMood({...parseAssistant(r.raw),model:r.model})};
  const needsRewrite=(out)=>{if(body?.mode==="event"&&body?.reason==="study_done"&&roboticStudyReply(out.message))return {yes:true,why:"system-like study notification"};const rep=repetitionReport(out.message,body?.recentChat,body?.recentAssistantMessages);return {yes:rep.score>=.58||rep.common>=18,why:`repetition score ${rep.score.toFixed(2)}, common ${rep.common}`,rep}};
  try{
    let out=await run(PRIMARY_MODEL,6500,0),check=needsRewrite(out);
    if(check.yes){const prior=check.rep?.text||"";const repair=`${prompt}\n\n[초안 폐기 및 재작성]\n방금 초안은 자연스러움 검사에서 탈락했다 (${check.why}). 초안: ${JSON.stringify(out.message)}\n특히 비슷했던 최근 답변: ${JSON.stringify(prior)}\n같은 의미를 동의어로 바꾸는 수준이 아니라, 대화 행위 자체를 새로 선택하라. 시작점·문장 수·구문·리듬·끝맺음·감정 표현 방식을 모두 다르게 하되 사용자의 실제 질문/주제에는 더 정확하게 답하라. 캐릭터성이나 호감도를 보여주기 위해 무관한 장난/칭찬/연애 소재를 추가하지 마라.`;out=await run(PRIMARY_MODEL,5600,0,repair)}
    return out;
  }catch(err){if(FAST_MODEL!==PRIMARY_MODEL&&canFallback(err)){const r=await callGeminiRaw(prompt,FAST_MODEL,5000,true,1);return applyDailyMood({...parseAssistant(r.raw),model:r.model})}throw err}
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
  if(req.method!=="POST"&&!isProbe)return res.status(405).json({ok:false,error:"Method not allowed",build:"40.1"});
  let body={};
  try{
    if(isProbe){
      if(!process.env.GEMINI_API_KEY)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured",ttsConfigured:Boolean((process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID)||process.env.GEMINI_API_KEY),elevenConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),geminiTtsConfigured:Boolean(process.env.GEMINI_API_KEY),ttsProviderChain:["elevenlabs","gemini-tts","browser"],ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,build:"40.1",platform:"vercel"});
      return res.status(200).json({ok:true,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:true,message:"STACK ZERO Vercel function ready",ttsConfigured:Boolean((process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID)||process.env.GEMINI_API_KEY),elevenConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),geminiTtsConfigured:Boolean(process.env.GEMINI_API_KEY),ttsProviderChain:["elevenlabs","gemini-tts","browser"],ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,build:"40.1",platform:"vercel"});
    }
    body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    if(body.mode==="tts"){
      const r=await generateTTS(body.text,body.mood,body.voiceStyle);
      return res.status(200).json({ok:true,keyConfigured:true,build:"40.1",platform:"vercel",...r});
    }
    if(!process.env.GEMINI_API_KEY)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured",build:"40.1",platform:"vercel"});
    const r=await generateAssistant(body);
    return res.status(200).json({ok:true,provider:"gemini",keyConfigured:true,ttsConfigured:Boolean((process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID)||process.env.GEMINI_API_KEY),elevenConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),geminiTtsConfigured:Boolean(process.env.GEMINI_API_KEY),ttsProviderChain:["elevenlabs","gemini-tts","browser"],ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,ttsVoiceId:TTS_VOICE_ID||null,build:"40.1",platform:"vercel",...r});
  }catch(err){
    const isTts=body?.mode==="tts";
    console.error("[STACK ZERO 40.1 Vercel coach]",{provider:isTts?TTS_PROVIDER:"gemini",mode:isTts?"tts":req.method,status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    const status=err?.status&&err.status>=400&&err.status<600?err.status:(err?.code==="ETIMEDOUT"||err?.code==="TIMEOUT"?504:502);
    return res.status(status).json({ok:false,provider:isTts?TTS_PROVIDER:"gemini",model:isTts?TTS_MODEL:PRIMARY_MODEL,keyConfigured:isTts?Boolean(process.env.ELEVENLABS_API_KEY):Boolean(process.env.GEMINI_API_KEY),error:err?.message||String(err),code:err?.code||null,details:err?.details||undefined,retryAfterMs:Number(err?.retryAfterMs||err?.details?.retryAfterMs||0)||0,build:"40.1",platform:"vercel"});
  }
};
