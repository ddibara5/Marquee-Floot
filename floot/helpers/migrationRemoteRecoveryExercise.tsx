import {createHash,randomUUID} from "node:crypto";
import {migrationBackupSql} from "./migrationCreateBackup";
import {createMarqueeRemoteRecovery} from "./marqueeRemoteRecovery";
import postgres from "postgres";
import {completeTraktSnapshot} from "./completeTraktSnapshot";
const S="recovery_marquee_20261001",B="barrier_marquee_recovery_20261001";
const APPROVED:Record<string,boolean>={"245":true,"364":true,"614":true,"1095":true,"1424":true,"1425":true,"1693":true,"2109":true,"2276":true,"2356":true,"2588":true,"2692":true,"4170":true,"4289":true,"4430":true,"4583":true,"8312":true,"10234":true,"11093":true,"15567":true,"16926":true,"18265":true,"30569":true,"31360":true,"32585":true,"33733":true,"34818":true,"39108":true,"39132":true,"40105":true,"41522":true,"43311":true,"43925":true,"48562":true,"48702":true,"53085":true,"54001":true,"60267":true,"60635":true,"66441":true,"68319":true,"69829":true,"70310":true,"71911":true,"73817":true,"74403":true,"74880":true,"76226":true,"77199":true,"77779":true,"77805":true,"77807":true,"78111":true,"81672":true,"95756":true,"98464":true,"98985":true,"99667":true,"99718":true,"101123":true,"102630":true,"103318":true,"103769":true,"103936":true,"104439":true,"107690":true,"109975":true,"113656":true,"113835":true,"113938":true,"116965":true,"119017":true,"119095":true,"119887":true,"122019":true,"123489":true,"125479":true,"127167":true,"129957":true,"132543":true,"135147":true,"136561":true,"136863":true,"137198":true,"138163":true,"138758":true,"140481":true,"142048":true,"144009":true,"144668":true,"145411":true,"145781":true,"146733":true,"147971":true,"149786":true,"150469":true,"151853":true,"152104":true,"152473":true,"153862":true,"154164":true,"154574":true,"154822":true,"154997":true,"155534":true,"157190":true,"157503":true,"157599":true,"157664":true,"158947":true,"159815":true,"162205":true,"162639":true,"163965":true,"164423":true,"167187":true,"168471":true,"169967":true,"170559":true,"170568":true,"170649":true,"171129":true,"172648":true,"174425":true,"174953":true,"180770":true,"181803":true,"181978":true,"184618":true,"187507":true,"188205":true,"194117":true,"194907":true,"195271":true,"195644":true,"204141":true,"205347":true,"206790":true,"206920":true,"210223":true,"215466":true,"217658":true,"223228":true,"225096":true,"228099":true,"233089":true,"233955":true,"235622":true,"240024":true,"242387":true,"247058":true,"248773":true,"249443":true,"253675":true,"254678":true,"262017":true,"274856":true,"282764":true,"320339":true,"327172":true};
export async function migrationRemoteRecoveryExercise(request:Request,target?:{remote:ReturnType<typeof postgres>;schema:string;barrier:string}){
 const R=target?.schema??S,RB=target?.barrier??B;
 if(!/^[a-z][a-z0-9_]*$/.test(R)||!/^[a-z][a-z0-9_]*$/.test(RB))throw Error('PRIVATE_TARGET_INVALID');
 const sql=postgres(process.env.FLOOT_DATABASE_URL!,{prepare:false,max:4,connection:{application_name:"marquee-private-recovery"}}),proof:string[]=[];
 const nativeLock=postgres(process.env.FLOOT_DATABASE_URL!,{prepare:false,max:2,connection:{application_name:"marquee-private-freeze"}});
 const remote=target?.remote??sql;
 const check=(ok:boolean,label:string)=>{if(!ok)throw Error(label);proof.push(label);};
 let paused=false;
 try{
  const {id}=await request.json(),token=request.headers.get("Authorization")?.replace(/^Bearer /,"");
  if(typeof id!=="string"||!token)return Response.json({error:"AUTH_REQUIRED"},{status:401});
  const claimed=await sql`update migration_backups_20260930.capabilities set consumed_at=now() where id=${id}::uuid and token_hash=${createHash("sha256").update(token).digest("hex")} and consumed_at is null and expires_at>now() returning id`;
  if(claimed.length!==1)return Response.json({error:"CAPABILITY_INVALID"},{status:403});
  const publicHash=async()=>{const rows=await sql`select table_name from information_schema.tables where table_schema='public' and (table_name like 'marquee_%' or table_name=any(array['users','sessions','user_passwords','login_attempts'])) order by table_name`;const out=[];for(const r of rows){const [h]=await sql.unsafe("select count(*) n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) h from public."+r.table_name+" t");out.push([r.table_name,h]);}return JSON.stringify(out);};
  const beforePublic=await publicHash();
  const nativeFrozen=async()=>{const [c]=await sql.unsafe("select paused from "+S+".native_control where id");if(!c.paused)throw Error("RECOVERY_NATIVE_PAUSE_REQUIRED");};
  const registry=await remote.unsafe("select logical_name,relation::text path from "+RB+".registry order by logical_name");
  check(registry.length===21,"all 21 retained legacy tables registered with exact physical bindings");
  const bindings=Object.fromEntries(registry.map(r=>[r.logical_name,r.path]));
  const hashRemote=async()=>{const out=[];for(const r of registry){const [h]=await remote.unsafe("select count(*) n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) h from "+r.path+" t");out.push([r.logical_name,h]);}return JSON.stringify(out);};
  const [sourceRun]=await sql`select id from public.marquee_import_runs where source='trakt' and mode='live' and status='succeeded' and counts->>'flootCommitted'='true' order by finished_at desc limit 1`;
  if(!sourceRun)throw Error("SOURCE_SNAPSHOT_REQUIRED");
  const pages=await sql`select feed,page,metadata,payload from public.marquee_import_pages where run_id=${sourceRun.id} order by feed,page`;
  const feeds=completeTraktSnapshot(pages as any) as Record<string,any[]>;
  const mapped=feeds.history_episodes.find(x=>APPROVED[String(x.show?.ids?.trakt)]&&x.episode?.ids?.trakt);
  if(!mapped)throw Error("FIXTURE_MAPPED_EPISODE_REQUIRED");
  const fixtureEvent={...mapped,id:2147000000000+Number.parseInt(id.replaceAll("-","").slice(0,8),16),watched_at:"1999-01-02T03:04:05Z"};
  feeds.history_episodes=[fixtureEvent,...feeds.history_episodes];
  const fixturePages=Object.entries(feeds).flatMap(([feed,rows])=>{const count=rows.length,pages=Math.max(1,Math.ceil(count/100));return Array.from({length:pages},(_,i)=>({feed,page:i+1,payload:rows.slice(i*100,(i+1)*100),metadata:{count,pages,terminal:i===pages-1}}));});
  await remote.unsafe("select "+RB+".pause()");await remote.unsafe("select "+RB+".drained(0,0,true)");paused=true;await sql.unsafe("update "+S+".native_control set paused=true where id");
  let markerFails=true,markers=0;
  const recover=createMarqueeRemoteRecovery({remote,functionSchema:R,receiptSchema:R,barrier:RB,bindings,approved:APPROVED,requireNativeFrozen:nativeFrozen,withNativeFrozen:async <T,>(fn:()=>Promise<T>)=>{const result=await nativeLock.begin(async tx=>{const [c]=await tx.unsafe("select paused from "+S+".native_control where id for share");if(!c.paused)throw Error("RECOVERY_NATIVE_PAUSE_REQUIRED");return {value:await fn()};});return result.value;},
   markRecovered:async(runId,digest)=>{if(markerFails)throw Error("FIXTURE_LOCAL_MARKER_FAILURE");await sql.unsafe("insert into "+S+".native_markers values($1::uuid,$2) on conflict(run_id) do update set snapshot_sha256=excluded.snapshot_sha256",[runId,digest]);markers++;}});
  const run={id,counts:{store:"native",flootCommitted:true,supabaseCommitted:false}};
  let rejected=false;
  try{await recover(run,fixturePages.slice(1));}catch(e){rejected=(e as Error).message==="TRAKT_INCOMPLETE_SNAPSHOT";}
  check(rejected,"incomplete source evidence rejects recovery before remote writes");
  let crashed=false;try{await recover(run,fixturePages);}catch(e){crashed=(e as Error).message==="FIXTURE_LOCAL_MARKER_FAILURE";console.warn("REMOTE_PROBE",String((e as any).code??"RUNTIME"),String((e as any).constraint??""),/^[A-Z_]+$/.test((e as Error).message)?(e as Error).message:"SQL_FAILURE");}
  check(crashed,"remote commit survives local-marker failure without claiming composed completion");
  const [durable]=await remote.unsafe("select result from "+R+".remote_receipts where run_id=$1::uuid",[id]);
  check(Number(durable?.result?.inserted)>=1,"actual retained Trakt normalizer commits new historical fixture event with durable receipt");
  const [historical]=await remote.unsafe("select h.watched_at from "+R+".marquee_watch_history_sources s join "+R+".marquee_watch_history h on h.id=s.history_id where s.source='trakt' and s.source_record_id=$1",[String(fixtureEvent.id)]);
  check(new Date(historical?.watched_at).toISOString()==="1999-01-02T03:04:05.000Z","remote catchup preserves historical provider date");
  const afterCommit=await hashRemote();
  markerFails=false;const retry=await recover(run,fixturePages);
  check(retry.replayed&&markers===1&&await hashRemote()===afterCommit,"restart repairs local marker without rerunning committed remote snapshot");
  const concurrent=await Promise.all([recover(run,fixturePages),recover(run,fixturePages)]);
  check(concurrent.every(r=>r.replayed)&&await hashRemote()===afterCommit,"concurrent retries reuse exact receipt with zero domain mutations");
  const altered=structuredClone(fixturePages);(altered.find(p=>p.feed==="history_episodes")!.payload[0] as any).watched_at="2000-01-02T03:04:05Z";
  let changed=false;try{await recover(run,altered);}catch(e){changed=(e as Error).message==="RECOVERY_SNAPSHOT_CHANGED";}
  check(changed&&await hashRemote()===afterCommit,"changed snapshot under same run ID fails closed");
  const invalid=structuredClone(fixturePages);(invalid.find(p=>p.feed==="history_episodes")!.payload[0] as any).id=null;
  let invalidRejected=false;try{await recover({...run,id:randomUUID()},invalid);}catch{invalidRejected=true;}
  check(invalidRejected&&await hashRemote()===afterCommit,"normalizer failure is atomic across all retained table values");
  const [disabled]=await remote.unsafe("select count(*)::int n from pg_trigger where tgrelid in(select relation from "+RB+".registry) and not tgisinternal and tgenabled='D'");
  check(disabled.n===0,"failed recovery restores enabled gates and journals");
  await remote.unsafe("select "+RB+".resume()");paused=false;await sql.unsafe("update "+S+".native_control set paused=false where id");
  let openRejected=false;try{await recover(run,fixturePages);}catch(e){openRejected=(e as Error).message==="RECOVERY_NATIVE_PAUSE_REQUIRED";}
  check(openRejected&&await hashRemote()===afterCommit,"open writer window rejects recovery even for a replay");
  check(await publicHash()===beforePublic,"public native Auth manual history and operational tables unchanged");
  await sql.unsafe("create table if not exists "+S+".exercise_evidence(id uuid primary key,proof jsonb,created_at timestamptz default now())");
  await sql.unsafe("insert into "+S+".exercise_evidence(id,proof) values($1::uuid,$2::jsonb)",[id,sql.json(proof)]);
  return Response.json({passed:true,checks:proof.length,proof,id,sourceRunId:sourceRun.id,crossResource:Boolean(target),productionWrites:false,liveProviderEffects:false,fullProductionRollbackProven:false});
 }catch(e){console.warn("PRIVATE_REMOTE_RECOVERY_FAILED",(e as any).code??"RUNTIME");return Response.json({error:"PRIVATE_REMOTE_RECOVERY_FAILED",gate:/^[A-Z_]+$/.test((e as Error).message)?(e as Error).message:"REDACTED",checks:proof.length},{status:500});}
 finally{if(paused)await remote.unsafe("select "+RB+".resume()");await sql.unsafe("update "+S+".native_control set paused=false where id");await sql.end();await nativeLock.end();}
}

