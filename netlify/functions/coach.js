const {PRIMARY_MODEL,FAST_MODEL,TTS_MODEL,TTS_FALLBACK_MODEL,TTS_VOICE,generateAssistant,generateTTS,callGeminiRaw}=require("../../lib/coach-core");
exports.handler=async(event)=>{
  const headers={"Content-Type":"application/json; charset=utf-8","Cache-Control":"no-store"};
  if(event.httpMethod==="OPTIONS")return {statusCode:204,headers,body:""};
  const params=event.queryStringParameters||{};
  if(event.httpMethod!=="POST"&&!(event.httpMethod==="GET"&&params.probe==="1"))return {statusCode:405,headers,body:JSON.stringify({ok:false,error:"Method not allowed"})};
  const keyConfigured=Boolean(process.env.GEMINI_API_KEY);
  if(!keyConfigured)return {statusCode:500,headers,body:JSON.stringify({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"})};
  try{
    if(event.httpMethod==="GET"&&params.probe==="1"){const r=await callGeminiRaw("Respond with exactly: STACK ZERO 연결 확인 완료",FAST_MODEL,3500,false);return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini",model:r.model,keyConfigured:true,message:r.raw.trim()})}}
    const body=event.body?JSON.parse(event.body):{};
    if(body.mode==="tts"){const r=await generateTTS(body.text,body.mood,body.voiceStyle);return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini-tts",keyConfigured:true,...r})}}
    const r=await generateAssistant(body);return {statusCode:200,headers,body:JSON.stringify({ok:true,provider:"gemini",keyConfigured:true,ttsConfigured:Boolean(TTS_MODEL&&TTS_VOICE),ttsModel:TTS_MODEL,ttsVoice:TTS_VOICE,...r})};
  }catch(err){console.error("[STACK ZERO coach]",{mode:event?.httpMethod==="POST"?"POST":"probe",status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});const status=err.status&&err.status>=400&&err.status<600?err.status:(err.code==="ETIMEDOUT"?504:502);return {statusCode:status,headers,body:JSON.stringify({ok:false,provider:"gemini",model:PRIMARY_MODEL,ttsModel:TTS_MODEL,ttsFallbackModel:TTS_FALLBACK_MODEL,keyConfigured,error:err.message,code:err.code||null,details:err.details||undefined,retryAfterMs:Number(err.retryAfterMs||err?.details?.retryAfterMs||0)||0})}}
};
