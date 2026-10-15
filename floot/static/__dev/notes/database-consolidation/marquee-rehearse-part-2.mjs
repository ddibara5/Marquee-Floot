// Preparatory snapshot + typed restore rehearsal ONLY. Run on the matching Floot VM.
// No secrets, provider calls, public writes, triggers, policies, auth, or connection switches.
import {createHash} from 'node:crypto';
const CONFIG = {"source": "PostgreSQL Database", "app": "marquee", "schema": "prep_marquee_20260930", "target": "Floot Database for Marquee Floot Pilot", "tables": ["marquee_episodes", "marquee_watch_history", "marquee_undated_completions", "marquee_ratings"], "nativeTables": []};
const {app,schema,source,target,tables,nativeTables=[]}=CONFIG;
if(!/^prep_(gamedeck|marquee)_20260930$/.test(schema)||!['gamedeck','marquee'].includes(app)||source===target)throw Error('ISOLATION_GUARD');
const qi=s=>'"'+s.replaceAll('"','""')+'"';
const lit=s=>"'"+String(s).replaceAll("'","''")+"'";
async function query(resourceName,sql,write=false){
 const r=await _floot.runSQLQuery({resourceName,query:sql,...(write?{reasonAndExplanationForNotReadOnly:'Authorized preparation: only dedicated '+schema+' schema in '+target+'; production public tables remain read-only.'}:{})});
 if(r.truncated)throw Error('TRUNCATED');return r;
}
const read=async(r,s)=>(await query(r,s)).rows;
const write=async s=>query(target,s,true);
const fq=t=>qi(schema)+'.'+qi(t);
await write(`CREATE SCHEMA IF NOT EXISTS ${qi(schema)}; REVOKE ALL ON SCHEMA ${qi(schema)} FROM PUBLIC;
 CREATE TABLE IF NOT EXISTS ${fq('manifest')}(table_name text primary key,source_resource text not null,source_count bigint not null,source_md5 text not null,target_md5 text not null,columns jsonb not null,constraints jsonb not null,created_at timestamptz not null default now(),snapshot_atomic boolean not null default false);`);
const enumRows=await read(source,"select t.typname,e.enumlabel from pg_type t join pg_enum e on e.enumtypid=t.oid join pg_namespace n on n.oid=t.typnamespace where n.nspname='public' order by t.typname,e.enumsortorder");
const enums=enumRows.reduce((a,r)=>{(a[r.typname]??=[]).push(r);return a;},{});
for(const [name,rows]of Object.entries(enums))await write(`DO $$ BEGIN IF NOT EXISTS(select 1 from pg_type t join pg_namespace n on n.oid=t.typnamespace where n.nspname=${lit(schema)} and t.typname=${lit(name)}) THEN CREATE TYPE ${fq(name)} AS ENUM(${rows.map(r=>lit(r.enumlabel)).join(',')}); END IF; END $$;`);
const results=[];
for(const table of tables){
 if(!/^[a-z0-9_]+$/.test(table)||/tokens|password|oauth|sessions|import_backups|import_pages/.test(table))throw Error('SECRET_TABLE_GUARD:'+table);
 const [cols,cons]=await Promise.all([
 read(source,`select a.attname name,format_type(a.atttypid,a.atttypmod) type,a.attnotnull not_null from pg_attribute a join pg_class c on c.oid=a.attrelid join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relname=${lit(table)} and a.attnum>0 and not a.attisdropped order by a.attnum`),
 read(source,`select c.contype type,pg_get_constraintdef(c.oid) definition,(select json_agg(a.attname order by k.o) from unnest(c.conkey) with ordinality k(num,o) join pg_attribute a on a.attrelid=c.conrelid and a.attnum=k.num) keys from pg_constraint c where c.conrelid=('public.'||${lit(table)})::regclass order by c.conname`)]);
 const pk=cons.find(c=>c.type==='p')?.keys;
 const key=pk?.length?`jsonb_build_array(${pk.map(k=>'t.'+qi(k)).join(',')})::text`:'md5(to_jsonb(t)::text)';
 const hashQuery=`select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by ${key} COLLATE "C"),'')) h from public.${qi(table)} t`;
 const before=(await read(source,hashQuery))[0];
 const backup=fq('b_'+table),typed=fq('t_'+table);
 const exists=await read(target,`select * from ${fq('manifest')} where table_name=${lit(table)}`);
 if(exists.length){if(exists[0].source_md5!==before.h)throw Error('SOURCE_CHANGED_USE_NEW_SNAPSHOT:'+table);results.push({table,rows:before.n,hash:before.h,reused:true});continue;}
 await write(`CREATE TABLE IF NOT EXISTS ${backup}(row_key text primary key,row_data jsonb not null,row_md5 text not null CHECK (md5(row_data::text)=row_md5));`);
 const existing=(await read(target,`select count(*)::int n,max(row_key COLLATE \"C\") last_key from ${backup}`))[0];
 const resume=existing.last_key?`WHERE (${key} COLLATE \"C\") > (${lit(existing.last_key)} COLLATE \"C\")`:'';
 async function page(offset,size){
  try{return await read(source,`select ${key} row_key,to_jsonb(t)::text row_text,md5(to_jsonb(t)::text) row_md5 from public.${qi(table)} t ${resume} order by ${key} COLLATE "C" limit ${size} offset ${offset}`);}
  catch(e){if(e.message!=='TRUNCATED'||size===1)throw e;const half=Math.floor(size/2);return [...await page(offset,half),...await page(offset+half,size-half)];}
 }
 let inserted=0,replayed=0;
 for(let start=0;start<before.n-existing.n;start+=160){
  const pages=await Promise.all(Array.from({length:Math.min(8,Math.ceil((before.n-existing.n-start)/20))},(_,i)=>page(start+i*20,Math.min(20,before.n-existing.n-start-i*20))));
  {const rows=pages.flat();if(!rows.length)continue;const sql=`INSERT INTO ${backup}(row_key,row_data,row_md5) VALUES ${rows.map(r=>`(${lit(r.row_key)},${lit(r.row_text)}::jsonb,${lit(r.row_md5)})`).join(',')} ON CONFLICT(row_key) DO NOTHING`;
   inserted+=(await write(sql)).rowCount;replayed+=(await write(sql)).rowCount;}
 }
 const after=(await read(source,hashQuery))[0];
 const dest=(await read(target,`select count(*)::int n,md5(coalesce(string_agg(row_md5,'' order by row_key COLLATE "C"),'')) h from ${backup}`))[0];
 if(before.n!==after.n||before.h!==after.h||before.n!==dest.n||before.h!==dest.h||replayed!==0)throw Error('SNAPSHOT_OR_REPLAY_GATE:'+table);
 const def=cols.map(c=>qi(c.name)+' '+(enums[c.type]?fq(c.type):c.type)+(c.not_null?' NOT NULL':'')).join(',');
 await write(`CREATE TABLE IF NOT EXISTS ${typed}(${def}); INSERT INTO ${typed} SELECT (jsonb_populate_record(NULL::${typed},row_data)).* FROM ${backup} WHERE NOT EXISTS(SELECT 1 FROM ${typed});`);
 let idx=0;for(const c of cons.filter(c=>['p','u','c'].includes(c.type))){const cname='gate_'+table+'_'+(++idx);await write(`DO $$ BEGIN IF NOT EXISTS(select 1 from pg_constraint where conrelid=${lit(schema+'.t_'+table)}::regclass and conname=${lit(cname)}) THEN ALTER TABLE ${typed} ADD CONSTRAINT ${qi(cname)} ${c.definition.replaceAll('gamedeck_delivery_status',fq('gamedeck_delivery_status'))}; END IF; END $$;`);}
 const typedHash=(await read(target,`select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by ${key} COLLATE "C"),'')) h from ${typed} t`))[0];
 if(typedHash.n!==before.n||typedHash.h!==before.h)throw Error('TYPED_RESTORE_GATE:'+table);
 await write(`INSERT INTO ${fq('manifest')}(table_name,source_resource,source_count,source_md5,target_md5,columns,constraints) VALUES(${lit(table)},${lit(source)},${before.n},${lit(before.h)},${lit(dest.h)},${lit(JSON.stringify(cols))}::jsonb,${lit(JSON.stringify(cons))}::jsonb)`);
 results.push({table,rows:before.n,hash:before.h,inserted,replayed,typed_restore:true});
}
for(const table of nativeTables){
 if(!/^marquee_/.test(table)||/oauth|password|session|device_auth|import_backups|import_pages/.test(table))throw Error('NATIVE_SECRET_GUARD');
 const name='n_'+table;
 await write(`CREATE TABLE IF NOT EXISTS ${fq(name)} AS SELECT * FROM public.${qi(table)};`);
 const rows=await read(target,`select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) h from ${fq(name)} t`);
 const live=await read(target,`select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by md5(to_jsonb(t)::text)),'')) h from public.${qi(table)} t`);
 if(rows[0].n!==live[0].n||rows[0].h!==live[0].h)throw Error('NATIVE_CHANGED:'+table);
 results.push({table:'native:'+table,rows:rows[0].n,hash:rows[0].h});
}
const probeTable=app==='gamedeck'?'play_events':'marquee_watch_history';
if(tables.includes(probeTable)){
 const probe=fq('restore_probe'),backup=fq('b_'+probeTable);
 await write(`CREATE TABLE IF NOT EXISTS ${probe}(row_key text PRIMARY KEY,row_data jsonb NOT NULL,row_md5 text NOT NULL); INSERT INTO ${probe} SELECT * FROM ${backup} WHERE row_key<>(SELECT min(row_key) FROM ${backup}) ON CONFLICT DO NOTHING; INSERT INTO ${probe} SELECT * FROM ${backup} ON CONFLICT DO NOTHING;`);
 const diff=await read(target,`select count(*)::int n from ((select * from ${probe} except select * from ${backup}) union all(select * from ${backup} except select * from ${probe})) d`);
 if(diff[0].n!==0)throw Error('RESTORE_PROBE');
 results.push({test:'one-row-loss-restored-from-backup',differences:0});
}
console.log(JSON.stringify({at:new Date().toISOString(),schema,app,snapshot_atomic:false,results,manifest_sha256:createHash('sha256').update(JSON.stringify(results)).digest('hex'),excluded:'Authentication material, provider tokens, push subscription endpoints/keys, operational payload backups; secure transport remains a cutover gate.'}));
