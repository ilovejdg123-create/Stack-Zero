const {cfg,verifyToken,sb,getAccount}=require("./_cloud");
function bearer(req){const h=String(req.headers?.authorization||"");return h.toLowerCase().startsWith("bearer ")?h.slice(7).trim():""}
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(!cfg().ok)return res.status(503).json({ok:false,error:"PIN sync backend is not configured"});
  const session=verifyToken(bearer(req));if(!session)return res.status(401).json({ok:false,error:"PIN session expired"});
  try{
    if(req.method==="GET"){
      const row=await getAccount(session.pinHash);if(!row)return res.status(404).json({ok:false,error:"Account not found"});
      return res.status(200).json({ok:true,data:row.data||{},updatedAt:row.updated_at||""});
    }
    if(req.method==="POST"){
      const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{},data=body.data;
      if(!data||typeof data!=="object")return res.status(400).json({ok:false,error:"data is required"});
      if(Buffer.byteLength(JSON.stringify(data),"utf8")>3500000)return res.status(413).json({ok:false,error:"동기화 데이터가 너무 큽니다"});
      const current=await getAccount(session.pinHash);if(!current)return res.status(404).json({ok:false,error:"Account not found"});
      const base=String(body.baseUpdatedAt||"");
      if(base&&current.updated_at&&base!==current.updated_at)return res.status(409).json({ok:false,error:"SYNC_CONFLICT",data:current.data||{},updatedAt:current.updated_at});
      const now=new Date().toISOString(),q=encodeURIComponent(session.pinHash),r=await sb(`/rest/v1/stack_zero_accounts?pin_hash=eq.${q}`,{method:"PATCH",headers:{Prefer:"return=representation"},body:JSON.stringify({data,updated_at:now})}),row=Array.isArray(r.data)?r.data[0]:null;
      return res.status(200).json({ok:true,updatedAt:row?.updated_at||now});
    }
    return res.status(405).json({ok:false,error:"Method not allowed"});
  }catch(e){return res.status(e.status&&e.status>=400&&e.status<600?e.status:500).json({ok:false,error:e.message||String(e)})}
};
