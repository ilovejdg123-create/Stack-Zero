import { createRequire } from "module";
const require=createRequire(import.meta.url);
const {openTTSStream,TTS_PROVIDER,TTS_MODEL}=require("./coach-core.js");
export default async(req)=>{
  const headers={"Cache-Control":"no-store"};if(req.method==="OPTIONS")return new Response(null,{status:204,headers});if(req.method!=="POST")return Response.json({ok:false,error:"Method not allowed"},{status:405,headers});
  try{const body=await req.json();const text=String(body?.text||"").trim().slice(0,500);if(!text)return Response.json({ok:false,error:"text is required"},{status:400,headers});const upstream=await openTTSStream(text,body?.mood,body?.voiceStyle);return new Response(upstream.body,{status:200,headers:{"Content-Type":upstream.headers.get("content-type")||"audio/mpeg","Cache-Control":"no-store","X-Content-Type-Options":"nosniff","X-TTS-Provider":TTS_PROVIDER,"X-TTS-Model":TTS_MODEL}})}catch(err){const status=err?.status&&err.status>=400&&err.status<600?err.status:502;return Response.json({ok:false,provider:TTS_PROVIDER,error:err?.message||"TTS stream failed",code:err?.code||null,retryAfterMs:Number(err?.retryAfterMs||0)||0},{status,headers})}
};
