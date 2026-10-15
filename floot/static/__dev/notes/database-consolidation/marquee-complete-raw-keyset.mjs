// Complete interrupted parallel transport by full key-set comparison, never max-key alone.
const SRC='PostgreSQL Database',DST='Floot Database for Marquee Floot Pilot';
const phrase='migration-rehearsal-public-transport-v1';
const lit=s=>"'"+String(s).replaceAll("'","''")+"'";
async function q(resourceName,query,write=false){const r=await _floot.runSQLQuery({resourceName,query,...(write?{reasonAndExplanationForNotReadOnly:'Authorized isolated raw-evidence backup reconciliation in prep_marquee_20260930 only.'}:{})});if(r.truncated)throw Error('TRUNCATED');return r;}
await q(DST,'create table if not exists prep_marquee_20260930.raw_source_keys(id uuid primary key)',true);
const total=(await q(SRC,'select count(*)::int n from public.marquee_ingest_raw')).rows[0].n;
for(let start=0;start<total;start+=800){const pages=await Promise.all(Array.from({length:Math.min(8,Math.ceil((total-start)/100))},(_,i)=>q(SRC,`select id from public.marquee_ingest_raw order by id limit 100 offset ${start+i*100}`)));const rows=pages.flatMap(r=>r.rows);await q(DST,`insert into prep_marquee_20260930.raw_source_keys(id) values ${rows.map(r=>'('+lit(r.id)+'::uuid)').join(',')} on conflict do nothing`,true);}
const missing=(await q(DST,`select k.id from prep_marquee_20260930.raw_source_keys k left join prep_marquee_20260930.b_marquee_ingest_raw b on b.row_key=jsonb_build_array(k.id)::text where b.row_key is null order by k.id`)).rows;
let inserted=0;
for(let start=0;start<missing.length;start+=20){const ids=missing.slice(start,start+20);let blob=(await q(SRC,`select encode(extensions.pgp_sym_encrypt(jsonb_agg(jsonb_build_object('row_key',jsonb_build_array(t.id)::text,'row_data',to_jsonb(t),'row_md5',md5(to_jsonb(t)::text)))::text,${lit(phrase)},'compress-algo=1,compress-level=6'),'base64') blob from public.marquee_ingest_raw t where id in (${ids.map(r=>lit(r.id)+'::uuid').join(',')})`)).rows[0].blob;
 inserted+=(await q(DST,`insert into prep_marquee_20260930.b_marquee_ingest_raw(row_key,row_data,row_md5) select row_key,row_data,row_md5 from jsonb_to_recordset(prep_marquee_20260930.pgp_sym_decrypt(decode(${lit(blob)},'base64'),${lit(phrase)})::jsonb) r(row_key text,row_data jsonb,row_md5 text) on conflict do nothing`,true)).rowCount;
}
const source=(await q(SRC,'select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),\'\' order by jsonb_build_array(t.id)::text COLLATE "C"),\'\')) h from public.marquee_ingest_raw t')).rows[0];
const backup=(await q(DST,'select count(*)::int n,md5(coalesce(string_agg(row_md5,\'\' order by row_key COLLATE "C"),\'\')) h from prep_marquee_20260930.b_marquee_ingest_raw')).rows[0];
if(source.n!==total||source.n!==backup.n||source.h!==backup.h)throw Error('RAW_KEYSET_HASH_GATE');
console.log(JSON.stringify({at:new Date().toISOString(),table:'marquee_ingest_raw',source_and_backup_count:source.n,source_and_backup_md5:source.h,missing_before:missing.length,filled:inserted,gate:'passed',typed_restore:'Run normal part-7 script to finish constraint verification'}));
