import {completeTraktSnapshot} from "./completeTraktSnapshot";
import {marqueeWriter} from "./marqueeWriter";
import {ingestionDb} from "./marqueeIngestionScope";
import {MARQUEE_TRAKT_STORE} from "./marqueeDatabaseMode";
import {FLOOT_BACKUP_INSERT,SUPABASE_BACKUP_INSERT,pruneMarqueeBackups,retainBackups} from "./marqueeImportBackup";
import {importSql,supabaseSql} from "./marqueeImportDb";
import {fencedRun,finishImport,failImport} from "./marqueeImportState";
import {TRAKT_FEEDS} from "./marqueeImportPolicy";
import {syncTraktHistory} from "./traktSync";
import {fillTraktCatalogGaps,type CatalogDiscoveryResult} from "./traktCatalogDiscovery";
import {runShadowTransaction,runStagedTransaction} from "./marqueeIngestionScope";
const OWNER="c566e7e0-880a-430d-85df-c40484144a91";
import {APPROVED_TRAKT_SHOWS as APPROVED} from "./marqueeApprovedTraktShows";
class ShadowRollback extends Error {}
async function marqueeTraktFinishWork(input:{runId:string}){
 try {
 const run=await fencedRun(input.runId),sql=importSql();
 const staged=await sql`select * from marquee_import_pages where run_id=${input.runId} order by feed,page`;
 const feeds=completeTraktSnapshot(staged as any) as Record<string,any[]>;
 let localResult:any=null;
 let supplied:NonNullable<Parameters<typeof syncTraktHistory>[1]>;
 let catalog:CatalogDiscoveryResult|null=null;
 {
 // The existing Floot importer retains its 48h cursor, mapping, manual outbox identity and personal-state semantics.
 // Bound local normalization to the recent overlap plus unresolved records; full source snapshot remains staged.
 const [state]=await sql`select last_history_at from marquee_trakt_sync_state where user_id=1`;
 const cutoff=new Date(new Date(state?.last_history_at??Date.now()-7*86400000).getTime()-48*3600000);
 const pending=await sql`select source_event_key from marquee_trakt_pending where user_id=1 order by last_seen_at desc limit 200`;
 const keys=new Set(pending.map(p=>p.source_event_key));
 const episodes=feeds.history_episodes.filter(r=>Date.parse(r.watched_at)>=cutoff.getTime()||keys.has("trakt:episode:"+r.id));
 const movies=feeds.history_movies.filter(r=>Date.parse(r.watched_at)>=cutoff.getTime()||keys.has("trakt:movie:"+r.id));
 if(episodes.length+movies.length>500)throw Error("FLOOT_NORMALIZATION_CAP");
 supplied={episodes,movies,personal:feeds as any};
 localResult=await runShadowTransaction(async()=>{
 const first=await syncTraktHistory(1,supplied),replay=await syncTraktHistory(1,supplied);
 if(replay.inserted!==0)throw Error("FLOOT_REPLAY_INSERTED");
 return {first,replay,discoveryDeferred:true};
 });
 }

 // Native-only branch retains the complete staged source evidence and existing native normalization.
 // It never obtains a Supabase client or claims a remote commit.
 if(MARQUEE_TRAKT_STORE==="native"){
 if(run.mode==="live"){
 await fencedRun(input.runId);
 const [control]=await sql`select mode,verified_at from marquee_import_controls where source='trakt'`;
 if(control?.mode!=="live"||!control.verified_at)throw Error("CUTOVER_NOT_APPROVED");
 await sql.unsafe(FLOOT_BACKUP_INSERT,["pre-live:"+input.runId]);
 // Catalog additions happen outside the staged transaction (external TMDB calls), before history is applied.
 catalog=await fillTraktCatalogGaps(supplied.episodes,supplied.movies);
 await fencedRun(input.runId);
 await sql`update marquee_import_runs set counts=${sql.json({nativeCommitAttempted:true,flootCommitted:false,supabaseCommitted:false,store:"native"})} where id=${input.runId} and status='running'`;
 localResult=await runStagedTransaction(async()=>{
 const result=await syncTraktHistory(1,supplied);
 const updated=await ingestionDb.updateTable("marqueeImportRuns").set({counts:{nativeCommitAttempted:true,flootCommitted:true,supabaseCommitted:false,store:"native"}}).where("id","=",input.runId).where("status","=","running").executeTakeFirst();
 if(updated.numUpdatedRows!==1n)throw Error("RUN_FENCE_LOST");
 return result;
 });
 }
 const counts={feeds:Object.fromEntries(TRAKT_FEEDS.map(f=>[f,feeds[f].length])),floot:localResult,shadow:run.mode==="shadow",supabaseCommitted:false,flootCommitted:run.mode==="live",store:"native",sourceEvidence:"marquee_import_pages",discoveryDeferred:catalog===null,catalog};
 // Retention runs while the run's writer lease is still held; finishImport releases it.
 if(run.mode==="live")await retainBackups("trakt");
 await finishImport(input.runId,counts);
 return;
 }
 const remote=supabaseSql();
 let remoteResult:any,replayResult:any;
 const fingerprint=await remote`select md5(coalesce(jsonb_agg(to_jsonb(x) order by source_entity_type,dedupe_key)::text,'[]')) hash from public.marquee_ingest_raw x where source='trakt'`;
 // Existing transactional normalizer is reused verbatim. Shadow calls roll back all source/catalog/history writes.
 if(run.mode==="live")await sql`update marquee_import_runs set counts=${sql.json({supabaseCommitAttempted:true,flootCommitted:false})} where id=${input.runId} and status='running'`;
 try{await remote.begin(async tx=>{
 if(run.mode==="live"){
 await fencedRun(input.runId);
 const [control]=await sql`select mode,verified_at from marquee_import_controls where source='trakt'`;
 if(control?.mode!=="live"||!control.verified_at)throw Error("CUTOVER_NOT_APPROVED");
 await sql.unsafe(FLOOT_BACKUP_INSERT,["pre-live:"+input.runId]);
 await tx.unsafe(SUPABASE_BACKUP_INSERT,[input.runId]);
 }
 const [r]=await tx`select public.marquee_trakt_apply_snapshot(${OWNER}::uuid,${tx.json(feeds)}::jsonb,${tx.json(APPROVED)}::jsonb,${"floot:"+input.runId}) result`;remoteResult=r.result;
 if(run.mode==="shadow"){
 const [replay]=await tx`select public.marquee_trakt_apply_snapshot(${OWNER}::uuid,${tx.json(feeds)}::jsonb,${tx.json(APPROVED)}::jsonb,${"floot:replay:"+input.runId}) result`;
 replayResult=replay.result;
 if(replayResult.inserted!==0)throw Error("TRAKT_REPLAY_INSERTED");
 throw new ShadowRollback();
 }
 });}catch(e){if(!(e instanceof ShadowRollback))throw e;}
 if(run.mode==="live"){
 // The stores cannot commit atomically. Preserve an explicit recovery marker before local apply.
 await sql`update marquee_import_runs set counts=${sql.json({supabaseCommitted:true,remote:remoteResult,flootCommitted:false})} where id=${input.runId} and status='running'`;
 await fencedRun(input.runId);
 localResult=await runStagedTransaction(()=>syncTraktHistory(1,supplied));
 }
 const counts:any={feeds:Object.fromEntries(TRAKT_FEEDS.map(f=>[f,feeds[f].length])),remote:remoteResult,replay:replayResult??null,floot:localResult,shadow:run.mode==="shadow",supabaseCommitted:run.mode==="live",flootCommitted:run.mode==="live",rawFingerprintBefore:fingerprint[0].hash};
 await finishImport(input.runId,counts);
 if(run.mode==="live")try{await pruneMarqueeBackups("trakt");}catch{console.warn("BACKUP_RETENTION_FAILED");}
 }catch(e){await failImport(input.runId,e);throw e;}
}



export const marqueeTraktFinish = (input: Parameters<typeof marqueeTraktFinishWork>[0]) => marqueeWriter.work("import:marqueeTraktFinish", () => marqueeTraktFinishWork(input), input.runId);
