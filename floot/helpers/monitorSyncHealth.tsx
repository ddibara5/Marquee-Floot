import {importSql} from "./marqueeImportDb";
import {marqueeWriter} from "./marqueeWriter";
import {sourceState} from "./syncPresentation";
export async function monitorSyncHealth(){return marqueeWriter.work("task:monitorSyncHealth",async()=>{
 const sql=importSql(),sources=await sql`select source,mode,last_success_at,credential_blocked,case when lease_until>now() then run_id else null end run_id from marquee_import_controls where source in ('trakt','crunchyroll')`;
 const issues=sources.filter(s=>["Reconnect","Paused","Overdue"].includes(sourceState(s as any))).map(s=>s.source+": "+sourceState(s as any));
 const [cr]=await sql`select count(distinct r.source_identifier)::int n from marquee_crunchyroll_raw r where r.user_id=1 and r.fully_watched and r.classification='held' and r.source_identifier is not null and not exists(select 1 from marquee_source_mappings m where m.source='crunchyroll' and m.source_entity_type='episode' and m.source_id=r.source_identifier and m.episode_id is not null) and not exists(select 1 from public.marquee_enhancement_preferences p where p.user_id=1 and p.item_key='review:cr:'||r.source_identifier and p.value->>'ignored'='true')`;
 const [trakt]=await sql`select count(*)::int n from marquee_trakt_pending where user_id=1`;
 const stalled=await sql`select source from marquee_import_controls where run_id is not null and lease_until<=now()`;
 if(Number(cr.n)>0)issues.push("Crunchyroll: "+cr.n+" identifiers awaiting review");
 if(Number(trakt.n)>0)issues.push("Trakt: "+trakt.n+" pending source records");
 for(const source of stalled)issues.push(source.source+": interrupted import");
 const value={checkedAt:new Date().toISOString(),issues};
 await sql`insert into public.marquee_enhancement_preferences(user_id,item_key,value) values(1,'sync-health',${sql.json(value)}) on conflict(user_id,item_key) do update set value=excluded.value,updated_at=now()`;
 if(issues.length)console.warn("Marquee sync needs attention",issues.join("; "));
 return value;
 });}
