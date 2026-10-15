import {marqueeWriter} from "./marqueeWriter";
import {queueTask} from "@floot/queueTask";
import {createHash} from "node:crypto";
import {importSql} from "./marqueeImportDb";
import {fencedRun,failImport} from "./marqueeImportState";
import {importHttp} from "./marqueeImportHttp";
import {crunchyrollNext,validateEvents} from "./marqueeImportPolicy";
import {marqueeImportFailed} from "./marqueeImportFailed";
const BASE="https://www.crunchyroll.com";
const AUTH_BASE="https://beta-api.crunchyroll.com";
async function marqueeCrPageWork(input:{runId:string,page?:number}){
 try {
 const runId=input.runId,page=input.page??1,sql=importSql();await fencedRun(runId);
 if(page<1||page>20)throw Error("CR_PAGE_CAP");
 const prior=page>1?(await sql`select metadata from marquee_import_pages where run_id=${runId} and feed='history' and page=${page-1}`)[0]?.metadata:null;
 const staged=(await sql`select metadata from marquee_import_pages where run_id=${runId} and feed='history' and page=${page}`)[0];
 let metadata=staged?.metadata;
 if(!staged){
 const cookie=process.env.CRUNCHYROLL_ETP_RT;if(!cookie||/[\r\n;]/.test(cookie))throw Error("CR_CREDENTIAL_MISSING");
 const form=new URLSearchParams({grant_type:"etp_rt_cookie",scope:"offline_access",device_id:"2cfbca94-2d6f-4b81-ad06-29f2825120cb",device_name:"Marquee Floot",device_type:"com.crunchyroll.desktop.windows"});
 const tokenBody=await (await importHttp(AUTH_BASE+"/auth/v1/token",{method:"POST",headers:{Authorization:"Basic "+Buffer.from("noaihdevm_6iyg0a8l0q:").toString("base64"),Cookie:"etp_rt="+cookie,"Content-Type":"application/x-www-form-urlencoded"},body:form.toString()},"CR_AUTH",false)).json();
 if(typeof tokenBody.access_token!=="string")throw Error("CR_AUTH_SHAPE");
 const headers={Authorization:"Bearer "+tokenBody.access_token,Accept:"application/json"};
 const account=await (await importHttp(AUTH_BASE+"/accounts/v1/me",{headers},"CR_ACCOUNT")).json();
 const accountId=account.account_id;
 if(typeof accountId!=="string"||!/^[a-zA-Z0-9-]{10,128}$/.test(accountId)||createHash("sha256").update(accountId).digest("hex")!=="74c1b81df688c8cb146890cedf0b90d6615db92b75b76599cc8868a765a178fc")throw Error("CR_ACCOUNT_MISMATCH");
 if(prior&&prior.accountId!==accountId)throw Error("CR_ACCOUNT_MISMATCH");
 const url=page===1?AUTH_BASE+"/content/v1/watch-history/"+accountId+"?locale=en-US&page=1&page_size=20":prior?.next;
 if(!url)throw Error("CR_PAGE_SEQUENCE");
 const body=await (await importHttp(url,{headers},"CR_HISTORY")).json();
 validateEvents(body.items);if(body.items.length>20)throw Error("CR_PAGE_SHAPE");
 const next=crunchyrollNext(body.next_page,accountId,page)?.replace(BASE,AUTH_BASE)??null;
 if(next&&(await sql`select 1 from marquee_import_pages where run_id=${runId} and metadata->>'next'=${next}`).length)throw Error("CR_REPEATED_CURSOR");
 metadata={next,accountId,terminal:!next,windowBound:page===19};
 await fencedRun(runId);
 await sql`insert into marquee_import_pages(run_id,feed,page,payload,metadata) values(${runId},'history',${page},${sql.json(body.items)},${sql.json(metadata)}) on conflict do nothing`;
 }
 // n8n production actually fetches 19 pages (380 rows); retain that verified window.
 if(metadata.next&&page<19)await queueTask("marqueeCrPage",{runId,page:page+1},{onError:"marqueeImportFailed",concurrency:1});
 else await queueTask("marqueeCrFinish",{runId},{onError:"marqueeImportFailed",concurrency:1});
 }catch(e){await failImport(input.runId,e);throw e;}
}



export const marqueeCrPage = (input: Parameters<typeof marqueeCrPageWork>[0]) => marqueeWriter.work("import:marqueeCrPage", () => marqueeCrPageWork(input), input.runId);
