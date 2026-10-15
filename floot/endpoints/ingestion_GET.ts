import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import {getServerUserSession} from "../helpers/getServerUserSession";
import {NotAuthenticatedError} from "../helpers/getSetServerSession";
import {importSql} from "../helpers/marqueeImportDb";
async function handleRequest(request:Request){
 try{const {user}=await getServerUserSession(request);if(user.id!==1)return Response.json({error:"Forbidden"},{status:403});
 const sql=importSql(),sources=await sql`select c.source,c.mode,c.verified_at,c.credential_blocked,c.retry_after,c.last_success_at,case when c.lease_until>now() then c.run_id else null end run_id,
 (select to_jsonb(r)-'snapshot' from marquee_import_runs r where r.source=c.source order by started_at desc limit 1) latest,
 (select coalesce(jsonb_agg(to_jsonb(h)-'snapshot' order by h.started_at desc),'[]'::jsonb) from (select * from marquee_import_runs where source=c.source order by started_at desc limit 10) h) history
 from marquee_import_controls c order by c.source`;
 const [monitor]=await sql`select value from public.marquee_enhancement_preferences where user_id=${user.id} and item_key='sync-health'`;
 return new Response(superjson.stringify({sources,monitoring:monitor?.value??null}),{headers:{"Content-Type":"application/json","Cache-Control":"no-store"}});
 }catch(e){return new Response(superjson.stringify({error:e instanceof NotAuthenticatedError?"Not authenticated":"Unable to load sync health"}),{status:e instanceof NotAuthenticatedError?401:500,headers:{"Content-Type":"application/json"}});}
}



export const handle = marqueeWriter.endpoint(handleRequest, "ingestion_GET.ts", true);
