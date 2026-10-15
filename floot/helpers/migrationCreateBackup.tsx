
import postgres from "postgres";
import {randomBytes,createHash,scryptSync,createCipheriv,createDecipheriv} from "node:crypto";
import {gzipSync,gunzipSync} from "node:zlib";
import {upload,getUrl} from "@floot/storage";
const APP:string="marquee";
const LEGACY_OWNER="c566e7e0-880a-430d-85df-c40484144a91";
let local:ReturnType<typeof postgres>|undefined,remote:ReturnType<typeof postgres>|undefined;
const qi=(s:string)=>'"'+s.replaceAll('"','""')+'"';
export function migrationBackupSql(){
 const value=process.env.FLOOT_DATABASE_URL;if(!value)throw Error("NATIVE_DATABASE_MISSING");
 return local??=postgres(value,{prepare:false,max:2,idle_timeout:10,connect_timeout:10});
}
function sourceSql(which:"native"|"legacy"){
 if(which==="native")return migrationBackupSql();
 const value=process.env.POSTGRESQL_DATABASE_CONNECTION_STRING;if(!value)throw Error("LEGACY_DATABASE_MISSING");
 const u=new URL(value);if(!u.hostname.includes("eiskobjlvxzwvucgpenk")&&!decodeURIComponent(u.username).includes("eiskobjlvxzwvucgpenk"))throw Error("SOURCE_PROJECT_MISMATCH");
 return remote??=postgres(value,{prepare:false,ssl:"require",max:2,idle_timeout:10});
}
export async function migrationCreateBackup(which:"native"|"legacy",id:string,historyRow?:string,historySection?:string,historyOffset?:number){
 const key=process.env.DATABASE_BACKUP_ENCRYPTION_KEY;if(!key||key.length<32)throw Error("BACKUP_KEY_MISSING");
 const source=sourceSql(which),native=migrationBackupSql();
 await native`insert into migration_backups_20260930.attempts(id,source,stage) values(${id},${which},'read-start')`;
 const stage=async(s:string)=>{await native`update migration_backups_20260930.attempts set stage=${s},updated_at=now() where id=${id}`;};
 const bundle:any=await source.begin("isolation level repeatable read read only",async tx=>{
 const tables=await tx`select c.relname name from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind='r' order by c.relname`;
 const allowed=tables.map(t=>t.name).filter(t=>APP==="gamedeck"?/^(gamedeck_|game(s|_|pass$)|play_events|rank_comparisons$|recommendation_|sync_(runs|tokens)$|wishlist|news($|_))/.test(t):t.startsWith("marquee_"));
 if(APP==="marquee"&&which==="legacy"){const i=allowed.indexOf("marquee_floot_import_backups");if(i>=0)allowed.splice(i,1);if(historyRow){allowed.splice(0,allowed.length,"marquee_floot_import_backups");}}
 if(which==="native")allowed.push(...["users","sessions","user_passwords","login_attempts"]);
 await stage('metadata');
 const metadata={columns:await tx`select c.relname table_name,a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,a.attidentity identity_kind,a.attgenerated generated,pg_get_expr(d.adbin,d.adrelid) default_expression from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped left join pg_attrdef d on d.adrelid=c.oid and d.adnum=a.attnum where n.nspname='public' and c.relname=any(${tx.array(allowed)}::text[]) order by c.relname,a.attnum`,
 constraints:await tx`select c.conrelid::regclass::text table_name,c.conname name,c.contype kind,pg_get_constraintdef(c.oid) definition from pg_constraint c where c.conrelid in(select oid from pg_class where relnamespace='public'::regnamespace and relname=any(${tx.array(allowed)}::text[]))`,
 indexes:await tx`select tablename,indexname,indexdef from pg_indexes where schemaname='public' and tablename=any(${tx.array(allowed)}::text[])`,
 enums:await tx`select t.typname,array_agg(e.enumlabel order by e.enumsortorder) labels from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' group by t.typname`,
 policies:await tx`select * from pg_policies where schemaname='public' and tablename=any(${tx.array(allowed)}::text[])`,
 grants:await tx`select * from information_schema.table_privileges where table_schema='public' and table_name=any(${tx.array(allowed)}::text[])`,
 triggers:await tx`select tgrelid::regclass::text table_name,tgname,tgenabled,pg_get_triggerdef(oid) definition from pg_trigger where not tgisinternal and tgrelid in(select oid from pg_class where relnamespace='public'::regnamespace and relname=any(${tx.array(allowed)}::text[]))`,
 views:await tx`select c.relname name,pg_get_viewdef(c.oid,true) definition from pg_class c where c.relnamespace='public'::regnamespace and c.relkind='v' and exists(select 1 from pg_rewrite r join pg_depend d on d.objid=r.oid join pg_class base on base.oid=d.refobjid where r.ev_class=c.oid and base.relname=any(${tx.array(allowed)}::text[]))`,
 functions:await tx`select p.proname,n.nspname schema_name,pg_get_functiondef(p.oid) definition from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname in('public','gamedeck_internal') and p.prokind='f' and ((${APP}='marquee' and p.proname like 'marquee_%') or (${APP}='gamedeck' and (p.proname like 'gamedeck_%' or p.proname in('is_gamedeck_owner','get_app_bootstrap','record_status_change','record_rank_comparison','set_rank_reaction','play_events_recompute_minutes_delta','play_events_recompute_achievements_delta','merge_play_event_day','reconcile_xbox_synthetic_game','reconcile_xbox_synthetic_game_trigger'))))`,
 sequences:await tx`select schemaname,sequencename,data_type,start_value,min_value,max_value,increment_by,cycle,last_value from pg_sequences s where schemaname='public' and exists(select 1 from pg_class seq join pg_depend d on d.objid=seq.oid join pg_class base on base.oid=d.refobjid where seq.relnamespace='public'::regnamespace and seq.relname=s.sequencename and base.relname=any(${tx.array(allowed)}::text[]))`};
 const data:Record<string,string[]>={},transportHashes:Record<string,string[]>={};
 for(const table of allowed){await stage('data:'+table);if(historyRow&&table==="marquee_floot_import_backups"){
 const sectionValue=historyOffset===undefined?"t.snapshot->$2::text":"(SELECT coalesce(jsonb_agg(value ORDER BY ord),'[]'::jsonb) FROM jsonb_array_elements(t.snapshot->$2::text) WITH ORDINALITY part(value,ord) WHERE ord>$3::int AND ord<=$3::int+100)";
 const expression=historySection?"jsonb_build_object('id',t.id,'run_id',t.run_id,'created_at',t.created_at,'snapshot',jsonb_build_object($2::text,"+sectionValue+"))":"to_jsonb(t)";
 const rows=await tx.unsafe("select encode(extensions.pgp_sym_encrypt("+expression+"::text,'migration transport compression, not credential security','compress-algo=1,compress-level=1'),'base64') row_text,md5("+expression+"::text) row_hash from public.marquee_floot_import_backups t where id=$1::uuid"+(historySection?" and snapshot ? $2::text":""),historySection?(historyOffset===undefined?[historyRow,historySection]:[historyRow,historySection,historyOffset]):[historyRow]);if(rows.length!==1)throw Error("ARCHIVE_ROW_COVERAGE");data[table]=rows.map(r=>r.row_text);transportHashes[table]=rows.map(r=>r.row_hash);
 }else{const rows=await tx.unsafe("select to_jsonb(t)::text row_text from public."+qi(table)+" t order by to_jsonb(t)::text COLLATE \"C\"");data[table]=rows.map(r=>r.row_text);}}
 // Retain newly installed source controls/catalogs inside the encrypted evidence bundle.
 if(which==="legacy"&&!historyRow){
 const barrier="barrier_marquee_legacy_live_20261001";
 const [present]=await tx.unsafe("select to_regnamespace($1) namespace",[barrier]);
 if(present.namespace){
 const [control]=await tx.unsafe("select to_jsonb(c) state,clock_timestamp()<abort_at valid from "+barrier+".control c where id");
 const operational:any={schema:barrier,frozenProduction:control?.state?.mode==="paused"&&control.valid===true,data:{},catalog:{},functions:[]};
 const relations=await tx.unsafe("select c.oid,c.relname,c.relacl::text acl,c.relrowsecurity,c.relforcerowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1 and c.relkind='r' order by c.relname",[barrier]);
 for(const relation of relations){
 const path=qi(barrier)+"."+qi(relation.relname);
 operational.data[relation.relname]=(await tx.unsafe("select to_jsonb(t)::text row_text from "+path+" t order by to_jsonb(t)::text collate \"C\"")).map(r=>r.row_text);
 const columns=await tx.unsafe("select attname,format_type(atttypid,atttypmod) type,attnotnull,attidentity,attgenerated,pg_get_expr(d.adbin,d.adrelid) default_expression from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=$1::oid and a.attnum>0 and not a.attisdropped order by a.attnum",[relation.oid]);
 const constraints=await tx.unsafe("select conname,contype,pg_get_constraintdef(oid) definition,convalidated,condeferrable,condeferred from pg_constraint where conrelid=$1::oid order by conname",[relation.oid]);
 const indexes=await tx.unsafe("select pg_get_indexdef(indexrelid) definition from pg_index where indrelid=$1::oid order by indexrelid",[relation.oid]);
 const triggers=await tx.unsafe("select tgname,tgenabled,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid=$1::oid and not tgisinternal order by tgname",[relation.oid]);
 operational.catalog[relation.relname]={...relation,columns,constraints,indexes,triggers};
 }
 operational.functions=await tx.unsafe("select p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where n.nspname=$1 and p.prokind='f' order by p.proname,p.oid",[barrier]);
 operational.hashes=Object.fromEntries(Object.entries(operational.data).map(([n,rows])=>[n,createHash("sha256").update((rows as string[]).join("\n")).digest("hex")]));
 const [end]=await tx.unsafe("select mode,clock_timestamp()<abort_at valid from "+barrier+".control where id");
 if(operational.frozenProduction&&(end.mode!=="paused"||!end.valid))throw Error("SOURCE_FROZEN_WINDOW_EXPIRED");
 Object.assign(metadata,{sourceBarrier:operational});
 }
 }
 await stage("auth");
 const auth:Record<string,string[]>={};
 if(which==="legacy"&&!historyRow){
 for(const table of ["users","identities","sessions","refresh_tokens","flow_state","mfa_factors","mfa_recovery_code_sets","oauth_authorizations","oauth_consents","one_time_tokens","scim_users","webauthn_challenges","webauthn_credentials","mfa_amr_claims","mfa_challenges"]){
 const exists=await tx`select to_regclass(${"auth."+table}) rel`;if(!exists[0].rel)throw Error("AUTH_TABLE_MISSING");
 const predicate=table==="users"?"id=$1::uuid":table==="refresh_tokens"?"user_id=$1::text":table==="mfa_amr_claims"?"session_id IN(SELECT id FROM auth.sessions WHERE user_id=$1::uuid)":table==="mfa_challenges"?"factor_id IN(SELECT id FROM auth.mfa_factors WHERE user_id=$1::uuid)":"user_id=$1::uuid";
 const rows=await tx.unsafe("select to_jsonb(t)::text row_text from auth."+qi(table)+" t where "+predicate,[LEGACY_OWNER]);auth[table]=rows.map(r=>r.row_text);
 }}
 const authColumns=which==='legacy'?await tx`select c.relname table_name,a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null from pg_class c join pg_namespace n on n.oid=c.relnamespace join pg_attribute a on a.attrelid=c.oid and a.attnum>0 and not a.attisdropped where n.nspname='auth' and c.relname=any(${tx.array(Object.keys(auth))}::text[]) order by c.relname,a.attnum`:[];
 return {format:1,app:APP,which,authColumns,at:new Date().toISOString(),atomicPerResource:true,historyRow:historyRow??null,historySection:historySection??null,historyOffset:historyOffset??null,codec:historyRow?"pgcrypto-transport":"json-text",transportHashes,metadata,data,auth};
 });
 // Include project signing/encryption and connected provider configuration only inside ciphertext.
 await stage('encrypt');
 const env=process.env as Record<string,string|undefined>;
 const protectedConfig:Record<string,string>={};
 const names=APP==="gamedeck"?["JWT_SECRET","IGDB_CLIENT_ID","IGDB_CLIENT_SECRET","GAMEDECK_STEAM_API_KEY","GAMEDECK_FLARESOLVERR_HEADER","GAMEDECK_FLARESOLVERR_TOKEN"]:["JWT_SECRET","TRAKT_CLIENT_ID","TRAKT_CLIENT_SECRET","CRUNCHYROLL_ETP_RT","TMDB_API_TOKEN"];
 for(const name of names)if(env[name])protectedConfig[name]=env[name]!;
 bundle.protectedConfig=protectedConfig;
 const tableCount=Object.keys(bundle.data).length,rowCount=Object.values(bundle.data as Record<string,string[]>).reduce((n,r)=>n+r.length,0),authCount=Object.keys(bundle.auth).length;
 let plain=Buffer.from(JSON.stringify(bundle));const plainHash=createHash("sha256").update(plain).digest("hex"),salt=randomBytes(16),iv=randomBytes(12),derived=scryptSync(key,salt,32);
 const cipher=createCipheriv("aes-256-gcm",derived,iv);cipher.setAAD(Buffer.from(APP+":"+which+":"+id));
 const encrypted=Buffer.concat([cipher.update(gzipSync(plain)),cipher.final()]),tag=cipher.getAuthTag();
 const packed=Buffer.from(JSON.stringify({format:1,app:APP,which,id,salt:salt.toString("base64"),iv:iv.toString("base64"),tag:tag.toString("base64"),ciphertext:encrypted.toString("base64")}));
 plain.fill(0);plain=Buffer.alloc(0);bundle.data={};bundle.auth={};
 const filename="database-migration/"+APP+"/"+id+"-"+which+".backup";
 await stage("upload");
 const signed=await upload({visibility:"private",filename,contentType:"application/octet-stream",sizeBytes:packed.length,ifAbsent:true});if(!signed.ok)throw Error("BACKUP_UPLOAD_PREP_FAILED");
 const put=await fetch(signed.presignedUrl,{method:"PUT",headers:signed.headers,body:packed});if(!put.ok)throw Error("BACKUP_UPLOAD_FAILED");
 // Read uploaded ciphertext afresh, decrypt with authenticated AAD, and validate exact payload.
 const url=await getUrl({visibility:"private",filename});if(!url.ok)throw Error("BACKUP_READ_FAILED");
 const downloaded=await fetch(url.url);if(!downloaded.ok)throw Error("BACKUP_READ_FAILED");const stored=Buffer.from(await downloaded.arrayBuffer());
 const decoded=JSON.parse(stored.toString()),decipher=createDecipheriv("aes-256-gcm",scryptSync(key,Buffer.from(decoded.salt,"base64"),32),Buffer.from(decoded.iv,"base64"));decipher.setAAD(Buffer.from(APP+":"+which+":"+id));decipher.setAuthTag(Buffer.from(decoded.tag,"base64"));
 const restored=gunzipSync(Buffer.concat([decipher.update(Buffer.from(decoded.ciphertext,"base64")),decipher.final()]));
 if(createHash("sha256").update(restored).digest("hex")!==plainHash)throw Error("BACKUP_DECRYPT_HASH");
 const receipt={id,app:APP,source:which,filename,cipherHash:createHash("sha256").update(stored).digest("hex"),plainHash,tables:tableCount,rows:rowCount,authTables:authCount,bytes:stored.length,decryptVerified:true};
 await native`insert into migration_backups_20260930.receipts(id,app,source,filename,cipher_sha256,plain_sha256,tables,rows) values(${id},${APP},${which},${filename},${receipt.cipherHash},${plainHash},${receipt.tables},${receipt.rows})`;
 if(historyRow)await native`update migration_backups_20260930.receipts set archive_id=${historyRow},archive_section=${historySection??null},archive_offset=${historyOffset??null},archive_slice_rows=${historyOffset===undefined?null:100} where id=${id}`;
 await stage("verified");
 derived.fill(0);plain.fill(0);restored.fill(0);
 return receipt;
}

export async function migrationRestoreBackup(backupId:string){
 const sql=migrationBackupSql(),key=process.env.DATABASE_BACKUP_ENCRYPTION_KEY;if(!key)throw Error("BACKUP_KEY_MISSING");
 const [receipt]=await sql`select * from migration_backups_20260930.receipts where id=${backupId}`;if(!receipt)throw Error("BACKUP_NOT_FOUND");
 const signed=await getUrl({visibility:"private",filename:receipt.filename});if(!signed.ok)throw Error("BACKUP_READ_FAILED");
 const response=await fetch(signed.url);if(!response.ok)throw Error("BACKUP_READ_FAILED");const stored=Buffer.from(await response.arrayBuffer());
 if(createHash("sha256").update(stored).digest("hex")!==receipt.cipher_sha256)throw Error("CIPHER_HASH_CHANGED");
 const envelope=JSON.parse(stored.toString()),decipher=createDecipheriv("aes-256-gcm",scryptSync(key,Buffer.from(envelope.salt,"base64"),32),Buffer.from(envelope.iv,"base64"));
 decipher.setAAD(Buffer.from(APP+":"+receipt.source+":"+backupId));decipher.setAuthTag(Buffer.from(envelope.tag,"base64"));
 const plain=gunzipSync(Buffer.concat([decipher.update(Buffer.from(envelope.ciphertext,"base64")),decipher.final()]));
 if(createHash("sha256").update(plain).digest("hex")!==receipt.plain_sha256)throw Error("PLAIN_HASH_CHANGED");
 const bundle=JSON.parse(plain.toString()),schema="restore_"+APP+"_20260930_"+backupId.replaceAll("-","").slice(0,12),S=qi(schema);
 const mark=async(stage:string)=>{await sql`insert into migration_backups_20260930.attempts(id,source,stage) values(${backupId},'restore',${stage}) on conflict(id) do update set source='restore',stage=excluded.stage,updated_at=now()`;};await mark("decrypt-verified");
 let restored=0,rows=0;
 await sql.begin(async tx=>{
 const [locked]=await tx`select restored_tables from migration_backups_20260930.receipts where id=${backupId} for update`;
 const [ns]=await tx`select exists(select 1 from pg_namespace where nspname=${schema}) present`;
 const replay=Number(locked.restored_tables)===Object.keys(bundle.data).length;
 if(ns.present!==replay)throw Error("RESTORE_RECEIPT_SCHEMA_CONFLICT");
 if(!replay){
 await tx.unsafe("CREATE SCHEMA "+S+"; REVOKE ALL ON SCHEMA "+S+" FROM PUBLIC");
 for(const e of bundle.metadata.enums)await tx.unsafe("CREATE TYPE "+S+"."+qi("r_"+backupId.replaceAll("-","").slice(0,12)+"_"+e.typname)+" AS ENUM("+e.labels.map((v:string)=>"'"+v.replaceAll("'","''")+"'").join(",")+")");
 }
 for(const [table,values]of Object.entries(bundle.data) as [string,string[]][]){await mark("restore:"+table);
 const cols=bundle.metadata.columns.filter((c:any)=>c.table_name===table);
 if(!cols.length||cols.some((c:any)=>c.generated))throw Error("RESTORE_COLUMN_REVIEW");
 const fq=S+"."+qi(table),def=cols.map((c:any)=>qi(c.name)+" "+(bundle.metadata.enums.some((e:any)=>e.typname===c.type)?S+"."+qi("r_"+backupId.replaceAll("-","").slice(0,12)+"_"+c.type):c.type)+(c.not_null?" NOT NULL":"")).join(",");
 if(!replay)await tx.unsafe("CREATE TABLE "+fq+"("+def+")");
 if(bundle.codec==="pgcrypto-transport"){
 if(!replay)for(let i=0;i<values.length;){const chunk:string[]=[];let bytes=0;while(i<values.length&&chunk.length<100){const value=values[i];if(chunk.length&&bytes+value.length>1000000)break;chunk.push(value);bytes+=value.length;i++;}await tx.unsafe("INSERT INTO "+fq+" SELECT (jsonb_populate_record(NULL::"+fq+",prep_marquee_20260930.pgp_sym_decrypt(decode(value,'base64'),'migration transport compression, not credential security')::jsonb)).* FROM jsonb_array_elements_text($1::text::jsonb) batch(value)",[JSON.stringify(chunk)]);}
 const hashes=await tx.unsafe("SELECT md5(to_jsonb(t)::text) hash FROM "+fq+" t");
 if(JSON.stringify(hashes.map(r=>r.hash).sort())!==JSON.stringify(bundle.transportHashes[table].slice().sort()))throw Error("RESTORE_HASH_GATE:"+table);
 restored++;rows+=hashes.length;continue;
 }
 if(!replay)for(let i=0;i<values.length;){const chunk:string[]=[];let bytes=0;while(i<values.length&&chunk.length<100){const value=values[i];if(chunk.length&&bytes+value.length>1000000)break;chunk.push(value);bytes+=value.length;i++;}const payload="["+chunk.join(",")+"]";await tx.unsafe("INSERT INTO "+fq+" SELECT * FROM jsonb_populate_recordset(NULL::"+fq+",$1::text::jsonb)",[payload]);}
 const back=await tx.unsafe("SELECT to_jsonb(t)::text row_text FROM "+fq+" t ORDER BY to_jsonb(t)::text COLLATE \"C\"");
 const a=createHash("sha256").update(values.join("\n")).digest("hex"),b=createHash("sha256").update(back.map(r=>r.row_text).join("\n")).digest("hex");
 if(a!==b||back.length!==values.length)throw Error("RESTORE_HASH_GATE:"+table);
 restored++;rows+=back.length;
 }
 // Auth evidence is restored as exact JSON text only; never a cloned live identity.
 if(!replay){
 await tx.unsafe("CREATE TABLE "+S+".auth_evidence(table_name text,row_text text)");
 for(const [table,values]of Object.entries(bundle.auth) as [string,string[]][])for(const value of values)await tx.unsafe("INSERT INTO "+S+".auth_evidence VALUES($1,$2)",[table,value]);
 }
 for(const [table,values]of Object.entries(bundle.auth) as [string,string[]][]){
 const restoredAuth=await tx.unsafe("SELECT row_text FROM "+S+".auth_evidence WHERE table_name=$1 ORDER BY row_text COLLATE \"C\"",[table]);
 const expected=createHash("sha256").update(values.slice().sort().join("\\n")).digest("hex"),actual=createHash("sha256").update(restoredAuth.map(r=>r.row_text).sort().join("\\n")).digest("hex");
 if(expected!==actual||restoredAuth.length!==values.length)throw Error("RESTORE_AUTH_HASH_GATE");
 }
 const configEvidence={encryptedBackupId:backupId,filename:receipt.filename,names:Object.keys(bundle.protectedConfig??{})};
 if(!replay){
 await tx.unsafe("CREATE TABLE "+S+".schema_evidence(metadata jsonb,auth_columns jsonb,protected_config jsonb)");
 await tx.unsafe("INSERT INTO "+S+".schema_evidence VALUES($1::text::jsonb,$2::text::jsonb,$3::text::jsonb)",[JSON.stringify(bundle.metadata),JSON.stringify(bundle.authColumns??[]),JSON.stringify(configEvidence)]);
 }
 {
 const evidence=await tx.unsafe("SELECT count(*)::int n FROM "+S+".schema_evidence WHERE metadata=$1::text::jsonb AND auth_columns=$2::text::jsonb AND protected_config=$3::text::jsonb",[JSON.stringify(bundle.metadata),JSON.stringify(bundle.authColumns??[]),JSON.stringify(configEvidence)]);
 if(evidence[0].n!==1)throw Error("RESTORE_SCHEMA_EVIDENCE_CHANGED");
 }
 await tx.unsafe("REVOKE ALL ON ALL TABLES IN SCHEMA "+S+" FROM PUBLIC");
 await tx`update migration_backups_20260930.receipts set restored_tables=${restored} where id=${backupId}`;
 });
 plain.fill(0);
 return {backupId,schema,restoredTables:restored,restoredRows:rows,authEvidenceTables:Object.keys(bundle.auth).length,exactRowHashVerified:true,scope:"typed app data plus protected schema/Auth/config evidence; no production connection or auth switch"};
}
