// Large evidence transport to the private rehearsal archive only.
// A fixed public transport phrase enables compression; it is NOT a credential or security boundary.
const SRC='PostgreSQL Database',DST='Floot Database for Marquee Floot Pilot';
const phrase='migration-rehearsal-public-transport-v1';
const lit=s=>"'"+String(s).replaceAll("'","''")+"'";
async function q(resourceName,query,write=false){const r=await _floot.runSQLQuery({resourceName,query,...(write?{reasonAndExplanationForNotReadOnly:'Authorized backup transport exclusively into prep_marquee_20260930; no public table or authentication writes.'}:{})});if(r.truncated)throw Error('TRUNCATED');return r;}
const hashSql="select count(*)::int n,md5(coalesce(string_agg(md5(to_jsonb(t)::text),'' order by jsonb_build_array(t.id)::text COLLATE \"C\"),'')) h from public.marquee_ingest_raw t";
const before=(await q(SRC,hashSql)).rows[0];
const saved=(await q(DST,'select count(*)::int n,max(row_key COLLATE "C") last_key from prep_marquee_20260930.b_marquee_ingest_raw')).rows[0];
const where=saved.last_key?`where jsonb_build_array(t.id)::text COLLATE "C">${lit(saved.last_key)} COLLATE "C"`:'';
let inserted=0,replayed=0;
async function copy(offset,size){
 let r;
 try{r=await q(SRC,`select encode(extensions.pgp_sym_encrypt(coalesce(jsonb_agg(jsonb_build_object('row_key',jsonb_build_array(t.id)::text,'row_data',to_jsonb(t),'row_md5',md5(to_jsonb(t)::text))),'[]'::jsonb)::text,${lit(phrase)},'compress-algo=1,compress-level=6'),'base64') blob from (select * from public.marquee_ingest_raw t ${where} order by jsonb_build_array(t.id)::text COLLATE "C" limit ${size} offset ${offset}) t`);}
 catch(e){if(e.message!=='TRUNCATED'||size===1)throw e;const h=Math.floor(size/2);await copy(offset,h);await copy(offset+h,size-h);return;}
 const blob=r.rows[0].blob;
 const sql=`insert into prep_marquee_20260930.b_marquee_ingest_raw(row_key,row_data,row_md5) select row_key,row_data,row_md5 from jsonb_to_recordset(prep_marquee_20260930.pgp_sym_decrypt(decode(${lit(blob)},'base64'),${lit(phrase)})::jsonb) r(row_key text,row_data jsonb,row_md5 text) on conflict(row_key) do nothing`;
 inserted+=(await q(DST,sql,true)).rowCount;replayed+=(await q(DST,sql,true)).rowCount;
}
for(let start=0;start<before.n-saved.n;start+=800)await Promise.all(Array.from({length:Math.min(4,Math.ceil((before.n-saved.n-start)/200))},(_,i)=>copy(start+i*200,Math.min(200,before.n-saved.n-start-i*200))));
const after=(await q(SRC,hashSql)).rows[0];
const dest=(await q(DST,'select count(*)::int n,md5(coalesce(string_agg(row_md5,\'\' order by row_key COLLATE "C"),\'\')) h from prep_marquee_20260930.b_marquee_ingest_raw')).rows[0];
if(before.n!==after.n||before.h!==after.h||before.n!==dest.n||before.h!==dest.h||replayed!==0)throw Error('RAW_ARCHIVE_GATE');
console.log(JSON.stringify({at:new Date().toISOString(),schema:'prep_marquee_20260930',table:'marquee_ingest_raw',source_count:before.n,backup_count:dest.n,source_and_backup_md5:dest.h,inserted,replayed,typed_restore:'Run the normal part-7 script now to verify constraints and typed restore',snapshot_atomic:false}));
