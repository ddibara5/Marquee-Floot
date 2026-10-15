import superjson from "superjson";
import {exerciseAuthApi} from "./migrationAuthApiExercise";
import { createHash, randomUUID } from "node:crypto";
import { hash, compare } from "bcryptjs";
import postgres from "postgres";
import { Kysely, CamelCasePlugin } from "kysely";
import {createServerUserSession} from "./getServerUserSession";
import {createTraktTokenProvider} from "./traktTokenProvider";
import {createTraktHistoryWriteback} from "./traktHistoryWriteback";
import {encryptSecret,decryptSecret} from "./secretCrypto";
import { PostgresJSDialect } from "kysely-postgres-js";
import { migrationBackupSql } from "./migrationCreateBackup";
import { createMigrationWriter } from "./migrationWriter";
import { getServerSessionOrThrow, setServerSession } from "./getSetServerSession";

const S="exercise_marquee_runtime_20261001",R="retained_marquee_runtime_20261001",B="verify_marquee_runtime_20261001",RB="transfer_marquee_runtime_20261001";
const TABLES=["users","sessions","user_passwords","login_attempts","marquee_titles","marquee_seasons","marquee_episodes","marquee_watch_events","marquee_manual_title_statuses","marquee_episode_unwatched","marquee_manual_trakt_outbox","marquee_trakt_oauth","marquee_import_runs","marquee_import_controls","marquee_crunchyroll_raw","marquee_crunchyroll_review","marquee_crunchyroll_sync_runs","marquee_crunchyroll_sync_state","marquee_import_backups","marquee_import_pages","marquee_legacy_completions","marquee_legacy_import","marquee_legacy_links","marquee_legacy_ratings","marquee_legacy_statuses","marquee_legacy_watchlist","marquee_manual_episode_completions","marquee_series_catchup_corrections","marquee_source_mappings","marquee_title_aliases","marquee_title_progress_baseline","marquee_title_watch_events","marquee_tmdb_mappings","marquee_tmdb_refresh_state","marquee_trakt_device_auth","marquee_trakt_mappings","marquee_trakt_pending","marquee_trakt_personal_sync_state","marquee_trakt_ratings","marquee_trakt_sync_runs","marquee_trakt_sync_state","marquee_trakt_watchlist"];
// One-use, server-validated capability. This harness has no configurable schemas or external effects.
export async function migrationRuntimeExercise(request: Request) {
 const sql=migrationBackupSql(), proof:string[]=[];
 let db:Kysely<any>|undefined;
 const check=(value:boolean,name:string)=>{if(!value)throw Error(name);proof.push(name);};
 try {
  const {id}=await request.json(),token=request.headers.get("Authorization")?.replace(/^Bearer /,"");
  if(typeof id!=="string"||!token)return Response.json({error:"AUTH_REQUIRED"},{status:401});
  const digest=createHash("sha256").update(token).digest("hex");
  const used=await sql`update migration_backups_20260930.capabilities set consumed_at=now() where id=${id} and token_hash=${digest} and consumed_at is null and expires_at>now() returning id`;
  if(used.length!==1)return Response.json({error:"CAPABILITY_INVALID"},{status:403});
  const publicSequences=async()=>{
   const list=await sql`select c.oid::regclass::text name from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='S' and n.nspname='public' order by c.relname`;
   const values=[];for(const item of list){const [r]=await sql.unsafe("select last_value,is_called from "+item.name);values.push([item.name,r]);}return JSON.stringify(values);
  };
  const sequenceBefore=await publicSequences();
  const hashes=async(schema:string)=>{const out=[];for(const t of TABLES){const [r]=await sql.unsafe("select count(*) n,md5(coalesce(string_agg(md5(to_jsonb(x)::text),'' order by md5(to_jsonb(x)::text)),'')) h from "+schema+"."+t+" x");out.push([t,r]);}return JSON.stringify(out);};
  const registered=await sql.unsafe("select logical_name from "+B+".registry order by logical_name");
  check(JSON.stringify(registered.map(x=>x.logical_name))===JSON.stringify([...TABLES].sort()),"every active table and native auth table is registered in the private barrier");
  check(await hashes(S)===await hashes(R),"initial exact fixture parity");
  const fixtureBindingProof=Object.fromEntries(TABLES.map(t=>[t,S+"."+t]));
  await sql.unsafe("select "+B+".require_binding($1::jsonb)",[sql.json(fixtureBindingProof)]);
  check(true,"physical table binding includes exact keys and enabled gate/journal triggers");
  let wrongBindingDenied=false,bindingEffects=0;
  const wrongWriter=createMigrationWriter({active:()=>true,barrier:B,sql:()=>sql,bindings:{...fixtureBindingProof,users:R+".users"}});
  try{await wrongWriter.work("fixture:wrong-binding",async()=>{bindingEffects++;});}catch(e){console.warn("BINDING_PROBE",String((e as Error).message).slice(0,200),(e as any).code);wrongBindingDenied=(e as Error).message==="MIGRATION_BINDING_MISMATCH";}
  check(wrongBindingDenied&&bindingEffects===0,"wrong physical table binding rejects work before effects");
  await sql.unsafe("DO $probe$ DECLARE rejected boolean=false; BEGIN BEGIN ALTER TABLE "+S+".login_attempts DISABLE TRIGGER migration_journal; PERFORM "+B+".require_binding('"+JSON.stringify(fixtureBindingProof)+"'::jsonb); EXCEPTION WHEN SQLSTATE 'P0001' THEN IF SQLERRM='MIGRATION_BINDING_TRIGGER_MISMATCH' THEN rejected=true; ELSE RAISE; END IF; END; IF NOT rejected THEN RAISE EXCEPTION 'DISABLED_JOURNAL_NOT_REJECTED'; END IF; END $probe$;");
  check(true,"disabled journal fails binding check and probe rolls back trigger change");
  const [{lower}]=await sql.unsafe("select coalesce(max(id),0)::text lower from "+B+".journal");
  const fixtureBindings=Object.fromEntries(TABLES.map(t=>[t,S+"."+t]));
  const writer=createMigrationWriter({active:()=>true,barrier:B,sql:()=>sql,bindings:fixtureBindings});
  const client=postgres(process.env.FLOOT_DATABASE_URL!,{prepare:false,max:2,idle_timeout:5,connect_timeout:10,connection:{search_path:S+",pg_catalog"}});
  db=new Kysely<any>({dialect:writer.dialect(new PostgresJSDialect({postgres:client}))}).withSchema(S);
  const database=db,guardedSql=writer.sql(sql),sessionId=randomUUID();
  const getFixtureUser=createServerUserSession(database.withPlugin(new CamelCasePlugin()),async userId=>userId===1);
  const passwordHash=await hash("migration-fixture-password",12);
  await writer.work("fixture:auth",async()=>database.transaction().execute(async tx=>{
    await tx.updateTable("user_passwords").set({password_hash:passwordHash}).where("user_id","=",1).execute();
    await tx.insertInto("sessions").values({id:sessionId,user_id:1,created_at:new Date("1999-01-02T03:04:05Z"),last_accessed:new Date("1999-01-02T03:04:05Z"),expires_at:new Date(Date.now()+3600000)}).execute();
    await tx.insertInto("login_attempts").values({email:"migration-fixture@example.invalid",success:true}).execute();
  }));
  const stored=await database.selectFrom("user_passwords").select("password_hash").where("user_id","=",1).executeTakeFirstOrThrow();
  check(await compare("migration-fixture-password",stored.password_hash),"native password authentication against fixture");
  const cookieResponse=new Response("fixture");
  await setServerSession(cookieResponse,{id:sessionId,createdAt:Date.now(),lastAccessed:Date.now()});
  const cookie=cookieResponse.headers.get("Set-Cookie")!.split(";")[0];
  const expiredSession=randomUUID();
  await writer.work("fixture:expired-session",async()=>database.insertInto("sessions").values({id:expiredSession,user_id:1,created_at:new Date("1999-01-02"),last_accessed:new Date("1999-01-02"),expires_at:new Date("2000-01-02")}).execute());
  const expiredCookie=new Response("fixture");await setServerSession(expiredCookie,{id:expiredSession,createdAt:Date.now(),lastAccessed:Date.now()});
  let deniedExpired=false;
  try{await writer.work("fixture:expired-auth",()=>getFixtureUser(new Request("https://fixture.invalid/",{headers:{cookie:expiredCookie.headers.get("Set-Cookie")!.split(";")[0]}})));}catch(e){deniedExpired=(e as Error).name==="NotAuthenticatedError";}
  check(deniedExpired,"actual server session helper rejects expired database sessions");
  let effects=0;
  const api=writer.endpoint(async req=>{
    try {
      const {session}=await getFixtureUser(req);
      const owner=await database.selectFrom("sessions").innerJoin("owner_crosswalk","owner_crosswalk.native_user_id","sessions.user_id").select("sessions.user_id").where("sessions.id","=",session.id).where("sessions.expires_at",">",new Date()).where("owner_crosswalk.legacy_owner","=","c566e7e0-880a-430d-85df-c40484144a91").executeTakeFirst();
      if(!owner)return Response.json({error:"OWNER_REQUIRED"},{status:403});
      await database.updateTable("sessions").set({last_accessed:new Date()}).where("id","=",session.id).execute();
      await database.transaction().execute(async tx=>{
        const [episode]=await guardedSql.unsafe("select e.id,s.title_id from "+S+".marquee_episodes e join "+S+".marquee_seasons s on s.id=e.season_id order by e.id limit 1");
        await tx.insertInto("marquee_manual_title_statuses").values({user_id:1,title_id:episode.title_id,status:"paused"}).onConflict(oc=>oc.columns(["user_id","title_id"]).doUpdateSet({status:"paused"})).execute();
        await tx.insertInto("marquee_episode_unwatched").values({user_id:1,episode_id:episode.id}).onConflict(oc=>oc.columns(["user_id","episode_id"]).doNothing()).execute();
        const event=await tx.insertInto("marquee_watch_events").values({user_id:1,episode_id:episode.id,source:"manual",source_event_key:"fixture:"+sessionId,watched_at:new Date("1999-01-02T03:04:05Z")}).returning("id").executeTakeFirstOrThrow();
        await tx.insertInto("marquee_manual_trakt_outbox").values({source_event_key:"fixture:"+sessionId,user_id:1,kind:"episode",local_event_id:event.id,title_id:episode.title_id,episode_id:episode.id,watched_at:new Date("1999-01-02T03:04:05Z"),state:"uncertain",attempts:1,last_error:"FIXTURE_PROVIDER_UNCERTAIN"}).execute();
        await tx.deleteFrom("marquee_watch_events").where("id","=",event.id).execute();
        await tx.updateTable("marquee_trakt_oauth").set({access_token_cipher:"fixture-access-rotated",refresh_token_cipher:"fixture-refresh-rotated"}).where("user_id","=",1).execute();
        effects++; // Mock uncertain writeback: native outbox evidence remains, no Trakt request.
      });
      return Response.json({saved:true});
    } catch(e) {if((e as Error).name==="NotAuthenticatedError")return Response.json({error:"OWNER_REQUIRED"},{status:403});throw e;}
  },"fixture:manual");
  check((await api(new Request("https://fixture.invalid/",{method:"POST"}))).status===403,"API rejects absent native identity");
  check((await api(new Request("https://fixture.invalid/",{method:"POST",headers:{cookie}}))).status===200,"signed-session owner API admitted with manual writes");

  const providerDb=database.withPlugin(new CamelCasePlugin());
  let refreshCalls=0,writebackAdds=0,writebackRemoves=0;
  await writer.work("fixture:provider-seed",()=>providerDb.updateTable("marqueeTraktOauth").set({accessTokenCipher:encryptSecret("fixture-before:"+sessionId),refreshTokenCipher:encryptSecret("fixture-refresh-before:"+sessionId),expiresAt:new Date("2000-01-02")}).where("userId","=",1).execute());
  const tokenProvider=createTraktTokenProvider(providerDb,async()=>{refreshCalls++;return {access_token:"fixture-access:"+sessionId,refresh_token:"fixture-refresh:"+sessionId,expires_in:604800};});
  const access=await writer.work("fixture:actual-refresh",()=>tokenProvider(1));
  const refreshed=await providerDb.selectFrom("marqueeTraktOauth").selectAll().where("userId","=",1).executeTakeFirstOrThrow();
  check(refreshCalls===1&&access==="fixture-access:"+sessionId&&decryptSecret(refreshed.refreshTokenCipher)==="fixture-refresh:"+sessionId,"actual token-refresh adapter rotates encrypted fixture credentials");
  await writer.work("fixture:refresh-replay",()=>tokenProvider(1));
  check(refreshCalls===1,"actual refresh retry reuses valid encrypted credentials without resending");
  await writer.work("fixture:malformed-refresh-seed",()=>providerDb.updateTable("marqueeTraktOauth").set({expiresAt:new Date("2000-01-02")}).where("userId","=",1).execute());
  const credentialBefore=JSON.stringify(await providerDb.selectFrom("marqueeTraktOauth").selectAll().where("userId","=",1).execute());
  const badProvider=createTraktTokenProvider(providerDb,async()=>({access_token:"",refresh_token:""}));
  let malformedDenied=false;try{await writer.work("fixture:malformed-refresh",()=>badProvider(1));}catch(e){malformedDenied=(e as Error).message==="TRAKT_CREDENTIAL_RECONNECT_REQUIRED";}
  check(malformedDenied&&credentialBefore===JSON.stringify(await providerDb.selectFrom("marqueeTraktOauth").selectAll().where("userId","=",1).execute()),"malformed provider refresh leaves stored credentials unchanged");
  await writer.work("fixture:refresh-recover",()=>providerDb.updateTable("marqueeTraktOauth").set({expiresAt:new Date("2030-01-02")}).where("userId","=",1).execute());
  const [episode]=await sql.unsafe("select e.id,s.title_id from "+S+".marquee_episodes e join "+S+".marquee_seasons s on s.id=e.season_id order by e.id limit 1");
  const outboxKey="fixture-adapter:"+sessionId;
  const [fixtureLocalKey]=await sql.unsafe("select nextval(pg_get_serial_sequence($1,'id'))::int id",[S+".marquee_watch_events"]);
  await writer.work("fixture:writeback-seed",()=>providerDb.insertInto("marqueeManualTraktOutbox").values({sourceEventKey:outboxKey,userId:1,kind:"episode",localEventId:-Number(fixtureLocalKey.id),titleId:episode.title_id,episodeId:episode.id,traktId:"2100000001",watchedAt:new Date("1999-01-02T03:04:05Z"),state:"pending",attempts:0}).execute());
  const transport:typeof fetch=async url=>{if(String(url).endsWith("/remove")){writebackRemoves++;return Response.json({deleted:{episodes:1}});}writebackAdds++;return Response.json({added:{episodes:1}});};
  const writeback=createTraktHistoryWriteback(providerDb,transport,async()=>[]);
  const uncertain=await writer.work("fixture:actual-writeback",()=>writeback.syncManualTraktEvent(1,outboxKey,access));
  const retry=await writer.work("fixture:writeback-retry",()=>writeback.syncManualTraktEvent(1,outboxKey,access));
  check(uncertain==="uncertain"&&retry==="uncertain"&&writebackAdds===1,"actual accepted-but-unconfirmed writeback preserves uncertainty and prevents immediate resend");
  await writer.work("fixture:writeback-remove-seed",()=>providerDb.updateTable("marqueeManualTraktOutbox").set({state:"remove_pending",traktHistoryId:String(2100000002+Number(fixtureLocalKey.id))}).where("sourceEventKey","=",outboxKey).execute());
  const removed=await writer.work("fixture:actual-writeback-remove",()=>writeback.syncManualTraktEvent(1,outboxKey,access));
  check(removed==="removed"&&writebackRemoves===1,"actual writeback removal preserves its tombstone after mocked provider acceptance");
  let ready!:()=>void,release!:()=>void;
  const started=new Promise<void>(r=>ready=r),hold=new Promise<void>(r=>release=r);
  const inFlight=writer.work("fixture:provider",async()=>guardedSql.begin(async tx=>{ready();await hold;await tx.unsafe("update "+S+".sessions set last_accessed='2000-01-02' where id=$1",[sessionId]);}));
  await started;let timedOut=false;
  try{await sql.begin(async tx=>{await tx.unsafe("SET LOCAL lock_timeout='250ms'");await tx.unsafe("select "+B+".pause()");});}catch(e){if((e as any).code!=="55P03")throw e;timedOut=true;}finally{release();await inFlight;}
  check(timedOut,"pause waits for a real admitted transaction and times out safely");
  const leaseId=randomUUID();await sql.unsafe("select "+B+".acquire_lease($1::uuid,'fixture:queued')",[leaseId]);
  await sql.unsafe("select "+B+".pause()");
  const priorEffects=effects;
  check((await api(new Request("https://fixture.invalid/",{method:"POST",headers:{cookie}}))).status===503&&effects===priorEffects,"draining rejects new APIs before effects");
  let providerPaused=false;try{await writer.work("fixture:paused-provider",()=>tokenProvider(1));}catch(e){providerPaused=(e as Error).message==="MIGRATION_WRITER_PAUSED";}
  check(providerPaused&&refreshCalls===1&&writebackAdds===1&&writebackRemoves===1,"draining denies new provider work before token or outbound effects");

  await writer.work("fixture:admitted-chunk",async()=>database.updateTable("sessions").set({last_accessed:new Date("2001-01-02")}).where("id","=",sessionId).execute(),leaseId);
  check(true,"pre-pause queued lease can finish database writes while draining");
  await sql.unsafe("update "+B+".writer_leases set expires_at=clock_timestamp()-interval '1 second' where id=$1::uuid",[leaseId]);
  let expired=false;try{await writer.work("fixture:expired",async()=>{effects++;},leaseId);}catch(e){expired=(e as Error).message==="MIGRATION_LEASE_LOST";}
  check(expired&&effects===priorEffects,"expired lease rejects effects");
  let terminalDenied=false;
  try{await writer.work("fixture:terminal-invalid",async()=>guardedSql.unsafe("update "+S+".user_passwords set password_hash='invalid' where user_id=1"),leaseId,true);}catch(e){terminalDenied=(e as Error).message==="TERMINAL_WRITER_TABLE_DENIED";}
  check(terminalDenied,"terminal cleanup cannot change authentication or personal data");
  await writer.work("fixture:terminal",async()=>{await guardedSql.unsafe("update "+S+".marquee_import_controls set mode='disabled' where source=(select min(source) from "+S+".marquee_import_controls)");await sql.unsafe("select "+B+".release_lease($1::uuid)",[leaseId]);},leaseId,true);
  check(true,"expired terminal callback clears its durable lease");
  await sql.unsafe("select "+B+".drained(0,0,true)");
  await sql.unsafe("select "+B+".resume()");
  const authApi=await exerciseAuthApi(sql,database.withPlugin(new CamelCasePlugin()),writer,S,id,check);
  await sql.unsafe("select "+B+".pause()");await sql.unsafe("select "+B+".drained(0,0,true)");
  const gated=await sql.unsafe("select reg.logical_name,a.attname key from "+B+".registry reg cross join lateral (select attname from pg_attribute where attrelid=reg.relation and attnum>0 and not attisdropped and attidentity<>'a' and attgenerated='' order by attnum limit 1) a");
  for(const row of gated){let denied=false;try{await sql.unsafe('update '+S+'.'+row.logical_name+' set "'+row.key+'"="'+row.key+'" where false');}catch(e){denied=(e as any).code==="55000";}
   if(!denied)throw Error("TABLE_PAUSE_COVERAGE_FAILED:"+row.logical_name);}
  check(true,"paused barrier rejects writes to every registered table including empty operational tables");

  const [sealed]=await sql.unsafe("select "+B+".seal_rollback_transfer($1,$2::bigint) receipt",["runtime:"+id,lower]);
  check(sealed.receipt.undo===false&&sealed.receipt.changes>0,"rollback transfer seals chronological new changes");
  const [{payload}]=await sql.unsafe("select payload from "+B+".sealed_batches where batch_id=$1",["runtime:"+id]);
  await sql.unsafe("select "+RB+".pause()");await sql.unsafe("select "+RB+".drained(0,0,true)");
  const targetBefore=await hashes(R);
  let conflict=false;
  const bad=[...payload,{table:"users",before:{id:1},after:null}];
  try{await sql.unsafe("select "+RB+".apply($1,$2::jsonb)",["failure:"+id,sql.json(bad)]);}catch(e){conflict=(e as Error).message.startsWith("DELTA_CONFLICT");}
  check(conflict&&await hashes(R)===targetBefore,"late rollback conflict leaves retained store atomic and unchanged");
  let fkRejected=false;
  const [{fixturePassword}]=await sql.unsafe('select to_jsonb(t) "fixturePassword" from '+R+'.user_passwords t where user_id=1');
  const fkBad=[{table:"user_passwords",before:null,after:{...fixturePassword,id:2140000001,user_id:2140000001}}];
  try{await sql.unsafe("select "+RB+".apply($1,$2::jsonb)",["fk-failure:"+id,sql.json(fkBad)]);}catch(e){fkRejected=(e as any).code==="23503";}
  check(fkRejected&&await hashes(R)===targetBefore,"foreign-key failure leaves retained store atomic with constraints enforced");
  const [applied]=await sql.unsafe("select "+RB+".apply($1,$2::jsonb) n",["runtime:"+id,sql.json(payload)]);
  check(Number(applied.n)>0&&await hashes(S)===await hashes(R),"chronological transfer preserves exact runtime state with real FK constraints");
  const retainedSigned=await getServerSessionOrThrow(new Request("https://fixture.invalid/",{headers:{cookie:authApi.cookie}}));
  const [retainedAuth]=await sql.unsafe("select u.id,p.password_hash from "+R+".users u join "+R+".user_passwords p on p.user_id=u.id join "+R+".sessions s on s.user_id=u.id where s.id=$1 and s.expires_at>now()",[retainedSigned.id]);
  check(retainedAuth?.id===authApi.ownerId&&await compare(authApi.password,retainedAuth.password_hash),"rollback preserves password and actual-login signed session identity");
  const [retainedManual]=await sql.unsafe("select status from "+R+".marquee_manual_title_statuses where user_id=1 and title_id=$1",[authApi.titleId]);
  const [retainedTombstone]=await sql.unsafe("select count(*)::int n from "+R+".marquee_episode_unwatched where user_id=1 and episode_id=$1",[authApi.episodeId]);
  check(retainedManual?.status==="dropped"&&retainedTombstone.n===1,"rollback preserves actual API manual choice and canonical unwatch tombstone");

  const [retainedCredential]=await sql.unsafe("select refresh_token_cipher from "+R+".marquee_trakt_oauth where user_id=1");
  const [retainedOutbox]=await sql.unsafe("select state,watched_at from "+R+".marquee_manual_trakt_outbox where source_event_key=$1",[outboxKey]);
  check(decryptSecret(retainedCredential.refresh_token_cipher)==="fixture-refresh:"+sessionId&&retainedOutbox.state==="removed"&&new Date(retainedOutbox.watched_at).toISOString()==="1999-01-02T03:04:05.000Z","rollback retains decrypted fixture credentials and historical removal tombstone");


  for(const table of TABLES){const [d]=await sql.unsafe("select "+RB+".full_key_delta($1::regclass,$2::regclass,$3) delta",[S+"."+table,R+"."+table,table]);if(d.delta.length!==0)throw Error("FULL_KEY_PARITY_FAILED:"+table);}
  check(true,"full primary-key and value delta is empty across all registered retained tables");
  const [replayed]=await sql.unsafe("select "+RB+".apply($1,$2::jsonb) n",["runtime:"+id,sql.json(payload)]);
  check(Number(replayed.n)===0,"rollback replay applies zero changes");
  const [advanced]=await sql.unsafe("select "+RB+".advance_sequences() n");
  check(Number(advanced.n)>=0,"retained private sequence advancement completes");
  const sequences=await sql.unsafe("select reg.relation::text relation,a.attname,pg_get_serial_sequence(reg.relation::text,a.attname) seq from "+RB+".registry reg join pg_attribute a on a.attrelid=reg.relation where a.attnum>0 and not a.attisdropped and pg_get_serial_sequence(reg.relation::text,a.attname) is not null");
  for(const row of sequences){const [m]=await sql.unsafe('select max("'+row.attname+'")::text n from '+row.relation);const [position]=await sql.unsafe("select last_value::text n,is_called from "+row.seq);if(m.n!==null&&!(BigInt(position.n)>BigInt(m.n)||BigInt(position.n)===BigInt(m.n)&&position.is_called))throw Error("RETAINED_SEQUENCE_COLLISION");}
  check(true,"next retained identity allocation exceeds every restored key");
  check(await publicSequences()===sequenceBefore,"all public sequences remain unchanged");
  check(!(await sql.unsafe("select 1 from "+B+".writer_leases where released_at is null")).length,"no runtime lease left unresolved");
  await sql.unsafe("select "+B+".resume()");await sql.unsafe("select "+RB+".resume()");
  await sql.unsafe("create table if not exists "+B+".runtime_evidence(id uuid primary key,proof jsonb not null,created_at timestamptz default now())");
  await sql.unsafe("insert into "+B+".runtime_evidence(id,proof) values($1::uuid,$2::jsonb)",[id,sql.json(proof)]);
  return Response.json({passed:true,checks:proof.length,proof,changed:Number(applied.n),tables:TABLES.length,productionWrites:false,liveProviderEffects:false,fullProductionRollbackProven:false});
 }catch(e){console.warn("PRIVATE_RUNTIME_EXERCISE_FAILED",(e as Error).message,(e as any).code);return Response.json({error:"PRIVATE_RUNTIME_EXERCISE_FAILED",gate:/^[A-Z0-9_: .-]+$/.test((e as Error).message)?(e as Error).message:"REDACTED",checksCompleted:proof.length},{status:500});}
 finally{await db?.destroy();}
}