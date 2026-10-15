// Read-only primary-key/value delta planner. No values or credentials printed.
export function compareKeys(before,after){
 const b=new Map(before.map(r=>[r.row_key,r.row_md5])),a=new Map(after.map(r=>[r.row_key,r.row_md5]));
 if(b.size!==before.length||a.size!==after.length)throw Error('DUPLICATE_KEYS');
 return {insert:[...a.keys()].filter(k=>!b.has(k)),update:[...a.keys()].filter(k=>b.has(k)&&a.get(k)!==b.get(k)),delete:[...b.keys()].filter(k=>!a.has(k))};
}
const CONFIG=/* CONFIG */ {};
if(CONFIG.app){
 const {app,schema,source,target}=CONFIG;
 if(!['gamedeck','marquee'].includes(app)||schema!=='prep_'+app+'_20260930'||source===target)throw Error('ISOLATION_GUARD');
 const qi=s=>'"'+s.replaceAll('"','""')+'"';const lit=s=>"'"+s.replaceAll("'","''")+"'";
 async function q(resourceName,query){const r=await _floot.runSQLQuery({resourceName,query});if(r.truncated)throw Error('TRUNCATED');return r.rows;}
 async function pages(resourceName,n,sql){const rows=[];for(let start=0;start<n;start+=800){const batch=await Promise.all(Array.from({length:Math.min(8,Math.ceil((n-start)/100))},(_,i)=>q(resourceName,sql+` limit 100 offset ${start+i*100}`)));rows.push(...batch.flat());}return rows;}
 const manifests=await q(target,`select table_name,constraints from ${qi(schema)}.manifest order by table_name`),results=[];
 for(const m of manifests){
  const pk=m.constraints.find(c=>c.type==='p')?.keys;
  const key=pk?.length?`jsonb_build_array(${pk.map(k=>'t.'+qi(k)).join(',')})::text`:'md5(to_jsonb(t)::text)';
  const aggregate=`select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by ${key} COLLATE "C"),'')) h from public.${qi(m.table_name)} t`;
  const before=(await q(source,aggregate))[0],old=[],live=[];
  const archived=(await q(target,`select count(*)::int n from ${qi(schema)}.${qi('b_'+m.table_name)}`))[0].n;
  old.push(...await pages(target,archived,`select row_key,row_md5 from ${qi(schema)}.${qi('b_'+m.table_name)} order by row_key COLLATE "C"`));
  live.push(...await pages(source,before.n,`select ${key} row_key,md5(to_jsonb(t)::text) row_md5 from public.${qi(m.table_name)} t order by ${key} COLLATE "C"`));
  const after=(await q(source,aggregate))[0];if(before.n!==after.n||before.h!==after.h||live.length!==before.n)throw Error('SOURCE_CHANGED_DURING_PLAN:'+m.table_name);
  const d=compareKeys(old,live);results.push({table:m.table_name,archived:old.length,live:live.length,insert:d.insert.length,update:d.update.length,delete:d.delete.length,source_hash:after.h});
 }
 console.log(JSON.stringify({at:new Date().toISOString(),app,schema,read_only:true,snapshot_atomic:false,production_ready:false,results}));
}
