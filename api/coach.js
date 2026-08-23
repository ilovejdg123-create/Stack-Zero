const {PRIMARY_MODEL,FAST_MODEL,TTS_MODEL,generateAssistant,generateTTS,callGeminiRaw}=require("../lib/coach-core");
module.exports=async(req,res)=>{
  res.setHeader("Cache-Control","no-store");
  if(req.method==="OPTIONS")return res.status(204).end();
  if(req.method!=="POST"&&!(req.method==="GET"&&req.query?.probe==="1"))return res.status(405).json({ok:false,error:"Method not allowed"});
  const keyConfigured=Boolean(process.env.GEMINI_API_KEY);
  if(!keyConfigured)return res.status(500).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,keyConfigured:false,error:"GEMINI_API_KEY is not configured"});
  try{
    if(req.method==="GET"&&req.query?.probe==="1"){const r=await callGeminiRaw("Respond with exactly: STACK ZERO 연결 확인 완료",FAST_MODEL,3500,false);return res.status(200).json({ok:true,provider:"gemini",model:r.model,keyConfigured:true,message:r.raw.trim()})}
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
    if(body.mode==="tts"){const r=await generateTTS(body.text,body.mood);return res.status(200).json({ok:true,provider:"gemini-tts",keyConfigured:true,...r})}
    const r=await generateAssistant(body);return res.status(200).json({ok:true,provider:"gemini",keyConfigured:true,...r});
  }catch(err){return res.status(err.status&&err.status>=400&&err.status<600?err.status:(err.code==="ETIMEDOUT"?504:502)).json({ok:false,provider:"gemini",model:PRIMARY_MODEL,ttsModel:TTS_MODEL,keyConfigured,error:err.message,details:err.details||undefined})}
};
