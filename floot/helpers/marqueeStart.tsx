import {marqueeWriter} from "./marqueeWriter";
import {queueTask} from "@floot/queueTask";
import {claimImport,failImport} from "./marqueeImportState";
import {importSql} from "./marqueeImportDb";
import type {ImportSource} from "./marqueeImportPolicy";
import {marqueeImportFailed} from "./marqueeImportFailed";
async function startMarqueeImportWork(source:ImportSource,mode:"shadow"|"live"="shadow",replayRunId?:string){
 const runId=await claimImport(source,mode,replayRunId),sql=importSql();
 try{
 if(replayRunId){
 const [reference]=await sql`select id from marquee_import_runs where id=${replayRunId} and source=${source} and (status='succeeded' or (mode='shadow' and status='failed'))`;
 if(!reference)throw Error("REPLAY_REFERENCE_INVALID");
 await sql`insert into marquee_import_pages(run_id,feed,page,payload,metadata) select ${runId},feed,page,payload,metadata from marquee_import_pages where run_id=${replayRunId}`;
 }
 if(source==="trakt")await queueTask("marqueeTraktPage",{runId},{budget:190,concurrency:1,onError:"marqueeImportFailed"});
 else if(source==="crunchyroll")await queueTask("marqueeCrPage",{runId},{budget:50,concurrency:1,onError:"marqueeImportFailed"});
 else await queueTask("marqueeAniList",{runId},{budget:5,concurrency:1,onError:"marqueeImportFailed"});
 return runId;
 }catch(e){await failImport(runId,e);throw e;}
}
export const startMarqueeImport=(...args:Parameters<typeof startMarqueeImportWork>)=>marqueeWriter.work("import:start",()=>startMarqueeImportWork(...args));
