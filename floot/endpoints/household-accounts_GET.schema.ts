import superjson from "superjson";
export type HouseholdAccount = { id: number; email: string; displayName: string; isBot: boolean; isOwner: boolean; canSignIn: boolean };
export type OutputType = { accounts: HouseholdAccount[] };
export async function getHouseholdAccounts(): Promise<OutputType> {
 const r = await fetch("/_api/household-accounts", { credentials: "include" });
 const data = superjson.parse<any>(await r.text());
 if (!r.ok) throw new Error(data.error || "Could not load accounts");
 return data;
}