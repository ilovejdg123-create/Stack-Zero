const ALLOWED_VOICES=new Set(["ja-JP-NanamiNeural","ja-JP-AoiNeural","ja-JP-MayuNeural","ja-JP-ShioriNeural"]);
const DEFAULT_VOICE=process.env.AZURE_SPEECH_VOICE||"ja-JP-NanamiNeural";
function escapeXml(v){return String(v||"").replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/\"/g,"&quot;").replace(/'/g,"&apos;")}
function normalizeMood(v){const m=String(v||"").toLowerCase();return ["angry","sulk","question","cry","normal","happy","flustered","smug","surprised","worried","gentle"].includes(m)?m:"normal"}
function prosody(mood){
  const m=normalizeMood(mood);
  // Baseline is deliberately a little faster and a little higher than stock Nanami.
  const map={
    angry:{rate:"+9%",pitch:"+4%"},sulk:{rate:"+2%",pitch:"+3%"},question:{rate:"+9%",pitch:"+6%"},cry:{rate:"-1%",pitch:"+1%"},
    happy:{rate:"+12%",pitch:"+7%"},flustered:{rate:"+10%",pitch:"+7%"},smug:{rate:"+5%",pitch:"+4%"},surprised:{rate:"+13%",pitch:"+8%"},
    worried:{rate:"+2%",pitch:"+2%"},gentle:{rate:"+4%",pitch:"+3%"},normal:{rate:"+7%",pitch:"+4%"}
  };
  return map[m]||map.normal
}
function retryAfterMs(value){const raw=String(value||"").trim();if(!raw)return 0;const n=Number(raw);if(Number.isFinite(n)&&n>=0)return Math.round(n*1000);const when=Date.parse(raw);return Number.isFinite(when)?Math.max(0,when-Date.now()):0}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed",build:"40.5",platform:"vercel"});
  const key=process.env.AZURE_SPEECH_KEY,region=String(process.env.AZURE_SPEECH_REGION||"").trim();
  if(!key||!region)return res.status(500).json({ok:false,error:"AZURE_SPEECH_KEY or AZURE_SPEECH_REGION is not configured",code:"AZURE_TTS_NOT_CONFIGURED",build:"40.5",platform:"vercel"});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    const text=String(body.text||"").trim().slice(0,700);
    if(!text)return res.status(400).json({ok:false,error:"text is required",build:"40.5",platform:"vercel"});
    const requested=String(body.voice||DEFAULT_VOICE).trim(),voice=ALLOWED_VOICES.has(requested)?requested:(ALLOWED_VOICES.has(DEFAULT_VOICE)?DEFAULT_VOICE:"ja-JP-NanamiNeural");
    const p=prosody(body.mood);
    const spoken=`<prosody rate="${p.rate}" pitch="${p.pitch}">${escapeXml(text)}</prosody>`;
    // Nanami supports the conversational "chat" style; other standard Japanese voices do not advertise styles.
    const content=voice==="ja-JP-NanamiNeural"?`<mstts:express-as style="chat" styledegree="1.0">${spoken}</mstts:express-as>`:spoken;
    const ssml=`<speak version="1.0" xmlns="http://www.w3.org/2001/10/synthesis" xmlns:mstts="https://www.w3.org/2001/mstts" xml:lang="ja-JP"><voice name="${voice}">${content}</voice></speak>`;
    const controller=new AbortController(),timer=setTimeout(()=>controller.abort(),12000);
    let r;
    try{
      r=await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`,{method:"POST",headers:{"Ocp-Apim-Subscription-Key":key,"Content-Type":"application/ssml+xml","X-Microsoft-OutputFormat":"audio-24khz-48kbitrate-mono-mp3","User-Agent":"STACK-ZERO"},signal:controller.signal,body:ssml});
    }finally{clearTimeout(timer)}
    if(!r.ok){const raw=await r.text().catch(()=>"");const e=new Error(raw.slice(0,260)||`Azure TTS HTTP ${r.status}`);e.status=r.status;e.code="AZURE_TTS_HTTP_ERROR";e.retryAfterMs=retryAfterMs(r.headers?.get?.("retry-after"));throw e}
    const bytes=Buffer.from(await r.arrayBuffer());
    if(!bytes.length){const e=new Error("Azure TTS returned no audio");e.status=502;e.code="NO_AUDIO";throw e}
    return res.status(200).json({ok:true,provider:"azure-speech",model:"Azure Japanese Neural TTS",voice,audioBase64:bytes.toString("base64"),mimeType:r.headers.get("content-type")||"audio/mpeg",build:"40.5",platform:"vercel"});
  }catch(err){
    if(err?.name==="AbortError"){err=new Error("Azure TTS timeout");err.status=504;err.code="TIMEOUT"}
    const status=err?.status&&err.status>=400&&err.status<600?err.status:502;
    return res.status(status).json({ok:false,provider:"azure-speech",error:err?.message||String(err),code:err?.code||null,retryAfterMs:Number(err?.retryAfterMs||0)||0,build:"40.5",platform:"vercel"});
  }
};
