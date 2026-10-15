import {schema} from "./enhancement-preferences_POST.schema";
import {getServerUserSession} from "../helpers/getServerUserSession";
import {marqueeWriter} from "../helpers/marqueeWriter";
import {importSql} from "../helpers/marqueeImportDb";
async function handleRequest(request:Request){try{
 const {user}=await getServerUserSession(request);if(user.id!==1)return Response.json({error:"Forbidden"},{status:403});
 const input=schema.parse(await request.json());
 const values=await importSql().begin(async tx=>{
 if(input.action==="estimate"){
 throw Error("Unsupported preference");
 }else if(input.action==="pick"){await tx`insert into public.marquee_enhancement_preferences(user_id,item_key,value) values(${user.id},'pick-next',${tx.json({key:input.key})}) on conflict(user_id,item_key) do update set value=excluded.value,updated_at=now()`;}
 const rows=await tx`select item_key,value from public.marquee_enhancement_preferences where user_id=${user.id} and item_key not like 'review:%'`;
 return Object.fromEntries(rows.map(r=>[r.item_key,r.value]));});
 return Response.json({values});}catch(e){return Response.json({error:"Unable to read or save preferences"},{status:403});}}
export const handle=marqueeWriter.endpoint(handleRequest,"enhancement-preferences_POST.ts",true);
