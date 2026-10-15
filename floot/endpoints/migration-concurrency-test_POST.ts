import {migrationBackupSql} from "../helpers/migrationCreateBackup";
import {createHash} from "node:crypto";
export async function handle(request:Request){
 try{
 const {id}=await request.json(),token=request.headers.get("Authorization")?.replace(/^Bearer /,"");
 if(typeof id!=="string"||!token)return Response.json({error:"AUTH_REQUIRED"},{status:401});
 const sql=migrationBackupSql(),hash=createHash("sha256").update(token).digest("hex");
 if((await sql`update migration_backups_20260930.capabilities set consumed_at=now() where id=${id} and token_hash=${hash} and consumed_at is null and expires_at>now() returning id`).length!==1)return Response.json({error:"CAPABILITY_INVALID"},{status:403});
 let signal!:()=>void,release!:()=>void;
 const ready=new Promise<void>(r=>signal=r),hold=new Promise<void>(r=>release=r);
 const first=sql.begin(async tx=>{await tx.unsafe("SELECT * FROM verify_marquee_20260930_v1.control WHERE id FOR SHARE");signal();await hold;});
 await ready;let rejected=false;
 try{await sql.begin(async tx=>{await tx.unsafe("SET LOCAL lock_timeout='250ms'");await tx.unsafe("SELECT verify_marquee_20260930_v1.pause()");});}
 catch(e){if((e as {code?:string}).code!=="55P03")throw e;rejected=true;}
 finally{release();await first;}
 if(!rejected)throw Error("PAUSE_DID_NOT_WAIT");
 const [state]=await sql.unsafe("SELECT mode FROM verify_marquee_20260930_v1.control WHERE id");
 if(state.mode!=="open")throw Error("FAILED_PAUSE_CHANGED_MODE");
 await sql.begin(async tx=>{await tx.unsafe("SET LOCAL lock_timeout='2s'");await tx.unsafe("SELECT verify_marquee_20260930_v1.pause()");await tx.unsafe("SELECT verify_marquee_20260930_v1.drained(0,0,true)");await tx.unsafe("SELECT verify_marquee_20260930_v1.resume()");await tx.unsafe("INSERT INTO verify_marquee_20260930_v1.test_results VALUES('concurrent pause waits for admitted transaction',true),('failed bounded pause leaves control open',true) ON CONFLICT(test) DO NOTHING");});
 return Response.json({tests:2,passed:true,schema:"verify_marquee_20260930_v1",productionWrites:false});
 }catch{return Response.json({error:"ISOLATED_CONCURRENCY_TEST_FAILED"},{status:500});}
}