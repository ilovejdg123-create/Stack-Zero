const {PRIMARY_MODEL,FAST_MODEL,TTS_PROVIDER,TTS_MODEL,TTS_VOICE_ID,generateAssistant,generateTTS,callGeminiRaw}=require("../../lib/coach-core");
exports.handler=async(event)=>{
  const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
  if(event.httpMethod==="OPTIONS")return {statusCode:204,headers,body:""};
  const params=event.queryStringParameters||{};
  if(event.httpMethod!=="POST"&&!(event.httpMethod==="GET"&&params.probe==="1"))return {statusCode:405,headers,body:JSON.stringify({ok:false,error:"Method not allowed"})};
  try{
    if(event.httpMethod==="GET"&&params.probe==="1"){
      if(!process.env.GEMINI_API_KEY)return {statusCode:500,headers,body:JSON.stringify({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"})};
      const r=await callGeminiRaw("Respond with exactly: STACK ZERO 연결 확인 완료",FAST_MODEL,3500,false);return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini",model:r.model,keyConfigured:true,message:r.raw.trim(),ttsConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL})};
    }
    const body=event.body?JSON.parse(event.body):{};
    if(body.mode==="tts"){
      const r=await generateTTS(body.text,body.mood,body.voiceStyle);return {statusCode:200,headers,body:JSON.stringify({ok:true,keyConfigured:true,...r})};
    }
    if(!process.env.GEMINI_API_KEY)return {statusCode:500,headers,body:JSON.stringify({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"})};
    const r=await generateAssistant(body);return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini",keyConfigured:true,ttsConfigured:Boolean(process.env.ELEVENLABS_API_KEY&&TTS_VOICE_ID),ttsProvider:TTS_PROVIDER,ttsModel:TTS_MODEL,ttsVoiceId:TTS_VOICE_ID||null,...r})};
  }catch(err){
    let parsed={};try{parsed=event.body?JSON.parse(event.body):{}}catch(_){}const isTts=parsed?.mode==="tts";
    console.error("[STACK ZERO coach]",{provider:isTts?TTS_PROVIDER:"gemini",mode:isTts?"tts":event.httpMethod,status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    const status=err.status&&err.status>=400&&err.status<600?err.status:(err.code==="ETIMEDOUT"||err.code==="TIMEOUT"?504:502);
    return {statusCode:status,headers,body:JSON.stringify({ok:false,provider:isTts?TTS_PROVIDER:"gemini",model:isTts?TTS_MODEL:PRIMARY_MODEL,keyConfigured:isTts?Boolean(process.env.ELEVENLABS_API_KEY):Boolean(process.env.GEMINI_API_KEY),error:err.message,code:err.code||null,details:err.details||undefined,retryAfterMs:Number(err.retryAfterMs||err?.details?.retryAfterMs||0)||0})};
  }
};
