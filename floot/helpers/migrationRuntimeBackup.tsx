import {createHash} from "node:crypto";
import {migrationBackupSql} from "./migrationCreateBackup";
import {migrationSealBackupBundle} from "./migrationSealBackupBundle";
import {runtimeBindings} from "./migrationRuntimeBindings";
const MARQUEE_BARRIER_SCHEMA="barrier_marquee_20260930_v2";
const qi=(s:string)=>'"'+s.replaceAll('"','""')+'"';
const fq=(s:string)=>s.split(".").map(qi).join(".");
const auth=["users","sessions","user_passwords","login_attempts"];
// Fixed Marquee targets only. No schema, SQL, rowset or credentials accepted from an operator.
export async function migrationRuntimeBackup(id:string,mode:"private-exercise"|"pre-install"|"final-window"){
 if(!/^[0-9a-f-]{36}$/i.test(id))throw Error("BACKUP_ID_INVALID");
 const db=migrationBackupSql();
 const bindings=mode==="private-exercise"?Object.fromEntries(Object.keys(runtimeBindings).map(n=>[n,"exercise_marquee_runner_20261001."+n])):runtimeBindings;
 const barrier=mode==="private-exercise"?"barrier_marquee_runner_20261001":MARQUEE_BARRIER_SCHEMA;
 if(Object.keys(bindings).length!==42||auth.some(n=>!bindings[n]))throw Error("RUNTIME_BACKUP_SCOPE_INVALID");
 await db`insert into migration_backups_20260930.attempts(id,source,stage) values(${id},'native','runtime-read-start')`;
 const stage=async(s:string)=>{await db`update migration_backups_20260930.attempts set stage=${s},updated_at=now() where id=${id}`;};
 const bundle=await db.begin("isolation level repeatable read",async tx=>{
  if(mode==="final-window"){
   const [window]=await tx.unsafe("select mode,clock_timestamp()<abort_at valid from "+barrier+".control where id for share");
   if(window?.mode!=="paused"||!window.valid)throw Error("FROZEN_WINDOW_REQUIRED");
   if((await tx.unsafe("select 1 from "+barrier+".writer_leases where released_at is null limit 1")).length)throw Error("UNRESOLVED_WRITER_LEASE");
   const registered=await tx.unsafe("select r.logical_name,quote_ident(n.nspname)||'.'||quote_ident(c.relname) path from "+barrier+".registry r join pg_class c on c.oid=r.relation join pg_namespace n on n.oid=c.relnamespace");
   if(registered.length!==42||registered.some(r=>bindings[r.logical_name]!==r.path))throw Error("RUNTIME_BACKUP_BINDING_DRIFT");
   const installed=Object.fromEntries(registered.map(r=>[r.logical_name,r.path]));
   await tx.unsafe("select "+barrier+".require_binding($1::jsonb)",[tx.json(installed)]);
   const domain=bindings.marquee_titles.split(".")[0];
   const [work]=await tx.unsafe("select (exists(select 1 from "+domain+".marquee_import_controls where run_id is not null or lease_until is not null) or exists(select 1 from "+domain+".marquee_import_runs where finished_at is null or error_code='PARTIAL_COMMIT_REVIEW_REQUIRED') or exists(select 1 from "+domain+".marquee_trakt_sync_runs where finished_at is null) or exists(select 1 from "+domain+".marquee_manual_trakt_outbox where state not in ('removed','synced'))) unresolved");
   if(work.unresolved)throw Error("EXTERNAL_WORK_UNRESOLVED");
  }
  const metadata:any={columns:[],constraints:[],indexes:[],enums:[],policies:[],grants:[],triggers:[],views:[],functions:[],sequences:[],
   scope:{kind:"fixed-marquee-runtime42",mode,relationMap:bindings,barrier,operationalData:{},operationalCatalog:{},frozenProduction:false,
    restoration:"typed isolated row/value restore plus exact protected metadata; no automatic live DDL/Auth/service reconstruction"}};
  const data:Record<string,string[]>={},transportHashes:Record<string,string[]>={};const schemaSet=new Set<string>();const enumTypes=new Map<string,string>();
  for(const [name,path]of Object.entries(bindings)){
   await stage("runtime:"+name);
   const [rel]=await tx.unsafe("select c.oid,c.relkind,c.relrowsecurity,c.relforcerowsecurity,c.relacl::text acl,n.nspname schema_name,c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.oid=to_regclass($1)",[path]);
   if(!rel||rel.relkind!=="r")throw Error("RUNTIME_BACKUP_RELATION_MISSING");
   schemaSet.add(rel.schema_name);
   const cols=await tx.unsafe("select $2::text table_name,a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null,a.attidentity identity_kind,a.attgenerated generated,pg_get_expr(d.adbin,d.adrelid) default_expression,t.typtype type_kind,t.typname enum_name,t.oid type_oid from pg_attribute a join pg_type t on t.oid=a.atttypid left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=$1::oid and a.attnum>0 and not a.attisdropped order by a.attnum",[rel.oid,name]);
   for(const c of cols){if(c.type_kind==="e"){
    const prior=enumTypes.get(c.enum_name);if(prior&&prior!==String(c.type_oid))throw Error("RUNTIME_BACKUP_ENUM_COLLISION");
    if(!prior){const labels=await tx.unsafe("select enumlabel from pg_enum where enumtypid=$1::oid order by enumsortorder",[c.type_oid]);metadata.enums.push({typname:c.enum_name,labels:labels.map(r=>r.enumlabel),originalType:c.type});enumTypes.set(c.enum_name,String(c.type_oid));}
    c.type=c.enum_name;
   }}
   metadata.columns.push(...cols);
   metadata.constraints.push(...await tx.unsafe("select $2::text table_name,conname name,contype kind,pg_get_constraintdef(oid) definition,convalidated validated,condeferrable deferrable,condeferred deferred from pg_constraint where conrelid=$1::oid order by conname",[rel.oid,name]));
   metadata.indexes.push(...await tx.unsafe("select $2::text table_name,ic.relname indexname,pg_get_indexdef(i.indexrelid) indexdef from pg_index i join pg_class ic on ic.oid=i.indexrelid where i.indrelid=$1::oid order by ic.relname",[rel.oid,name]));
   metadata.policies.push(...await tx.unsafe("select * from pg_policies where schemaname=$1 and tablename=$2",[rel.schema_name,rel.relname]));
   metadata.grants.push({table_name:name,relation:path,acl:rel.acl,rls:rel.relrowsecurity,forceRls:rel.relforcerowsecurity});
   metadata.triggers.push(...await tx.unsafe("select $2::text table_name,tgname,tgenabled,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid=$1::oid and not tgisinternal order by tgname",[rel.oid,name]));
   const sequences=await tx.unsafe("select quote_ident(n.nspname)||'.'||quote_ident(c.relname) path,pg_sequence.seqtypid::regtype::text data_type,seqstart,seqincrement,seqmin,seqmax,seqcache,seqcycle from pg_depend d join pg_class c on c.oid=d.objid and c.relkind='S' join pg_namespace n on n.oid=c.relnamespace join pg_sequence on pg_sequence.seqrelid=c.oid where d.refobjid=$1::oid and d.deptype in('a','i') order by c.relname",[rel.oid]);
   for(const sequence of sequences){const state=await tx.unsafe("select last_value::text,is_called from "+sequence.path);metadata.sequences.push({table_name:name,...sequence,state});}
   const rows=await tx.unsafe("select encode(prep_marquee_20260930.pgp_sym_encrypt(to_jsonb(t)::text,'migration transport compression, not credential security','compress-algo=1,compress-level=1,s2k-mode=0'),'base64') row_text,md5(to_jsonb(t)::text) row_hash from "+fq(path)+" t order by to_jsonb(t)::text collate \"C\"");
   data[name]=rows.map(r=>r.row_text);transportHashes[name]=rows.map(r=>r.row_hash);
  }
  // Recovery/control state stays evidence inside ciphertext, never activated by restoration.
  const controls=await tx.unsafe("select c.relname from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname=$1 and c.relkind='r' order by c.relname",[barrier]);
  if(!controls.some(r=>r.relname==="journal")||!controls.some(r=>r.relname==="registry"))throw Error("RUNTIME_BACKUP_BARRIER_MISSING");
  for(const {relname}of controls){const rows=await tx.unsafe("select to_jsonb(t)::text row_text from "+qi(barrier)+"."+qi(relname)+" t order by to_jsonb(t)::text collate \"C\"");metadata.scope.operationalData[relname]=rows.map(r=>r.row_text);
   const [relation]=await tx.unsafe("select oid,relacl::text acl,relrowsecurity,relforcerowsecurity from pg_class where oid=to_regclass($1)",[barrier+"."+relname]);
   const columns=await tx.unsafe("select attname,format_type(atttypid,atttypmod) type,attnotnull,attidentity,attgenerated,pg_get_expr(d.adbin,d.adrelid) default_expression from pg_attribute a left join pg_attrdef d on d.adrelid=a.attrelid and d.adnum=a.attnum where a.attrelid=$1::oid and a.attnum>0 and not a.attisdropped order by a.attnum",[relation.oid]);
   const constraints=await tx.unsafe("select conname,contype,pg_get_constraintdef(oid) definition,convalidated,condeferrable,condeferred from pg_constraint where conrelid=$1::oid order by conname",[relation.oid]);
   const indexes=await tx.unsafe("select pg_get_indexdef(indexrelid) definition from pg_index where indrelid=$1::oid order by indexrelid",[relation.oid]);
   const triggers=await tx.unsafe("select tgname,tgenabled,pg_get_triggerdef(oid) definition from pg_trigger where tgrelid=$1::oid and not tgisinternal order by tgname",[relation.oid]);
   const sequences=await tx.unsafe("select quote_ident(n.nspname)||'.'||quote_ident(c.relname) path,seqstart,seqincrement,seqmin,seqmax,seqcache,seqcycle from pg_depend d join pg_class c on c.oid=d.objid and c.relkind='S' join pg_namespace n on n.oid=c.relnamespace join pg_sequence s on s.seqrelid=c.oid where d.refobjid=$1::oid and d.deptype in('a','i') order by c.relname",[relation.oid]);
   for(const sequence of sequences)sequence.state=await tx.unsafe("select last_value::text,is_called from "+sequence.path);
   metadata.scope.operationalCatalog[relname]={columns,constraints,indexes,triggers,sequences,acl:relation.acl,rls:relation.relrowsecurity,forceRls:relation.relforcerowsecurity};
  }
  metadata.functions=await tx.unsafe("select n.nspname schema_name,p.proname,pg_get_function_identity_arguments(p.oid) arguments,pg_get_functiondef(p.oid) definition,p.proacl::text acl from pg_proc p join pg_namespace n on n.oid=p.pronamespace where p.prokind='f' and (n.nspname=$1 or (n.nspname=any($2::text[]) and (p.proname like 'marquee_%'))) order by n.nspname,p.proname,p.oid",[barrier,[...schemaSet]]);
  const paths=Object.values(bindings);
  metadata.views=await tx.unsafe("select n.nspname schema_name,c.relname name,pg_get_viewdef(c.oid,true) definition from pg_class c join pg_namespace n on n.oid=c.relnamespace where c.relkind='v' and exists(select 1 from pg_rewrite r join pg_depend d on d.objid=r.oid where r.ev_class=c.oid and d.refobjid in(select to_regclass(path) from unnest($1::text[]) path)) order by n.nspname,c.relname",[paths]);
  const operationalHashes=Object.fromEntries(Object.entries(metadata.scope.operationalData).map(([n,rows])=>[n,createHash("sha256").update((rows as string[]).join("\n")).digest("hex")]));
  if(mode==="final-window"){const [endWindow]=await tx.unsafe("select mode,clock_timestamp()<abort_at valid from "+barrier+".control where id");if(endWindow?.mode!=="paused"||!endWindow.valid)throw Error("FROZEN_WINDOW_EXPIRED");}
  metadata.scope.operationalHashes=operationalHashes;
  const registry=await tx.unsafe("select r.logical_name,quote_ident(n.nspname)||\'.\'||quote_ident(c.relname) path from "+barrier+".registry r join pg_class c on c.oid=r.relation join pg_namespace n on n.oid=c.relnamespace");
  metadata.scope.all42BindingsInstalled=registry.length===42&&registry.every(r=>bindings[r.logical_name]===r.path);
  metadata.scope.frozenProduction=mode==="final-window"&&metadata.scope.all42BindingsInstalled;
  metadata.scope.preInstallAuthGap=mode==="pre-install"&&!metadata.scope.all42BindingsInstalled;
  metadata.scope.backupDoesNotProveDrain=mode!=="final-window";
  metadata.scope.finalFrozenDeltaRequired=true;
  return {format:1,app:"marquee",which:"native",authColumns:[],at:new Date().toISOString(),atomicPerResource:true,
   historyRow:null,historySection:null,historyOffset:null,codec:"pgcrypto-transport",transportHashes,metadata,data,auth:{}};
 });
 const all42BindingsInstalled=bundle.metadata.scope.all42BindingsInstalled;
 const receipt=await migrationSealBackupBundle({APP:"marquee",which:"native",id,bundle,native:db,stage});
 return {...receipt,runtimeShapes:42,mode,all42BindingsInstalled,finalFrozenDeltaRequired:true,scope:"fixed native runtime42, native Auth/manual state and protected operational/DDL evidence",fullProductionRestoreProven:false};
}
