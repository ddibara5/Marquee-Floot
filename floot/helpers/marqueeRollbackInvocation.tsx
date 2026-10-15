import {createHash} from "node:crypto";
const PACKAGE="marquee:rollback:20261001";
const uuid=(v:unknown):v is string=>typeof v==="string"&&/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(v);
export function createMarqueeRollbackInvocation(deps:{
 authorizedPackage:()=>string|undefined;claim:(id:string,hash:string)=>Promise<boolean>;
 run:(finalBackupReceipt:string)=>Promise<unknown>;
}){
 return async(request:Request)=>{
  const token=request.headers.get("Authorization")?.match(/^Bearer (\S{32,})$/)?.[1];
  if(!token)return Response.json({error:"AUTH_REQUIRED"},{status:401});
  let body:any;try{body=await request.json();}catch{return Response.json({error:"INVALID_REQUEST"},{status:400});}
  if(!uuid(body?.id)||!uuid(body?.finalBackupReceipt)||Object.keys(body).some(k=>!["id","finalBackupReceipt"].includes(k)))return Response.json({error:"INVALID_REQUEST"},{status:400});
  if(deps.authorizedPackage()!==PACKAGE)return Response.json({error:"ROLLBACK_INVOCATION_DISABLED"},{status:503});
  if(!await deps.claim(body.id,createHash("sha256").update(token).digest("hex")))return Response.json({error:"CAPABILITY_INVALID"},{status:403});
  // Receipt is an operator attestation, not independently verified backup/authorization evidence.
  try{return Response.json(await deps.run(body.finalBackupReceipt));}
  catch(e){return Response.json({error:"ROLLBACK_GATED",gate:/^[A-Z_]+$/.test((e as Error).message)?(e as Error).message:"REDACTED"},{status:409});}
 };
}
