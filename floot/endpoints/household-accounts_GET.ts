import superjson from "superjson";
import { marqueeWriter } from "../helpers/marqueeWriter";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../helpers/getSetServerSession";
import { householdAccess } from "../helpers/householdAccess";
import type { OutputType } from "./household-accounts_GET.schema";

const json = (body: unknown, status = 200) => new Response(superjson.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function handleRequest(request: Request) {
 try {
  const { isBot, accountId } = await getServerUserSession(request);
  if (isBot || accountId !== householdAccess.ownerId) return json({ error: "Only the owner can manage accounts." }, 403);
  const rows = await db.selectFrom("users").leftJoin("userPasswords", "userPasswords.userId", "users.id")
   .select(["users.id", "users.email", "users.displayName", "users.isBot", "userPasswords.id as passwordId"]).orderBy("users.id").execute();
  const payload: OutputType = { accounts: rows.map(r => ({ id: r.id, email: r.email, displayName: r.displayName, isBot: r.isBot, isOwner: r.id === householdAccess.ownerId, canSignIn: r.passwordId !== null })) };
  return json(payload);
 } catch (error) {
  if (error instanceof NotAuthenticatedError) return json({ error: "Not authenticated" }, 401);
  console.error("Household accounts failed:", error);
  return json({ error: "Could not load accounts" }, 500);
 }
}

export const handle = marqueeWriter.endpoint(handleRequest, "household-accounts_GET.ts", true);