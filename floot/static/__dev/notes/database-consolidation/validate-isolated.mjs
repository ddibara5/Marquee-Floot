// Read-only validation of private snapshots. Does not imply production cutover readiness.
import {createHash} from 'node:crypto';
const CONFIG=/* CONFIG */ {};
const {schema,target}=CONFIG;
if(!/^prep_(gamedeck|marquee)_20260930$/.test(schema))throw Error('ISOLATION_GUARD');
const qi=s=>'"'+s.replaceAll('"','""')+'"';const fq=t=>qi(schema)+'.'+qi(t);
async function q(query){const r=await _floot.runSQLQuery({resourceName:target,query});if(r.truncated)throw Error('TRUNCATED');return r.rows;}
const ms=await q(`select table_name,source_count::int,source_md5,target_md5,constraints from ${fq('manifest')} order by table_name`);
const names=new Set(ms.map(m=>m.table_name)),results=[],skipped=[];
for(const m of ms){
 const pk=m.constraints.find(c=>c.type==='p')?.keys;
 const key=pk?.length?`jsonb_build_array(${pk.map(k=>'t.'+qi(k)).join(',')})::text`:'md5(to_jsonb(t)::text)';
 const a=(await q(`select count(*)::int n,md5(coalesce(string_agg(row_md5,'' order by row_key COLLATE "C"),'')) h,count(*) filter(where md5(row_data::text)<>row_md5)::int corrupt from ${fq('b_'+m.table_name)}`))[0];
 const b=(await q(`select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by ${key} COLLATE "C"),'')) h from ${fq('t_'+m.table_name)} t`))[0];
 if(a.n!==m.source_count||b.n!==m.source_count||a.h!==m.source_md5||b.h!==m.source_md5||a.corrupt!==0)throw Error('HASH_GATE:'+m.table_name);
 for(const c of m.constraints.filter(c=>c.type==='f')){
  const r=c.definition.match(/^FOREIGN KEY \(([^)]+)\) REFERENCES ([a-z_."]+)\(([^)]+)\)/);
  if(!r)throw Error('UNPARSED_FOREIGN_KEY');const ref=r[2].replaceAll('"','').replace(/^public\./,'');
  if(!names.has(ref)){skipped.push({table:m.table_name,reference:ref,disposition:ref==='auth.users'?'Retain legacy UUID in archive; explicit native owner crosswalk required':'Referenced table excluded from this private snapshot; not a validated FK'});continue;}
  const keys=r[1].split(',').map(s=>s.trim().replaceAll('"','')),refs=r[3].split(',').map(s=>s.trim().replaceAll('"',''));
  const n=(await q(`select count(*)::int n from ${fq('t_'+m.table_name)} t where ${keys.map(k=>'t.'+qi(k)+' IS NOT NULL').join(' AND ')} and not exists(select 1 from ${fq('t_'+ref)} r where ${keys.map((k,i)=>'t.'+qi(k)+'=r.'+qi(refs[i])).join(' AND ')})`))[0].n;
  if(n)throw Error('DANGLING_FOREIGN_KEY:'+m.table_name+':'+ref);
 }
 results.push({table:m.table_name,rows:a.n,source_and_backup_and_typed_hash:a.h,foreign_keys_checked:true});
}
const security=await q(`select c.relname,coalesce(bool_or(a.grantee=0),false) public_table_grant from pg_class c join pg_namespace n on n.oid=c.relnamespace left join lateral aclexplode(c.relacl) a on true where n.nspname='${schema}' and c.relkind='r' group by c.relname having coalesce(bool_or(a.grantee=0),false)`);
if(security.length)throw Error('PUBLIC_TABLE_GRANT');
console.log(JSON.stringify({at:new Date().toISOString(),schema,results,skipped_foreign_keys:skipped,public_table_grants:security.length,manifest_sha256:createHash('sha256').update(JSON.stringify(results)).digest('hex'),production_ready:false}));
