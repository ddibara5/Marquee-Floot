import {z} from "zod";
import superjson from "superjson";
export const schema=z.object({source:z.enum(["trakt","crunchyroll","anilist"]),action:z.enum(["shadow","sync","replay","retry"]).default("shadow"),runId:z.string().uuid().optional()});
export type OutputType={runId:string};
export async function runIngestion(body:z.infer<typeof schema>):Promise<OutputType>{
 const response=await fetch("/_api/ingestion",{method:"POST",headers:{"Content-Type":"application/json"},body:superjson.stringify(schema.parse(body))});
 const data=superjson.parse<any>(await response.text());if(!response.ok)throw Error(data.error??"Unable to start sync");return data;
}
