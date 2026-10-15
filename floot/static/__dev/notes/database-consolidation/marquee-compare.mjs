// Read-only. Execute on Marquee's Floot VM; no provider calls, secrets, or writes.
import {createHash} from 'node:crypto';
const LOCAL='Floot Database for Marquee Floot Pilot', REMOTE='PostgreSQL Database';
async function q(resourceName,query){const r=await _floot.runSQLQuery({resourceName,query});if(r.truncated)throw Error('TRUNCATED_QUERY');return r.rows;}
async function all(resource,table,columns='*',order='1'){
 const out=[];const expected=Number((await q(resource,`select count(*) n from public.${table}`))[0].n);
 for(let start=0;start<expected;start+=320){const pages=await Promise.all(Array.from({length:Math.min(8,Math.ceil((expected-start)/40))},(_,i)=>q(resource,`select ${columns} from public.${table} order by ${order} limit 40 offset ${start+i*40}`)));for(const page of pages)out.push(...page);}
 if(out.length!==expected)throw Error('COUNT_CHANGED:'+table);return out;
}
const stable=x=>JSON.stringify(x,(k,v)=>v);
const digest=rows=>createHash('sha256').update(rows.map(stable).sort().join('\n')).digest('hex');
const links=await all(LOCAL,'marquee_legacy_links','*','entity_type,source_id');
const aliases=await all(LOCAL,'marquee_title_aliases');
const link=new Map(links.map(r=>[r.entity_type+':'+r.source_id,r.local_id]));
const alias=new Map(aliases.map(r=>[r.duplicate_title_id,r.canonical_title_id]));
function title(id){let n=id;const seen=new Set();while(alias.has(n)){if(seen.has(n))throw Error('ALIAS_CYCLE');seen.add(n);n=alias.get(n);}return n;}
const missing={};const remote={};const local={};
for(const [name,cols,order] of [
 ['marquee_titles','id,display_title,media_type,is_anime','id'],
 ['marquee_seasons','id,show_title_id,season_number','id'],
 ['marquee_episodes','id,season_id,episode_number','id'],
 ['marquee_watch_history','id,episode_id,movie_title_id,logical_event_key,source,source_record_id,watched_at','id'],
 ['marquee_undated_completions','*','id'],
 ['marquee_ratings','*','id'],['marquee_statuses','*','id'],
 ['marquee_source_mappings','*','id'],['marquee_watchlist','*','title_id']
 ]) remote[name]=await all(REMOTE,name,cols,order);
for(const [name,cols,order] of [
 ['marquee_titles','id,display_title,media_type','id'],
 ['marquee_seasons','id,title_id,season_number','id'],
 ['marquee_episodes','id,season_id,episode_number','id'],
 ['marquee_watch_events','id,episode_id,source_event_key,source,watched_at','id'],
 ['marquee_title_watch_events','id,title_id,source_event_key,source,watched_at','id'],
 ['marquee_legacy_completions','*','source_id'],
 ['marquee_legacy_ratings','*','source_id'],['marquee_legacy_statuses','*','source_id'],
 ['marquee_source_mappings','*','source,source_entity_type,source_id'],
 ['marquee_legacy_watchlist','*','title_id'],
 ['marquee_manual_episode_completions','*','episode_id'],
 ['marquee_episode_unwatched','*','episode_id'],
 ['marquee_manual_title_statuses','*','title_id'],
 ['marquee_manual_trakt_outbox','source_event_key,state,watched_at,trakt_history_id,updated_at','source_event_key']
 ]) local[name]=await all(LOCAL,name,cols,order);
const localTitles=new Map(local.marquee_titles.map(r=>[r.id,r]));
const remoteTitles=new Map(remote.marquee_titles.map(r=>[r.id,r]));
const remoteSeasons=new Map(remote.marquee_seasons.map(r=>[r.id,r]));
for(const [table,kind] of [['marquee_titles','title'],['marquee_seasons','season'],['marquee_episodes','episode']]){
 missing[kind]=remote[table].filter(r=>!link.has(kind+':'+r.id)).map(r=>({id:r.id,title:kind==='title'?r.display_title:kind==='season'?remoteTitles.get(r.show_title_id)?.display_title:remoteTitles.get(remoteSeasons.get(r.season_id)?.show_title_id)?.display_title}));
}
const nativeEvents=[...local.marquee_watch_events.map(r=>({...r,kind:'episode',target:r.episode_id})),...local.marquee_title_watch_events.map(r=>({...r,kind:'movie',target:title(r.title_id)}))];
const nativeByKey=new Map(nativeEvents.map(r=>[r.source_event_key,r]));
const eventMissing=[],eventConflict=[];let matched=0;
for(const r of remote.marquee_watch_history){const n=nativeByKey.get(r.logical_event_key);const target=r.episode_id?link.get('episode:'+r.episode_id):title(link.get('title:'+r.movie_title_id));if(!n){eventMissing.push({...r,local_target:target??null});continue;}matched++;if(Date.parse(r.watched_at)!==Date.parse(n.watched_at)||target!==n.target)eventConflict.push({key:r.logical_event_key,date_equal:Date.parse(r.watched_at)===Date.parse(n.watched_at),remote_target:target??null,native_target:n.target});}
const sourceKeys=new Set(remote.marquee_watch_history.map(r=>r.logical_event_key));
const nativeOnly=nativeEvents.filter(r=>!sourceKeys.has(r.source_event_key));
const completions=new Map(local.marquee_legacy_completions.map(r=>[r.source_id,r]));
const completionMissing=[],completionConflict=[];
for(const r of remote.marquee_undated_completions){const n=completions.get(r.id);const target=r.episode_id?link.get('episode:'+r.episode_id):title(link.get('title:'+r.movie_title_id));if(!n)completionMissing.push({id:r.id,local_target:target??null});else if(target!==(n.episode_id??title(n.title_id)))completionConflict.push({id:r.id,remote_target:target??null,native_target:n.episode_id??n.title_id});}
const mappingByLegacy=new Map(local.marquee_source_mappings.filter(r=>r.legacy_id).map(r=>[r.legacy_id,r]));
const mappingMissing=[],mappingConflict=[];
for(const r of remote.marquee_source_mappings){const n=mappingByLegacy.get(r.id);if(!n){mappingMissing.push({id:r.id,source:r.source,kind:r.source_entity_type,source_id:r.source_id,manual_locked:r.manual_locked});continue;}
 const expected={episode_id:r.episode_id?link.get('episode:'+r.episode_id):null,season_id:r.season_id?link.get('season:'+r.season_id):null,title_id:(r.title_id||r.show_title_id||r.movie_title_id)?title(link.get('title:'+(r.title_id||r.show_title_id||r.movie_title_id))):null};
 const bad=Object.keys(expected).filter(k=>expected[k]!== (k==='title_id'&&n[k]!=null?title(n[k]):n[k]));if(bad.length||r.manual_locked!==n.manual_locked)mappingConflict.push({id:r.id,source:r.source,kind:r.source_entity_type,fields:bad,locked_equal:r.manual_locked===n.manual_locked});}
const stateConflicts=[];const stateMissing=[];
for(const [table,native,fields] of [['marquee_ratings','marquee_legacy_ratings',['score','source','manual_locked','source_record_id']],['marquee_statuses','marquee_legacy_statuses',['status','source','manual_locked']]]){
 const byId=new Map(local[native].map(r=>[r.source_id,r]));for(const r of remote[table]){const n=byId.get(r.id);if(!n){stateMissing.push({table,id:r.id,source:r.source,manual_locked:r.manual_locked});continue;}const bad=fields.filter(k=>k==='score'?Number(r[k])!==Number(n[k]):String(r[k])!==String(n[k]));if(bad.length)stateConflicts.push({table,id:r.id,source:r.source,fields:bad});}
}
const duplicateKeys=nativeEvents.length-nativeByKey.size;
const canonicalCovered=new Set([...local.marquee_watch_events.map(r=>r.episode_id),...local.marquee_legacy_completions.filter(r=>r.episode_id!=null).map(r=>r.episode_id),...local.marquee_manual_episode_completions.map(r=>r.episode_id)]);
for(const r of local.marquee_episode_unwatched)canonicalCovered.delete(r.episode_id);
const inventories={};
for(const resource of [REMOTE,LOCAL]) inventories[resource]=await q(resource,"select c.relname table_name,c.relkind,c.relrowsecurity from pg_class c join pg_namespace n on n.oid=c.relnamespace where n.nspname='public' and c.relkind in ('r','v','m') order by c.relname");
const protectedHashes=Object.fromEntries(Object.entries(local).filter(([t])=>/manual_|unwatched|alias|legacy_ratings|legacy_statuses/.test(t)).map(([t,rs])=>[t,{rows:rs.length,sha256:digest(rs)}]));
const result={at:new Date().toISOString(),snapshot_atomic:false,scope:'Read-only comparisons; rerun under bounded final writer pause',counts:{supabase:Object.fromEntries(Object.entries(remote).map(([t,r])=>[t,r.length])),floot:Object.fromEntries(Object.entries(local).map(([t,r])=>[t,r.length]))},identity_missing:missing,history:{matched,missing:eventMissing,conflicts:eventConflict,native_only:nativeOnly,duplicate_keys:duplicateKeys},undated:{missing:completionMissing,conflicts:completionConflict,native_only:local.marquee_legacy_completions.filter(r=>!remote.marquee_undated_completions.some(s=>s.id===r.source_id)).length},mappings:{missing:mappingMissing,conflicts:mappingConflict},seed_state:{missing:stateMissing,conflicts:stateConflicts},canonical_episodes_after_unwatch:canonicalCovered.size,protectedHashes,inventories};
const bounded=JSON.parse(JSON.stringify(result));delete bounded.inventories;
for(const group of ['history','undated','mappings','seed_state','identity_missing'])for(const [key,val]of Object.entries(bounded[group]))if(Array.isArray(val))bounded[group][key]={count:val.length,sample:val.slice(0,12)};
console.log(JSON.stringify(bounded));
