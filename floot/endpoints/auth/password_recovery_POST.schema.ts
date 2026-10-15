import { z } from "zod";
export const schema = z.object({
  action: z.enum(["request","reset"]),
  email: z.string().email().max(254).optional(),
  token: z.string().min(1).max(2048).optional(),
  password: z.string().min(6,"Use at least 6 characters.").refine(value=>new TextEncoder().encode(value).length<=72,"Use at most 72 bytes.").optional(),
}).superRefine((value,ctx)=>{
  if(value.action==="request" && !value.email)ctx.addIssue({code:"custom",path:["email"],message:"Enter your email."});
  if(value.action==="reset" && (!value.token || !value.password))ctx.addIssue({code:"custom",message:"Open a recovery link and enter a new password."});
});
export type OutputType = { message: string };
export async function postPasswordRecovery(body:z.infer<typeof schema>):Promise<OutputType>{
  const response=await fetch("/_api/auth/password_recovery",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(schema.parse(body))});
  const result=await response.json();
  if(!response.ok)throw new Error(result.message || "Recovery is unavailable. Try again.");
  return result;
}