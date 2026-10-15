import {marqueeWriter} from "./marqueeWriter";
import {MARQUEE_BARRIER_ACTIVE,MARQUEE_BARRIER_SCHEMA,MARQUEE_ADMISSION_ACTIVE} from "./marqueeDatabaseMode";
import {randomUUID} from "node:crypto";
import {importSql} from "./marqueeImportDb";
import {sanitizeImportError,isAuthFailure,type ImportSource} from "./marqueeImportPolicy";
export async function claimImport(source:ImportSource,mode:"shadow"|"live",referenceRunId?:string){
 const sql=importSql();
 return sql.begin(async tx=>{
 await tx`select pg_advisory_xact_lock(hashtext('marquee.floot.import'))`;
 const [c]=await tx`select * from marquee_import_controls where source=${source} for update`;
 if(!c)throw Error("SOURCE_INVALID");
 if(c.credential_blocked)throw Error("CREDENTIAL_RECONNECT_REQUIRED");
 if(c.retry_after && new Date(c.retry_after)>new Date())throw Error("PROVIDER_COOLDOWN");
 if(mode==="live"&&(c.mode!=="live"||!c.verified_at))throw Error("CUTOVER_NOT_APPROVED");
 const active=await tx`select source from marquee_import_controls where run_id is not null and lease_until>now()`;
 if(active.length)throw Error("IMPORT_ALREADY_RUNNING");
 await tx`update marquee_import_runs set status='failed',finished_at=now(),error_code='LEASE_EXPIRED' where status='running' and started_at<now()-interval '30 minutes'`;
 await tx`update marquee_import_controls set run_id=null,lease_until=null where lease_until<=now()`;
 const runId=randomUUID();
 if(MARQUEE_BARRIER_ACTIVE||MARQUEE_ADMISSION_ACTIVE) await tx.unsafe("select "+MARQUEE_BARRIER_SCHEMA+".acquire_lease($1::uuid,$2::text)",[runId,"import:"+source]);
 await tx`insert into marquee_import_runs(id,source,mode,reference_run_id) values(${runId},${source},${mode},${referenceRunId??null})`;
 await tx`update marquee_import_controls set run_id=${runId},lease_until=now()+interval '30 minutes' where source=${source}`;
 await tx`delete from marquee_import_pages where run_id in(select id from marquee_import_runs where finished_at<now()-interval '14 days' and status='succeeded' and not (source='trakt' and coalesce(counts->>'store','dual')='native' and coalesce(counts->>'flootCommitted','false')='true' and coalesce(counts->>'remoteRecoveryCommitted','false')<>'true'))`;
 return runId;
 });
}
export async function fencedRun(runId:string){
 const sql=importSql();
 const [r]=await sql`select r.* from marquee_import_runs r join marquee_import_controls c on c.source=r.source and c.run_id=r.id where r.id=${runId} and r.status='running' and c.lease_until>now()`;
 if(!r)throw Error("RUN_FENCE_LOST");
 await sql`update marquee_import_controls set lease_until=now()+interval '30 minutes' where run_id=${runId}`;
 return r;
}
async function failImportWork(runId:string,error:unknown){
 const code=sanitizeImportError(error),sql=importSql();
 await sql.begin(async tx=>{
 const [r]=await tx`update marquee_import_runs set status='failed',finished_at=now(),error_code=case when ((counts->>'supabaseCommitAttempted'='true' or counts->>'supabaseCommitted'='true') and coalesce(counts->>'flootCommitted','false')<>'true') or counts->>'nativeCommitAttempted'='true' then 'PARTIAL_COMMIT_REVIEW_REQUIRED' else ${code} end where id=${runId} and status='running' returning source,counts`;
 if(!r)return;
 await tx`update marquee_import_controls set run_id=null,lease_until=null,
 credential_blocked=credential_blocked or ${isAuthFailure(code)},
 retry_after=case when ${code.endsWith("HTTP_429")} then now()+interval '1 hour' else retry_after end,
 mode=case when ${Boolean(((r.counts.supabaseCommitAttempted||r.counts.supabaseCommitted)&&!r.counts.flootCommitted)||r.counts.nativeCommitAttempted)} then 'disabled' else mode end
 where source=${r.source} and run_id=${runId}`;
 if(MARQUEE_BARRIER_ACTIVE||MARQUEE_ADMISSION_ACTIVE) await tx.unsafe("select "+MARQUEE_BARRIER_SCHEMA+".release_lease($1::uuid)",[runId]);
 });
}
async function finishImportWork(runId:string,counts:object){
 const sql=importSql();
 await sql.begin(async tx=>{
 const [r]=await tx`select r.* from marquee_import_runs r join marquee_import_controls c on c.source=r.source and c.run_id=r.id where r.id=${runId} and r.status='running' and c.lease_until>now() for update of c,r`;
 if(!r)throw Error("RUN_FENCE_LOST");
 await tx`update marquee_import_runs set status='succeeded',finished_at=now(),counts=${tx.json(JSON.parse(JSON.stringify(counts)))} where id=${runId}`;
 await tx`update marquee_import_controls set run_id=null,lease_until=null,last_success_at=case when ${r.mode==="live"||Boolean((counts as {legacyManual?:boolean}).legacyManual)} then now() else last_success_at end where source=${r.source} and run_id=${runId}`;
 if(MARQUEE_BARRIER_ACTIVE||MARQUEE_ADMISSION_ACTIVE) await tx.unsafe("select "+MARQUEE_BARRIER_SCHEMA+".release_lease($1::uuid)",[runId]);
 });
}



export const failImport = (runId:string,error:unknown) => marqueeWriter.work("import:terminal",()=>failImportWork(runId,error),runId,true);
export const finishImport = (runId:string,counts:object) => marqueeWriter.work("import:finish",()=>finishImportWork(runId,counts),runId);

