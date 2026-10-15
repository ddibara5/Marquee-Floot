import {z} from "zod";
export const schema=z.object({action:z.enum(["list","search","match","ignore","reopen"]),item:z.string().max(200).optional(),query:z.string().trim().max(80).optional(),target:z.number().int().positive().optional()});
export type ReviewRow={key:string;label:string;evidence:string;ignored:boolean};
export type OutputType={rows?:ReviewRow[];candidates?:{id:number;label:string}[];saved?:boolean};
export async function review(body:z.input<typeof schema>):Promise<OutputType>{const r=await fetch("/_api/mapping-review",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(schema.parse(body))});const d=await r.json();if(!r.ok)throw Error(d.error??"Review unavailable");return d;}