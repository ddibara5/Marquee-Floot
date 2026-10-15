import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import {schema} from "./ingestion_POST.schema";
import {getServerUserSession} from "../helpers/getServerUserSession";
import {NotAuthenticatedError} from "../helpers/getSetServerSession";
import {startMarqueeImport} from "../helpers/marqueeStart";
import {importSql} from "../helpers/marqueeImportDb";
import {sanitizeImportError} from "../helpers/marqueeImportPolicy";
async function handleRequest(request:Request){
 try{
 const {user}=await getServerUserSession(request);if(user.id!==1)return Response.json({error:"Forbidden"},{status:403});
 const input=schema.parse(superjson.parse(await request.text()));
 if(input.source==="anilist"&&input.action==="sync")throw Error("ANILIST_SEED_ONLY");
 if(input.action==="retry"){const sql=importSql();await sql`update marquee_import_controls set credential_blocked=false,retry_after=null where source=${input.source} and run_id is null`;}
 const runId=await startMarqueeImport(input.source,input.action==="sync"?"live":"shadow",input.action==="replay"?input.runId:undefined);
 return new Response(superjson.stringify({runId}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch(e){return new Response(superjson.stringify({error:e instanceof NotAuthenticatedError?"Not authenticated":sanitizeImportError(e)}),{status:e instanceof NotAuthenticatedError?401:409,headers:{"Content-Type":"application/json"}});}
}



export const handle = marqueeWriter.endpoint(handleRequest, "ingestion_POST.ts", true);
