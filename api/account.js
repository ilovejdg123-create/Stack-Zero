const {cfg,hashPin,issueToken,sb,getAccount}=require("./_cloud");
module.exports=async function handler(req,res){
  res.setHeader("Cache-Control","no-store");
  if(req.method==="GET"&&String(req.query?.probe||"")==="1")return res.status(200).json({ok:true,configured:cfg().ok,build:"1.0"});
  if(req.method!=="POST")return res.status(405).json({ok:false,error:"Method not allowed"});
  if(!cfg().ok)return res.status(503).json({ok:false,error:"SUPABASE_URL / SUPABASE_SECRET_KEY 설정이 필요합니다"});
  try{
    const body=typeof req.body==="string"?JSON.parse(req.body||"{}"):req.body||{},action=String(body.action||""),pin=String(body.pin||"").trim();
    if(!/^\d{6,12}$/.test(pin))return res.status(400).json({ok:false,error:"PIN은 숫자 6~12자리여야 합니다"});
    const pinHash=hashPin(pin),existing=await getAccount(pinHash);
    if(action==="create"){
      if(existing)return res.status(409).json({ok:false,error:"이미 사용 중인 PIN입니다"});
      const data=body.data&&typeof body.data==="object"?body.data:{};if(Buffer.byteLength(JSON.stringify(data),"utf8")>3500000)return res.status(413).json({ok:false,error:"초기 데이터가 너무 큽니다"});
      const now=new Date().toISOString(),r=await sb(`/rest/v1/stack_zero_accounts`,{method:"POST",headers:{Prefer:"return=representation"},body:JSON.stringify({pin_hash:pinHash,data,created_at:now,updated_at:now})}),row=Array.isArray(r.data)?r.data[0]:null;
      return res.status(200).json({ok:true,token:issueToken(pinHash),data:row?.data||data,updatedAt:row?.updated_at||now});
    }
    if(action==="login"){
      if(!existing)return res.status(404).json({ok:false,error:"PIN을 찾을 수 없습니다"});
      return res.status(200).json({ok:true,token:issueToken(pinHash),data:existing.data||{},updatedAt:existing.updated_at||""});
    }
    return res.status(400).json({ok:false,error:"Unknown action"});
  }catch(e){return res.status(e.status&&e.status>=400&&e.status<600?e.status:500).json({ok:false,error:e.message||String(e)})}
};
