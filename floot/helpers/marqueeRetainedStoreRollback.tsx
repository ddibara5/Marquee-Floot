import postgres from "postgres";
import {createMarqueeRemoteRecovery} from "./marqueeRemoteRecovery";
import {completeTraktSnapshot} from "./completeTraktSnapshot";
import {runtimeBindings} from "./migrationRuntimeBindings";
import {APPROVED_TRAKT_SHOWS} from "./marqueeApprovedTraktShows";
const NATIVE_B="barrier_marquee_20260930_v2",SOURCE_B="barrier_marquee_legacy_live_20261001";
const SOURCE_BINDINGS:Readonly<Record<string,string>>={
  "marquee_episodes": "public.marquee_episodes",
  "marquee_franchise_overrides": "public.marquee_franchise_overrides",
  "marquee_ingest_raw": "public.marquee_ingest_raw",
  "marquee_mapping_review": "public.marquee_mapping_review",
  "marquee_movies": "public.marquee_movies",
  "marquee_ratings": "public.marquee_ratings",
  "marquee_season_release_schedules": "public.marquee_season_release_schedules",
  "marquee_seasons": "public.marquee_seasons",
  "marquee_shows": "public.marquee_shows",
  "marquee_source_mappings": "public.marquee_source_mappings",
  "marquee_statuses": "public.marquee_statuses",
  "marquee_sync_runs": "public.marquee_sync_runs",
  "marquee_sync_state": "public.marquee_sync_state",
  "marquee_titles": "public.marquee_titles",
  "marquee_undated_completion_evidence": "public.marquee_undated_completion_evidence",
  "marquee_undated_completions": "public.marquee_undated_completions",
  "marquee_verified_season_totals": "public.marquee_verified_season_totals",
  "marquee_watch_date_decisions": "public.marquee_watch_date_decisions",
  "marquee_watch_history": "public.marquee_watch_history",
  "marquee_watch_history_sources": "public.marquee_watch_history_sources",
  "marquee_watchlist": "public.marquee_watchlist"
};
const SOURCE_REF="eiskobjlvxzwvucgpenk";
type Run={id:string;status:string;counts:{store?:string;flootCommitted?:boolean;remoteRecoveryCommitted?:boolean}};
type Sql=ReturnType<typeof postgres>;
function createBoundRunner(native:Sql,lock:Sql,remote:Sql,nativeSchema:string,sourceSchema:string,nativeBarrier:string,sourceBarrier:string){
 const nativeBindings=Object.fromEntries(Object.keys(runtimeBindings).map(name=>[name,nativeSchema+"."+name]));
 const sourceBindings=Object.fromEntries(Object.keys(SOURCE_BINDINGS).map(name=>[name,sourceSchema+"."+name]));
 const requireNativeFrozen=async()=>{
  const [c]=await native.unsafe("select mode,clock_timestamp()<abort_at valid from "+nativeBarrier+".control where id");
  if(c?.mode!=="paused"||!c.valid)throw Error("RECOVERY_NATIVE_PAUSE_REQUIRED");
  if((await native.unsafe("select 1 from "+nativeBarrier+".writer_leases where released_at is null limit 1")).length)throw Error("RECOVERY_UNRESOLVED_LEASE");
  await native.unsafe("select "+nativeBarrier+".require_binding($1::jsonb)",[native.json(nativeBindings)]);
  const [work]=await native.unsafe("select (exists(select 1 from "+nativeSchema+".marquee_import_controls where run_id is not null or lease_until is not null) or exists(select 1 from "+nativeSchema+".marquee_import_runs where finished_at is null or error_code='PARTIAL_COMMIT_REVIEW_REQUIRED') or exists(select 1 from "+nativeSchema+".marquee_trakt_sync_runs where finished_at is null) or exists(select 1 from "+nativeSchema+".marquee_manual_trakt_outbox where state not in ('removed','synced'))) unresolved");
  if(work.unresolved)throw Error("RECOVERY_EXTERNAL_WORK_UNRESOLVED");
 };
 const requireSourceFrozen=async()=>{
  const [c]=await remote.unsafe("select mode,clock_timestamp()<abort_at valid from "+sourceBarrier+".control where id");
  if(c?.mode!=="paused"||!c.valid)throw Error("RECOVERY_FROZEN_WINDOW_REQUIRED");
  await remote.unsafe("select "+sourceBarrier+".verify_binding()");
  const rows=await remote.unsafe("select r.logical_name,quote_ident(n.nspname)||\'.\'||quote_ident(c.relname) path from "+sourceBarrier+".registry r join pg_class c on c.oid=r.relation join pg_namespace n on n.oid=c.relnamespace");
  if(rows.length!==21||rows.some(r=>sourceBindings[r.logical_name]!==r.path))throw Error("RECOVERY_BINDINGS_INVALID");
 };
 const run=async()=>lock.begin(async tx=>{
  const [c]=await tx.unsafe("select mode,clock_timestamp()<abort_at valid from "+nativeBarrier+".control where id for share");
  if(c?.mode!=="paused"||!c.valid)throw Error("RECOVERY_NATIVE_PAUSE_REQUIRED");
  await requireNativeFrozen();await requireSourceFrozen();
  // Preflight every retained snapshot before any remote mutation.
  const runs=await native.unsafe<Run[]>("select id,status,counts from "+nativeSchema+".marquee_import_runs where source='trakt' and counts->>'store'='native' and counts->>'flootCommitted'='true' and coalesce(counts->>'remoteRecoveryCommitted','false')<>'true' order by finished_at,id");
  const snapshots=[];
  for(const r of runs){
   if(r.status!=="succeeded")throw Error("RECOVERY_PARTIAL_COMMIT_REVIEW_REQUIRED");
   const pages=await native.unsafe("select feed,page,metadata,payload from "+nativeSchema+".marquee_import_pages where run_id=$1::uuid order by feed,page",[r.id]);
   completeTraktSnapshot(pages as any);snapshots.push({run:r,pages});
  }
  const recover=createMarqueeRemoteRecovery({remote,functionSchema:sourceSchema,receiptSchema:sourceBarrier,barrier:sourceBarrier,
   remoteBarrierKind:"legacy-table",bindings:sourceBindings,approved:APPROVED_TRAKT_SHOWS,
   requireNativeFrozen,withNativeFrozen:async<T,>(fn:()=>Promise<T>)=>fn(),
   markRecovered:async(id,digest)=>{await native.begin(async marker=>{
    await marker.unsafe("lock table "+nativeSchema+".marquee_import_runs in share row exclusive mode");
    const [r]=await marker.unsafe("select counts,status from "+nativeSchema+".marquee_import_runs where id=$1::uuid for update",[id]);
    if(r?.status!=="succeeded"||r.counts?.store!=="native"||r.counts?.flootCommitted!==true)throw Error("RECOVERY_NATIVE_COMMIT_REQUIRED");
    if(r.counts.remoteRecoveryCommitted&&r.counts.remoteRecoveryDigest!==digest)throw Error("RECOVERY_SNAPSHOT_CHANGED");
    await marker.unsafe("select "+nativeBarrier+".require_binding($1::jsonb)",[marker.json(nativeBindings)]);
    // Only this operational acknowledgement gate is suspended; row journal stays enabled.
    await marker.unsafe("alter table "+nativeSchema+".marquee_import_runs disable trigger migration_gate");
    await marker.unsafe("update "+nativeSchema+".marquee_import_runs set counts=counts||jsonb_build_object('remoteRecoveryCommitted',true,'remoteRecoveryDigest',$2::text) where id=$1::uuid",[id,digest]);
    await marker.unsafe("alter table "+nativeSchema+".marquee_import_runs enable trigger migration_gate");
    await marker.unsafe("select "+nativeBarrier+".require_binding($1::jsonb)",[marker.json(nativeBindings)]);
   });}
  });
  const receipts=[];
  for(const snapshot of snapshots)receipts.push(await recover(snapshot.run,snapshot.pages as any));
  await requireNativeFrozen();await requireSourceFrozen();
  return {recoveredRuns:receipts.length,receipts,writersResumed:false,authRetained:true,fullProductionRollbackProven:false};
 });
 return run;
}
// Fixed private schemas only; the endpoint never accepts schemas or SQL from callers.
// Uses the identical runner implementation as the production-bound factory.
export function createPrivateMarqueeRetainedStoreRunner(native:Sql,lock:Sql,remote:Sql){
 return createBoundRunner(native,lock,remote,"exercise_marquee_runner_20261001","prep_marquee_runner_20261001","barrier_marquee_runner_20261001","barrier_marquee_runner_legacy_20261001");
}
// Operator-only backend factory. No routing switch, provider send or automatic resume.
// Package/backup arguments are operator attestations, not authorization or backup proof.
export function createMarqueeRetainedStoreRollback(config:{approvedPackage:string;finalBackupReceipt:string}){
 if(config.approvedPackage!=="marquee:rollback:20261001"||!config.finalBackupReceipt.trim())throw Error("SEPARATE_ROLLBACK_APPROVAL_REQUIRED");
 const nativeUrl=process.env.FLOOT_DATABASE_URL,sourceUrl=process.env.POSTGRESQL_DATABASE_CONNECTION_STRING;
 if(!nativeUrl||!sourceUrl)throw Error("ROLLBACK_DATABASE_BINDING_MISSING");
 const sourceBinding=new URL(sourceUrl);
 if(!(sourceBinding.hostname==="db."+SOURCE_REF+".supabase.co"||
  sourceBinding.hostname.endsWith(".pooler.supabase.com")&&decodeURIComponent(sourceBinding.username)==="postgres."+SOURCE_REF))throw Error("SOURCE_PROJECT_MISMATCH");
 const native=postgres(nativeUrl,{prepare:false,max:3,connect_timeout:10,idle_timeout:10});
 const lock=postgres(nativeUrl,{prepare:false,max:1,connect_timeout:10,idle_timeout:10});
 const remote=postgres(sourceUrl,{prepare:false,ssl:"require",max:2,connect_timeout:10,idle_timeout:10});
 const run=createBoundRunner(native,lock,remote,"public","public",NATIVE_B,SOURCE_B);
 return {run,close:async()=>{await Promise.all([native.end(),lock.end(),remote.end()]);}};
}
