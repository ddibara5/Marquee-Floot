// Matching Marquee Floot VM only. Status by default; never auto-start after a checkpoint.
// Set action only after user resumes preparation. No production cutover/publishing.
import {randomBytes,randomUUID,createHash} from "node:crypto";
const CONFIG={action:"status",maxParts:4};
const resourceName="Floot Database for Marquee Floot Pilot",archiveId="9d66a0d3-9a16-4b58-9c0b-fd4bf3dd6b94";
const EXPECTED_HASH="93751823f4eaab467f7d123ace5ee49b";
const sections=["marquee_episodes","marquee_franchise_overrides","marquee_ingest_raw","marquee_mapping_review","marquee_movies","marquee_ratings","marquee_season_release_schedules","marquee_seasons","marquee_shows","marquee_source_mappings","marquee_statuses","marquee_sync_state","marquee_titles","marquee_undated_completion_evidence","marquee_undated_completions","marquee_verified_season_totals","marquee_watch_date_decisions","marquee_watch_history","marquee_watch_history_sources","marquee_watchlist"];
const q=async(query,write=false,resource=resourceName)=>{
 const r=await _floot.runSQLQuery({resourceName:resource,query,...(write?{reasonAndExplanationForNotReadOnly:"Authorized resumed encrypted backup preparation; capability/receipt and isolated restore writes only, no production app writes."}:{})});
 if(r.truncated)throw Error("TRUNCATED");return r.rows;
};
const summary=await q("select count(*) parts,count(*) filter(where restored_tables>0) restored,count(distinct archive_offset) raw_slices,max(archive_offset) last_offset from migration_backups_20260930.receipts where archive_id='"+archiveId+"'");
console.log(JSON.stringify({archiveId,expectedParts:131,expectedRawSlices:112,current:summary[0],completeKeySetRequired:true}));
if(CONFIG.action==="status")process.exit(0);
if(!["backup","restore"].includes(CONFIG.action)||!Number.isInteger(CONFIG.maxParts)||CONFIG.maxParts<1||CONFIG.maxParts>4)throw Error("BOUNDED_ACTION_GUARD");
const invoke=async(body)=>{
 const id=randomUUID(),token=randomBytes(32).toString("hex"),hash=createHash("sha256").update(token).digest("hex");
 await q("insert into migration_backups_20260930.capabilities(id,token_hash,expires_at) values('"+id+"','"+hash+"',now()+interval '5 minutes')",true);
 const r=await fetch("https://9ba56374-eb1b-4942-af2f-e15e4df14755.sandbox.floot.app/_api/migration-backup",{method:"POST",headers:{"Content-Type":"application/json",Authorization:"Bearer "+token},body:JSON.stringify({id,...body})});
 const result=await r.json();if(!r.ok)throw Error("PREPARATION_FAILED:"+result.code);return result;
};
if(CONFIG.action==="backup"){
 const original=await q("select md5(to_jsonb(t)::text) hash from public.marquee_floot_import_backups t where id='"+archiveId+"'",false,"PostgreSQL Database");
 if(original.length!==1||original[0].hash!==EXPECTED_HASH)throw Error("ARCHIVE_DRIFT_USE_NEW_REVIEWED_BASELINE");
 const missing=await q("select x.offset_n from generate_series(0,11100,100) x(offset_n) where not exists(select 1 from migration_backups_20260930.receipts r where r.archive_id='"+archiveId+"' and r.archive_section='marquee_ingest_raw' and r.archive_offset=x.offset_n) order by x.offset_n limit "+CONFIG.maxParts);
 let done=0;for(const {offset_n}of missing){const r=await invoke({source:"legacy",historyRow:archiveId,historySection:"marquee_ingest_raw",historyOffset:offset_n});console.log(JSON.stringify({offset:offset_n,id:r.id,decryptVerified:r.decryptVerified}));done++;}
 if(done===0){
 for(const section of sections.filter(s=>s!=="marquee_ingest_raw")){
 const rows=await q("select id from migration_backups_20260930.receipts where archive_id='"+archiveId+"' and archive_section='"+section+"' and archive_offset is null");
 if(rows.length)continue;
 const r=await invoke({source:"legacy",historyRow:archiveId,historySection:section});console.log(JSON.stringify({section,id:r.id,decryptVerified:r.decryptVerified}));
 if(++done===CONFIG.maxParts)break;
 }
 }
}else{
 const whole=["6b70c08d-1a6b-41aa-8ba3-777fd829b419","b65e3609-13b3-46ea-95a9-d642786ccff7","eeb6aaa2-46a8-4ece-adf0-9b1a1b7e33d2","73a624ef-b3f3-4de3-bbb4-68dcd99cb2ad"];
 const pending=await q("select id from migration_backups_20260930.receipts where restored_tables=0 and (archive_id='"+archiveId+"' or id=any(array["+whole.map(id=>"'"+id+"'::uuid").join(",")+"])) order by created_at limit "+CONFIG.maxParts);
 for(const {id}of pending)console.log(JSON.stringify(await invoke({action:"restore",backupId:id})));
}
console.log("STOPPED_AFTER_BOUNDED_BATCH");
// Assembly is a separate unfinished stage: complete 0..11100 coverage, final 46-row
// slice, exactly 19 other sections, header agreement, source post-copy hash, and
// reconstructed full-row MD5 must all pass. Max-offset or decrypt-only is insufficient.
