import { createRequire } from "module";
const require = createRequire(import.meta.url);
const {TTS_MODEL,TTS_VOICE,buildTtsInput,retryableStatus}=require("../../lib/coach-core.js");
const INTERACTIONS_URL="https://generativelanguage.googleapis.com/v1beta/interactions?alt=sse";
const sleep=ms=>new Promise(r=>setTimeout(r,ms));

async function openStream({text,mood,voiceStyle,key}){
  let lastErr;
  for(let attempt=0;attempt<2;attempt++){
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),4300);
    try{
      const upstream=await fetch(INTERACTIONS_URL,{
        method:"POST",
        headers:{"Content-Type":"application/json","Accept":"text/event-stream","x-goog-api-key":key,"Api-Revision":"2026-05-20"},
        signal:controller.signal,
        body:JSON.stringify({
          model:TTS_MODEL,
          input:buildTtsInput(text,mood,voiceStyle),
          response_format:{type:"audio"},
          generation_config:{speech_config:[{voice:TTS_VOICE}]},
          stream:true
        })
      });
      clearTimeout(timer);
      if(upstream.ok&&upstream.body)return upstream;
      let details={};
      try{details=await upstream.json()}catch(_){details={}}
      const e=new Error(details?.error?.message||`Gemini TTS stream HTTP ${upstream.status}`);e.status=upstream.status;e.details=details;throw e;
    }catch(err){
      clearTimeout(timer);
      if(err?.name==="AbortError"){const e=new Error("Gemini TTS stream timeout");e.code="ETIMEDOUT";lastErr=e}else lastErr=err;
      const transient=lastErr?.code==="ETIMEDOUT"||retryableStatus(Number(lastErr?.status||0));
      if(!transient||attempt>=1)throw lastErr;
      await sleep(Math.round(220*Math.pow(2,attempt)+Math.random()*180));
    }
  }
  throw lastErr||new Error("Gemini TTS stream failed");
}

export default async (req)=>{
  const headers={"Cache-Control":"no-store"};
  if(req.method==="OPTIONS")return new Response(null,{status:204,headers});
  if(req.method!=="POST")return Response.json({ok:false,error:"Method not allowed"},{status:405,headers});
  const key=process.env.GEMINI_API_KEY;
  if(!key)return Response.json({ok:false,error:"GEMINI_API_KEY is not configured"},{status:500,headers});
  try{
    const body=await req.json();
    const text=String(body?.text||"").trim().slice(0,500);
    if(!text)return Response.json({ok:false,error:"text is required"},{status:400,headers});
    const upstream=await openStream({text,mood:body?.mood,voiceStyle:body?.voiceStyle,key});
    return new Response(upstream.body,{status:200,headers:{
      "Content-Type":upstream.headers.get("content-type")||"text/event-stream; charset=utf-8",
      "Cache-Control":"no-store",
      "X-Content-Type-Options":"nosniff"
    }});
  }catch(err){
    console.error("[STACK ZERO tts-stream]",{status:err?.status||null,code:err?.code||null,message:err?.message||String(err)});
    const status=err?.status&&err.status>=400&&err.status<600?err.status:(err?.code==="ETIMEDOUT"?504:502);
    return Response.json({ok:false,error:err?.message||"TTS stream failed"},{status,headers});
  }
};
