import {marqueeWriter} from "./marqueeWriter";
import {importSql,supabaseSql} from "./marqueeImportDb";
import {fencedRun,finishImport,failImport} from "./marqueeImportState";
import {importHttp} from "./marqueeImportHttp";
async function marqueeAniListWork(input:{runId:string}){
 try{
 const run=await fencedRun(input.runId);if(run.mode!=="shadow")throw Error("ANILIST_SEED_ONLY");
 const sql=importSql();
 let saved=(await sql`select payload from marquee_import_pages where run_id=${input.runId} and feed='list' and page=1`)[0]?.payload;
 if(!saved){
 const query="query($userId:Int!){MediaListCollection(userId:$userId,type:ANIME){user{id name mediaListOptions{scoreFormat}} hasNextChunk lists{entries{id mediaId status score(format:POINT_10_DECIMAL) progress updatedAt media{id format title{romaji english native}}}}}}";
 const result=await (await importHttp("https://graphql.anilist.co",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({query,variables:{userId:7375416}})},"ANILIST")).json();
 const collection=result.data?.MediaListCollection;
 if(result.errors?.length||collection?.user?.id!==7375416||collection.hasNextChunk)throw Error("ANILIST_COLLECTION_INVALID");
 const unique=new Map<number,any>();
 for(const list of collection.lists??[])for(const entry of list.entries??[]){
 if(!Number.isSafeInteger(entry.id)||!Number.isSafeInteger(entry.mediaId)||entry.media?.id!==entry.mediaId)throw Error("ANILIST_ENTRY_INVALID");
 const prior=unique.get(entry.id);if(prior&&JSON.stringify(prior)!==JSON.stringify(entry))throw Error("ANILIST_DUPLICATE_CONFLICT");
 unique.set(entry.id,entry);
 }
 saved=[...unique.values()];
 if(saved.length>11000)throw Error("ANILIST_COLLECTION_CAP");
 await sql`insert into marquee_import_pages(run_id,feed,page,payload,metadata)values(${input.runId},'list',1,${sql.json(saved)},${sql.json({publicOnly:true,userId:7375416,seedOnly:true})})on conflict do nothing`;
 }
 const remote=supabaseSql();
 const stored=await remote`select source_id,canonical_entity_type from public.marquee_source_mappings where source='anilist'`;
 const seeds=await remote`select (select count(*) from public.marquee_statuses where source='anilist') statuses,(select count(*) from public.marquee_ratings where source='anilist') ratings`;
 const ids=new Set(stored.map(s=>s.source_id));
 await finishImport(input.runId,{entries:saved.length,mapped:saved.filter((e:any)=>ids.has(String(e.mediaId))).length,unmapped:saved.filter((e:any)=>!ids.has(String(e.mediaId))).length,seed:seeds[0],publicOnly:true,datedWatches:0,canonicalCommitted:false,seedOnly:true});
 }catch(e){await failImport(input.runId,e);throw e;}
}



export const marqueeAniList = (input: Parameters<typeof marqueeAniListWork>[0]) => marqueeWriter.work("import:marqueeAniList", () => marqueeAniListWork(input), input.runId);
