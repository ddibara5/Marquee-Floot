import {marqueeWriter} from "./marqueeWriter";
import {queueTask} from "@floot/queueTask";
import {importSql} from "./marqueeImportDb";
import {fencedRun,failImport} from "./marqueeImportState";
import {getTraktAccessToken} from "./traktSync";
import {importHttp} from "./marqueeImportHttp";
import {TRAKT_FEEDS,traktPage} from "./marqueeImportPolicy";
import {marqueeImportFailed} from "./marqueeImportFailed";
async function marqueeTraktPageWork(input:{runId:string,feed?:number,page?:number}){
 try{
 const {runId}=input,fi=input.feed??0,page=input.page??1,sql=importSql();
 await fencedRun(runId);
 const feed=TRAKT_FEEDS[fi];if(!feed||page<1||page>100)throw Error("TRAKT_PAGE_CAP");
 const prior=page>1?(await sql`select metadata from marquee_import_pages where run_id=${runId} and feed=${feed} and page=1`)[0]?.metadata:undefined;
 const staged=(await sql`select metadata from marquee_import_pages where run_id=${runId} and feed=${feed} and page=${page}`)[0];
 let metadata=staged?.metadata;
 if(!staged){
 const token=await getTraktAccessToken(1);
 const response=await importHttp("https://api.trakt.tv/sync/"+feed.replace("_","/")+"?limit=100&page="+page,{headers:{Authorization:"Bearer "+token,"trakt-api-key":process.env.TRAKT_CLIENT_ID!,"trakt-api-version":"2",Accept:"application/json","User-Agent":"MarqueeTraktSync/1.0 (github.com/ddibara5/marquee)"}},"TRAKT");
 const body=await response.json();metadata=traktPage(body,response.headers,page,prior);
 await fencedRun(runId);
 await sql`insert into marquee_import_pages(run_id,feed,page,payload,metadata) values(${runId},${feed},${page},${sql.json(body)},${sql.json(metadata)}) on conflict do nothing`;
 }
 if(!metadata.terminal)await queueTask("marqueeTraktPage",{runId,feed:fi,page:page+1},{onError:"marqueeImportFailed",concurrency:1});
 else if(fi<5)await queueTask("marqueeTraktPage",{runId,feed:fi+1,page:1},{onError:"marqueeImportFailed",concurrency:1});
 else await queueTask("marqueeTraktFinish",{runId},{onError:"marqueeImportFailed",concurrency:1});
 }catch(e){await failImport(input.runId,e);throw e;}
}



export const marqueeTraktPage = (input: Parameters<typeof marqueeTraktPageWork>[0]) => marqueeWriter.work("import:marqueeTraktPage", () => marqueeTraktPageWork(input), input.runId);
