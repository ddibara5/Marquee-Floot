import { z } from "zod";
import superjson from "superjson";
export const schema = z.discriminatedUnion("action", [
 z.object({ action: z.literal("create"), email: z.string().email(), displayName: z.string().trim().min(1).max(60), password: z.string().min(8), bot: z.boolean() }),
 z.object({ action: z.literal("revoke"), userId: z.number().int() }),
 z.object({ action: z.literal("setPassword"), userId: z.number().int(), password: z.string().min(8) }),
]);
export type InputType = z.infer<typeof schema>;
export type OutputType = { ok: true };
export async function postHouseholdAccounts(input: InputType): Promise<OutputType> {
 const r = await fetch("/_api/household-accounts", { method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: superjson.stringify(schema.parse(input)) });
 const data = superjson.parse<any>(await r.text());
 if (!r.ok) throw new Error(data.error || "Could not update accounts");
 return data;
}