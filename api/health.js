const {cfg,verifyToken,issueHealthToken,verifyHealthToken,sb,getAccount}=require("./_cloud");
function bearer(req){const h=String(req.headers?.authorization||"");return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():""}
function n(v,min,max){const x=Number(v);return Number.isFinite(x)?Math.max(min,Math.min(max,x)):0}
function validDate(v){return /^\d{4}-\d{2}-\d{2}$/.test(String(v||""))}
function defaultHealth(h={}){return {goalKm:Math.max(.5,Math.min(100,Number(h.goalKm)||8)),date:validDate(h.date)?String(h.date):"",distanceKm:n(h.distanceKm,0,300),steps:Math.round(n(h.steps,0,300000)),activeCalories:Math.round(n(h.activeCalories,0,30000)),syncedAt:String(h.syncedAt||""),stackAwardedDate:String(h.stackAwardedDate||"")}}
async function patchHealth(pinHash,body){
  for(let attempt=0;attempt<3;attempt++){
    const row=await getAccount(pinHash);if(!row){const e=new Error("Account not found");e.status=404;throw e}
    const bundle=row.data&&typeof row.data==="object"?JSON.parse(JSON.stringify(row.data)):{};
    bundle.state=bundle.state&&typeof bundle.state==="object"?bundle.state:{};
    const old=defaultHealth(bundle.state.health||{}),now=new Date().toISOString();
    bundle.state.health={...old,date:String(body.date),distanceKm:Math.round(n(body.distanceKm,0,300)*1000)/1000,steps:Math.round(n(body.steps,0,300000)),activeCalories:Math.round(n(body.activeCalories,0,30000)),syncedAt:now};
    bundle.savedAt=Date.now();bundle.schema=Math.max(1,Number(bundle.schema||1));
    const q=encodeURIComponent(pinHash),u=encodeURIComponent(row.updated_at||""),url=`/rest/v1/stack_zero_accounts?pin_hash=eq.${q}${row.updated_at?`&updated_at=eq.${u}`:""}`;
    const r=await sb(url,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({data:bundle,updated_at:now})});
    const changed=Array.isArray(r.data)?r.data[0]:null;if(changed)return {health:bundle.state.health,updatedAt:changed.updated_at||now};
  }
  const e=new Error("HEALTH_SYNC_CONFLICT");e.status=409;throw e;
}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(!cfg().ok)return res.status(503).json({ok:false,error:"PIN sync backend is not configured"});
  try{
    if(req.method==="GET"){
      const session=verifyToken(bearer(req));if(!session)return res.status(401).json({ok:false,error:"PIN session expired"});
      const row=await getAccount(session.pinHash);if(!row)return res.status(404).json({ok:false,error:"Account not found"});
      if(String(req.query?.key||"")==="1")return res.status(200).json({ok:true,healthKey:issueHealthToken(session.pinHash)});
      return res.status(200).json({ok:true,health:defaultHealth(row.data?.state?.health||{}),updatedAt:row.updated_at||""});
    }
    if(req.method==="POST"){
      const healthSession=verifyHealthToken(bearer(req));if(!healthSession)return res.status(401).json({ok:false,error:"Invalid HEALTH key"});
      const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{};
      if(!validDate(body.date))return res.status(400).json({ok:false,error:"date must be YYYY-MM-DD"});
      const result=await patchHealth(healthSession.pinHash,body);
      return res.status(200).json({ok:true,...result});
    }
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }catch(e){return res.status(e.status&&e.status>=400&&e.status<600?e.status:500).json({ok:false,error:e.message||String(e)})}
};
