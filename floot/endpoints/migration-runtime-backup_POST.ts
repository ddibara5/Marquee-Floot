import {createHash} from "node:crypto";
import {migrationBackupSql,migrationRestoreBackup} from "../helpers/migrationCreateBackup";
import {migrationRuntimeBackup} from "../helpers/migrationRuntimeBackup";
// Unpublished. Live capture stays disabled without separate final-window authorization.
export const handle=async(request:Request)=>{
 const token=request.headers.get("Authorization")?.match(/^Bearer (\S{32,})$/)?.[1];
 if(!token)return Response.json({error:"AUTH_REQUIRED"},{status:401});
 let body:any;try{body=await request.json();}catch{return Response.json({error:"INVALID_REQUEST"},{status:400});}
 if(!body||typeof body.id!=="string"||!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(body.id)||!["private-exercise","pre-install","final-window"].includes(body.mode)||Object.keys(body).some(k=>!["id","mode"].includes(k)))return Response.json({error:"INVALID_REQUEST"},{status:400});
 if(body.mode!=="private-exercise"&&(process.env as unknown as Record<string,string|undefined>).MARQUEE_FINAL_BACKUP_AUTHORIZED_PACKAGE!=="marquee:activation:20261001")return Response.json({error:"FINAL_WINDOW_BACKUP_DISABLED"},{status:503});
 const db=migrationBackupSql();
 const claimed=await db`update migration_backups_20260930.capabilities set consumed_at=now() where id=${body.id}::uuid and token_hash=${createHash("sha256").update(token).digest("hex")} and consumed_at is null and expires_at>now() returning id`;
 if(claimed.length!==1)return Response.json({error:"CAPABILITY_INVALID"},{status:403});
 try{
  const backup=await migrationRuntimeBackup(body.id,body.mode);
  const restore=await migrationRestoreBackup(body.id);
  const replay=body.mode==="private-exercise"?await migrationRestoreBackup(body.id):null;
  if(restore.restoredTables!==42||!restore.exactRowHashVerified)throw Error("RUNTIME_RESTORE_COVERAGE_INVALID");
  return Response.json({backup,restore,replay,privateExercise:body.mode==="private-exercise",providerEffects:false,fullProductionRollbackProven:false});
 }catch(e){return Response.json({error:"RUNTIME_BACKUP_GATED",gate:/^[A-Z_:]+$/.test((e as Error).message)?(e as Error).message:"REDACTED"},{status:409});}
};
