import {z} from "zod";
export const schema=z.discriminatedUnion("action",[
 z.object({action:z.literal("get")}),
 z.object({action:z.literal("estimate"),gameId:z.number().int().positive(),enabled:z.boolean().nullable()}),
 z.object({action:z.literal("pick"),key:z.string().max(100).nullable()})
]);
export type Preferences=Record<string,{enabled?:boolean;key?:string|null}>;
export async function preferences(body:z.input<typeof schema>):Promise<Preferences>{const r=await fetch("/_api/enhancement-preferences",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});const d=await r.json();if(!r.ok)throw Error(d.error||"Unable to save preferences");return d.values;}
