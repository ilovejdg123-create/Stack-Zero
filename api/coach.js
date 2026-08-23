const {PRIMARY_MODEL,FAST_MODEL,TTS_PROVIDER,TTS_MODEL,TTS_VOICE_ID,generateAssistant,generateTTS,callGeminiRaw}=require("../lib/coach-core");
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST"&&!(req.method==="GET"&&req.query?.probe==="1"))return res.status(405).json({ok:false,error:"Method not allowed"});
  try{
    if(req.method==="GET"&&req.query?.probe==="1"){
      if(!process.env.GEMINI_API_KEY)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"});
      const r=await callGeminiRaw("Respond with exactly: STACK ZERO 연결 확인 완료",FAST_MODEL,3500,false);return res.status(200).json({ok:true,provider:"gemini",model:r.model,keyConfigured:true,message:r.raw.trim(),ttsConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL});
    }
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    if(body.mode==="tts"){
      const r=await generateTTS(body.text,body.mood,body.voiceStyle);return res.status(200).json({ok:true,keyConfigured:true,...r});
    }
    if(!process.env.GEMINI_API_KEY)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"});
    const r=await generateAssistant(body);return res.status(200).json({ok:true,provider:"gemini",keyConfigured:true,ttsConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,ttsVoiceId:TTS_VOICE_ID||null,...r});
  }catch(err){
    const isTts=req?.body?.mode==="tts";console.error("[STACK ZERO coach]",{provider:isTts?TTS_PROVIDER:"gemini",mode:req?.body?.mode||req?.method,status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    return res.status(err.status&&err.status>=400&&err.status<600?err.status:(err.code==="ETIMEDOUT"||err.code==="TIMEOUT"?504:502)).json({ok:false,provider:isTts?TTS_PROVIDER:"gemini",model:isTts?TTS_MODEL:PRIMARY_MODEL,keyConfigured:isTts?Boolean(process.env.ELEVENLABS_API_KEY):Boolean(process.env.GEMINI_API_KEY),error:err.message,code:err.code||null,details:err.details||undefined,retryAfterMs:Number(err.retryAfterMs||err?.details?.retryAfterMs||0)||0});
  }
};
