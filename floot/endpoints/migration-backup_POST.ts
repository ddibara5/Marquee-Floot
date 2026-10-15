import {schema} from "./migration-backup_POST.schema";
import {migrationBackupSql,migrationCreateBackup,migrationRestoreBackup} from "../helpers/migrationCreateBackup";
import {createHash} from "node:crypto";
export async function handle(request:Request){try{
 const input=schema.parse(await request.json()),token=request.headers.get("Authorization")?.replace(/^Bearer /,"");
 if(!token)return Response.json({error:"AUTH_REQUIRED"},{status:401});
 const hash=createHash("sha256").update(token).digest("hex"),sql=migrationBackupSql();
 const claimed=await sql`update migration_backups_20260930.capabilities set consumed_at=now() where id=${input.id} and token_hash=${hash} and consumed_at is null and expires_at>now() returning id`;
 if(claimed.length!==1)return Response.json({error:"CAPABILITY_INVALID"},{status:403});
 if(input.action==="restore"){if(!input.backupId)throw Error("BACKUP_ID_REQUIRED");return Response.json(await migrationRestoreBackup(input.backupId));}
 if(!input.source)throw Error("SOURCE_REQUIRED");return Response.json(await migrationCreateBackup(input.source,input.id,input.historyRow,input.historySection,input.historyOffset));
 }catch(e){const code=String((e as {code?:string}).code??"RUNTIME");const message=(e as Error).message;console.warn("MIGRATION_PREPARATION_FAILURE",code,/^(RESTORE_|CIPHER_|PLAIN_|BACKUP_)[A-Z_:a-z0-9]+$/.test(message)?message:"REDACTED");return Response.json({error:"BACKUP_PREPARATION_FAILED",code},{status:500});}}