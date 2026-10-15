import postgres from "postgres";
import {createMarqueeRollbackInvocation} from "../helpers/marqueeRollbackInvocation";
import {createMarqueeRetainedStoreRollback} from "../helpers/marqueeRetainedStoreRollback";
// Unpublished preparation. Authorization env stays unset. No caller schemas/SQL or automatic resume.
export const handle=createMarqueeRollbackInvocation({
 authorizedPackage:()=>(process.env as unknown as Record<string,string|undefined>).MARQUEE_ROLLBACK_AUTHORIZED_PACKAGE,
 claim:async(id,hash)=>{
  if(!process.env.FLOOT_DATABASE_URL)throw Error("NATIVE_DATABASE_MISSING");
  const sql=postgres(process.env.FLOOT_DATABASE_URL,{prepare:false,max:1,connect_timeout:10,idle_timeout:10});
  try{const rows=await sql`update migration_backups_20260930.capabilities set consumed_at=now() where id=${id}::uuid and token_hash=${hash} and consumed_at is null and expires_at>now() returning id`;return rows.length===1;}finally{await sql.end();}
 },
 run:async(finalBackupReceipt)=>{const runner=createMarqueeRetainedStoreRollback({approvedPackage:"marquee:rollback:20261001",finalBackupReceipt});try{return await runner.run();}finally{await runner.close();}}
});
