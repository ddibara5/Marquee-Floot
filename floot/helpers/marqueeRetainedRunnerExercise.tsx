import postgres from "postgres";
import {createHash,randomUUID} from "node:crypto";
import {createPrivateMarqueeRetainedStoreRunner} from "./marqueeRetainedStoreRollback";
import {runtimeBindings} from "./migrationRuntimeBindings";
import {completeTraktSnapshot} from "./completeTraktSnapshot";
import {APPROVED_TRAKT_SHOWS} from "./marqueeApprovedTraktShows";
const NS="exercise_marquee_runner_20261001",NB="barrier_marquee_runner_20261001",SS="prep_marquee_runner_20261001",SB="barrier_marquee_runner_legacy_20261001";
export async function exerciseMarqueeRetainedRunner(request:Request){
 const token=request.headers.get("Authorization")?.match(/^Bearer (\S{32,})$/)?.[1];let id:unknown;
 try{({id}=await request.json());}catch{return Response.json({error:"INVALID_REQUEST"},{status:400});}
 if(!token||typeof id!=="string"||!/^[0-9a-f-]{36}$/i.test(id))return Response.json({error:"AUTH_REQUIRED"},{status:401});
 const url=process.env.POSTGRESQL_DATABASE_CONNECTION_STRING;if(!url||!process.env.FLOOT_DATABASE_URL)throw Error("DATABASE_MISSING");
 const bound=new URL(url),ref="eiskobjlvxzwvucgpenk";
 if(!(bound.hostname==="db."+ref+".supabase.co"||bound.hostname.endsWith(".pooler.supabase.com")&&decodeURIComponent(bound.username)==="postgres."+ref))throw Error("SOURCE_PROJECT_MISMATCH");
 const native=postgres(process.env.FLOOT_DATABASE_URL,{prepare:false,max:3,connect_timeout:10,idle_timeout:10});
 const lock=postgres(process.env.FLOOT_DATABASE_URL,{prepare:false,max:1,connect_timeout:10,idle_timeout:10});
 const remote=postgres(url,{prepare:false,ssl:"require",max:2,connect_timeout:10,idle_timeout:10});
 const proof:string[]=[];const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);proof.push(label);};
 let authorized=false,trigger=false;let publicDrift:string[]=[];
 try{
  const claimed=await native`update migration_backups_20260930.capabilities set consumed_at=now() where id=${id}::uuid and token_hash=${createHash("sha256").update(token).digest("hex")} and consumed_at is null and expires_at>now() returning id`;
  if(claimed.length!==1)return Response.json({error:"CAPABILITY_INVALID"},{status:403});authorized=true;
  const sourceRows=await remote.unsafe("select logical_name from "+SB+".registry order by logical_name");
  const sourceNames=sourceRows.map(r=>r.logical_name),nativeNames=Object.keys(runtimeBindings);
  const hashes=async(sql:ReturnType<typeof postgres>,schema:string,names:string[])=>{
   const out=[];for(const name of names){if(!/^[a-z][a-z0-9_]*$/.test(name))throw Error("TARGET_INVALID");
    const row= schema==="public"&&name==="sessions"?"(to_jsonb(t)-'last_accessed')":"to_jsonb(t)";
    const active= schema==="public"&&name==="sessions"?" where expires_at>now()":"";
    const [r]=await sql.unsafe("select count(*) n,md5(coalesce(string_agg(md5("+row+"::text),'' order by md5("+row+"::text)),'')) h from "+schema+"."+name+" t"+active);out.push([name,r]);}
   return JSON.stringify(out);
  };
  const publicNative=await hashes(native,"public",nativeNames),publicSource=await hashes(remote,"public",sourceNames);
  const stableNames=nativeNames.filter(n=>!["marquee_import_runs","marquee_import_pages"].includes(n));
  const nativeRetained=await hashes(native,NS,stableNames);
  check(sourceNames.length===21&&nativeNames.length===42,"exact private 21 source and42 native shapes");
  const [sourceRun]=await native.unsafe("select id from "+NS+".marquee_import_runs where source='trakt' and status='succeeded' and counts->>'flootCommitted'='true' order by finished_at desc limit 1");
  const retained=await native.unsafe("select feed,page,metadata,payload from "+NS+".marquee_import_pages where run_id=$1::uuid order by feed,page",[sourceRun.id]);
  const feeds=completeTraktSnapshot(retained as any) as Record<string,any[]>;
  const mapped=feeds.history_episodes.find(x=>APPROVED_TRAKT_SHOWS[String(x.show?.ids?.trakt)]&&x.episode?.ids?.trakt);
  if(!mapped)throw Error("MAPPED_EPISODE_REQUIRED");
  const ids=[randomUUID(),randomUUID()],eventBase=2200000000000+Number.parseInt(id.replaceAll("-","").slice(0,8),16);
  const makePages=(i:number)=>Object.entries({...feeds,history_episodes:[{...mapped,id:eventBase+i,watched_at:i?"1999-02-03T04:05:07Z":"1999-02-03T04:05:06Z"},...feeds.history_episodes]}).flatMap(([feed,rows])=>{
   const pages=Math.max(1,Math.ceil(rows.length/100));return Array.from({length:pages},(_,index)=>({feed,page:index+1,payload:rows.slice(index*100,index*100+100),metadata:{count:rows.length,pages,terminal:index===pages-1}}));
  });
  const pages=[makePages(0),makePages(1)];
  await native.unsafe("select "+NB+".resume()");await remote.unsafe("select "+SB+".resume()");
  for(let i=0;i<2;i++){
   await native.unsafe("insert into "+NS+".marquee_import_runs(id,source,mode,status,finished_at,counts) values($1::uuid,'trakt','live','succeeded',now()-($2::int*interval '1 minute'),$3::jsonb)",[ids[i],2-i,native.json({store:"native",flootCommitted:true})]);
   for(const p of i?pages[i].slice(1):pages[i])await native.unsafe("insert into "+NS+".marquee_import_pages(run_id,feed,page,payload,metadata) values($1::uuid,$2,$3,$4::jsonb,$5::jsonb)",[ids[i],p.feed,p.page,native.json(p.payload),native.json(p.metadata)]);
  }
  await native.unsafe("select "+NB+".pause()");await native.unsafe("select "+NB+".drained(0,0,true)");
  await remote.unsafe("select "+SB+".pause()");await remote.unsafe("select "+SB+".drained(0,0,true)");
  const run=createPrivateMarqueeRetainedStoreRunner(native,lock,remote),remoteBefore=await hashes(remote,SS,sourceNames);
  let gate="";try{await run();}catch(e){gate=(e as Error).message;}
  check(gate==="TRAKT_INCOMPLETE_SNAPSHOT"&&await hashes(remote,SS,sourceNames)===remoteBefore,"all-run preflight rejects later incomplete snapshot before any remote mutation");
  // Repair only newly created private test pages while frozen; leave journal enabled.
  await native.begin(async tx=>{await tx.unsafe("alter table "+NS+".marquee_import_pages disable trigger migration_gate");const p=pages[1][0];
   await tx.unsafe("insert into "+NS+".marquee_import_pages(run_id,feed,page,payload,metadata) values($1::uuid,$2,$3,$4::jsonb,$5::jsonb)",[ids[1],p.feed,p.page,tx.json(p.payload),tx.json(p.metadata)]);
   await tx.unsafe("alter table "+NS+".marquee_import_pages enable trigger migration_gate");});
  await native.unsafe("create or replace function "+NS+".fail_marker() returns trigger language plpgsql set search_path='' as $$begin if NEW.id='"+ids[0]+"'::uuid and NEW.counts->>'remoteRecoveryCommitted'='true' then raise exception 'FIXTURE_NATIVE_MARKER_FAILURE';end if;return NEW;end$$");
  await native.unsafe("create trigger runner_fail_marker before update on "+NS+".marquee_import_runs for each row execute function "+NS+".fail_marker()");trigger=true;
  gate="";try{await run();}catch(e){gate=(e as Error).message;}
  const committed=await remote.unsafe("select run_id from "+SB+".remote_receipts where run_id=any($1::uuid[])",[ids]);
  check(gate==="FIXTURE_NATIVE_MARKER_FAILURE"&&committed.length===1&&committed[0].run_id===ids[0],"chronological first remote commit survives actual native marker transaction failure");
  const firstHash=await hashes(remote,SS,sourceNames);
  await native.unsafe("drop trigger runner_fail_marker on "+NS+".marquee_import_runs");trigger=false;
  const result=await run();
  check(result.recoveredRuns===2&&result.receipts[0].replayed===true&&result.receipts[1].replayed===false,"retry acknowledges first durable receipt and recovers second chronological run");
  const after=await hashes(remote,SS,sourceNames),replay=await run();
  check(replay.recoveredRuns===0&&await hashes(remote,SS,sourceNames)===after,"completed batch rerun has zero source mutations");
  const ack=await native.unsafe("select counts from "+NS+".marquee_import_runs where id=any($1::uuid[])",[ids]);
  check(ack.length===2&&ack.every(r=>r.counts.remoteRecoveryCommitted===true&&/^[0-9a-f]{64}$/.test(r.counts.remoteRecoveryDigest)),"actual native markers contain committed receipt digests for both runs");
  const dates=await remote.unsafe("select s.source_record_id,h.watched_at from "+SS+".marquee_watch_history_sources s join "+SS+".marquee_watch_history h on h.id=s.history_id where s.source='trakt' and s.source_record_id=any($1::text[]) order by s.source_record_id",[[String(eventBase),String(eventBase+1)]]);
  check(dates.length===2&&new Date(dates[0].watched_at).toISOString()==="1999-02-03T04:05:06.000Z"&&new Date(dates[1].watched_at).toISOString()==="1999-02-03T04:05:07.000Z","real normalizer preserves two historical dates without duplicate canonical fixture events");
  check(await hashes(native,NS,stableNames)===nativeRetained,"all40 untouched native shapes including credentials sessions manual state remain exact");
  const ng=await native.unsafe("select count(*)::int n from pg_trigger where tgrelid in(select relation from "+NB+".registry) and not tgisinternal and tgenabled<>'O'");
  const sg=await remote.unsafe("select count(*)::int n from pg_trigger where tgrelid in(select relation from "+SB+".registry) and not tgisinternal and tgenabled<>'O'");
  check(ng[0].n===0&&sg[0].n===0,"all source/native migration gates and journals remain enabled after failure/retry");
  const journal=await native.unsafe("select count(*)::int n from "+NB+".journal where logical_name='marquee_import_runs' and operation='UPDATE' and after_row->'counts'->>'remoteRecoveryCommitted'='true'");
  check(journal[0].n>=2,"native acknowledgement changes remain journaled");
  const controls=await native.unsafe("select mode from "+NB+".control where id"),sourceControl=await remote.unsafe("select mode from "+SB+".control where id");
  check(controls[0].mode==="paused"&&sourceControl[0].mode==="paused"&&!result.writersResumed,"runner never resumes either store");
  await native.unsafe("select "+NB+".resume()");gate="";try{await run();}catch(e){gate=(e as Error).message;}
  check(gate==="RECOVERY_NATIVE_PAUSE_REQUIRED"&&await hashes(remote,SS,sourceNames)===after,"open native window rejects even zero-pending rerun");
  const publicAfterNative=await hashes(native,"public",nativeNames),publicAfterSource=await hashes(remote,"public",sourceNames);
  for(const [scope,before,after] of [["native",publicNative,publicAfterNative],["source",publicSource,publicAfterSource]]){const a=JSON.parse(before),b=JSON.parse(after);for(let i=0;i<a.length;i++)if(JSON.stringify(a[i])!==JSON.stringify(b[i]))publicDrift.push(scope+"."+a[i][0]);}
  check(publicDrift.length===0,"public native/source values unchanged excluding normal active-session last_accessed and expired-session cleanup");
  await native.unsafe("insert into "+NS+".runner_evidence(id,proof) values($1::uuid,$2::jsonb)",[id,native.json(proof)]);
  return Response.json({passed:true,id,checks:proof.length,proof,sourceRunId:sourceRun.id,fullPrivateRunnerExercised:true,publicSessionComparison:{activeOnly:true,excludedFields:['last_accessed']},sourceShapes:21,nativeShapes:42,productionWrites:false,providerEffects:false,fullProductionRollbackProven:false});
 }catch(e){return Response.json({error:"PRIVATE_RUNNER_EXERCISE_FAILED",checks:proof.length,publicDrift,gate:/^[A-Z_]+$/.test((e as Error).message)?(e as Error).message:"REDACTED"},{status:500});}
 finally{if(authorized){if(trigger)await native.unsafe("drop trigger if exists runner_fail_marker on "+NS+".marquee_import_runs");await native.unsafe("select "+NB+".resume()");await remote.unsafe("select "+SB+".resume()");}await Promise.all([native.end(),lock.end(),remote.end()]);}
}
