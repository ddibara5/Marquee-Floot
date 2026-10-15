import {createHash} from "node:crypto";
import type postgres from "postgres";
import {completeTraktSnapshot} from "./completeTraktSnapshot";
type Sql=ReturnType<typeof postgres>;
type Page=Parameters<typeof completeTraktSnapshot>[0][number];
type Run={id:string;counts:{store?:string;flootCommitted?:boolean;supabaseCommitted?:boolean}};
export function createMarqueeRemoteRecovery(config:{
 remote:Sql;functionSchema:string;receiptSchema:string;barrier:string;bindings:Readonly<Record<string,string>>;
 remoteBarrierKind?:"runtime"|"legacy-table";
 approved:Readonly<Record<string,boolean>>;requireNativeFrozen:()=>Promise<void>;
 markRecovered:(id:string,digest:string)=>Promise<void>;
 // Hold the native paused control lock for the whole distributed recovery operation.
 withNativeFrozen:<T>(fn:()=>Promise<T>)=>Promise<T>;
}){
 for(const value of [config.functionSchema,config.receiptSchema,config.barrier])if(!/^[a-z][a-z0-9_]*$/.test(value))throw Error("RECOVERY_SCHEMA_INVALID");
 const barrierKind=config.remoteBarrierKind??"runtime";
 if(barrierKind!=="runtime"&&barrierKind!=="legacy-table")throw Error("RECOVERY_BARRIER_KIND_INVALID");
 const relations=Object.entries(config.bindings);
 if(!relations.length||relations.some(([name,path])=>!/^marquee_/.test(name)||path!==config.functionSchema+"."+name||!/^[a-z][a-z0-9_]*$/.test(name)))throw Error("RECOVERY_BINDINGS_INVALID");
 const requireBinding=async(tx:Pick<Sql,"unsafe"|"json">)=>{
  if(barrierKind==="runtime"){await tx.unsafe("select "+config.barrier+".require_binding($1::jsonb)",[tx.json(config.bindings)]);return;}
  await tx.unsafe("select "+config.barrier+".verify_binding()");
  const rows=await tx.unsafe("select r.logical_name,quote_ident(n.nspname)||\'.\'||quote_ident(c.relname) path from "+config.barrier+".registry r join pg_class c on c.oid=r.relation join pg_namespace n on n.oid=c.relnamespace");
  if(rows.length!==relations.length||rows.some(r=>config.bindings[r.logical_name]!==r.path))throw Error("RECOVERY_BINDINGS_INVALID");
 };
 return async(run:Run,pages:Page[])=>config.withNativeFrozen(async()=>{
  if(!/^[0-9a-f-]{36}$/i.test(run.id)||run.counts.store!=="native"||run.counts.flootCommitted!==true)throw Error("RECOVERY_NATIVE_COMMIT_REQUIRED");
  const feeds=completeTraktSnapshot(pages),digest=createHash("sha256").update(JSON.stringify(feeds)).digest("hex");
  await config.requireNativeFrozen();
  const receipt=await config.remote.begin(async tx=>{
   const [control]=await tx.unsafe("select mode,clock_timestamp()<abort_at valid from "+config.barrier+".control where id for update");
   if(control?.mode!=="paused"||!control.valid)throw Error("RECOVERY_FROZEN_WINDOW_REQUIRED");
   if(barrierKind==="runtime"&&(await tx.unsafe("select 1 from "+config.barrier+".writer_leases where released_at is null limit 1")).length)throw Error("RECOVERY_UNRESOLVED_LEASE");
   await requireBinding(tx);
   const [prior]=await tx.unsafe("select snapshot_sha256,result from "+config.receiptSchema+".remote_receipts where run_id=$1::uuid",[run.id]);
   if(prior){
    if(prior.snapshot_sha256!==digest)throw Error("RECOVERY_SNAPSHOT_CHANGED");
    return {replayed:true,result:prior.result};
   }
   // Only reviewed statement gates are suspended inside the locked recovery transaction.
   // Row journals and non-migration policy/constraint triggers remain enabled.
   for(const [,path] of relations){
    await tx.unsafe("lock table "+path+" in share row exclusive mode");
    await tx.unsafe("alter table "+path+" disable trigger migration_gate");
   }
   const [applied]=await tx.unsafe("select "+config.functionSchema+".marquee_trakt_apply_snapshot($1::uuid,$2::jsonb,$3::jsonb,$4) result",
    ["c566e7e0-880a-430d-85df-c40484144a91",tx.json(feeds as postgres.JSONValue),tx.json(config.approved),"rollback:"+run.id]);
   await tx.unsafe("set constraints all immediate");
   for(const [,path]of relations)await tx.unsafe("alter table "+path+" enable trigger migration_gate");
   await requireBinding(tx);
   await tx.unsafe("insert into "+config.receiptSchema+".remote_receipts(run_id,snapshot_sha256,result) values($1::uuid,$2,$3::jsonb)",[run.id,digest,tx.json(applied.result)]);
   return {replayed:false,result:applied.result};
  });
  // Crash here leaves the remote transaction receipt. Retry does not call the normalizer twice.
  await config.requireNativeFrozen();
  await config.markRecovered(run.id,digest);
  return {runId:run.id,snapshotSha256:digest,...receipt};
 });
}
