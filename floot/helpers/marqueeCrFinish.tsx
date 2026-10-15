import {marqueeWriter} from "./marqueeWriter";
import {importSql} from "./marqueeImportDb";
import {FLOOT_BACKUP_INSERT,retainBackups} from "./marqueeImportBackup";
import {fencedRun,failImport,finishImport} from "./marqueeImportState";
import {validateEvents} from "./marqueeImportPolicy";
import {syncCrunchyroll,type Window} from "./crunchyrollSync";
async function marqueeCrFinishWork(input:{runId:string}){
 try{
 const run=await fencedRun(input.runId),sql=importSql();
 const staged=await sql`select * from marquee_import_pages where run_id=${input.runId} and feed='history' order by page`;
 const pages=staged.slice(0,19);
 if(pages.length<2||pages.length>19||pages.some((p,i)=>p.page!==i+1)||(!pages.at(-1)?.metadata.terminal&&pages.length!==19))throw Error("CR_INCOMPLETE_WINDOW");
 const events=pages.flatMap(p=>p.payload);validateEvents(events);if(events.length<40)throw Error("CR_INCOMPLETE_WINDOW");
 if(run.mode==="live"){
 const [c]=await sql`select mode,verified_at from marquee_import_controls where source='crunchyroll'`;
 if(c?.mode!=="live"||!c.verified_at)throw Error("CUTOVER_NOT_APPROVED");
 await sql.unsafe(FLOOT_BACKUP_INSERT,["pre-live:"+input.runId]);
 }
 const result=await syncCrunchyroll(1,"sync",{accountId:pages[0].metadata.accountId,events} as Window,run.mode==="shadow");
 // Retention runs while the run's writer lease is still held; finishImport releases it.
 if(run.mode==="live")await retainBackups("crunchyroll");
 await finishImport(input.runId,{...result,shadow:run.mode==="shadow",pages:pages.length,canonicalCommitted:run.mode==="live",datePolicy:"48h-source-reported",checkpointOverlap:40});
 }catch(e){
 const message=e instanceof Error?e.message:"";
 const code=message==="Crunchyroll recent window missed the prior checkpoint"?"CR_CHECKPOINT_MISSED":message.startsWith("Crunchyroll profile")?"CR_ACCOUNT_MISMATCH":message.startsWith("Confirm the Crunchyroll profile")?"CR_PROFILE_CONFIRMATION_REQUIRED":message==="Crunchyroll event has no series identity"?"CR_IDENTITY_MISSING":null;
 await failImport(input.runId,code?Error(code):e);throw e;
 }
}



export const marqueeCrFinish = (input: Parameters<typeof marqueeCrFinishWork>[0]) => marqueeWriter.work("import:marqueeCrFinish", () => marqueeCrFinishWork(input), input.runId);
