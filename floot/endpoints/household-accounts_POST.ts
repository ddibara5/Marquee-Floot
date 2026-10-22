import superjson from "superjson";
import { sql } from "kysely";
import { marqueeWriter } from "../helpers/marqueeWriter";
import { db } from "../helpers/db";
import { getServerUserSession } from "../helpers/getServerUserSession";
import { NotAuthenticatedError } from "../helpers/getSetServerSession";
import { generatePasswordHash } from "../helpers/generatePasswordHash";
import { householdAccess } from "../helpers/householdAccess";
import { schema } from "./household-accounts_POST.schema";

const json = (body: unknown, status = 200) => new Response(superjson.stringify(body), { status, headers: { "Content-Type": "application/json" } });

async function handleRequest(request: Request) {
 try {
  const { isBot, accountId } = await getServerUserSession(request);
  if (isBot || accountId !== householdAccess.ownerId) return json({ error: "Only the owner can manage accounts." }, 403);
  const parsed = schema.safeParse(superjson.parse(await request.text()));
  if (!parsed.success) return json({ error: "Check the email, name and a password of at least 8 characters." }, 400);
  const input = parsed.data;
  if (input.action === "create") {
   const passwordHash = await generatePasswordHash(input.password), email = input.email.trim().toLowerCase();
   const refused = await db.transaction().execute(async trx => {
    await sql`select pg_advisory_xact_lock(hashtextextended('household-accounts',0))`.execute(trx);
    const rows = await trx.selectFrom("users").select(["isBot", trx.fn.countAll<number>().as("count")]).groupBy("isBot").execute();
    const limit = householdAccess.limit(input.bot ? "bot" : "member", { members: Number(rows.find(r => !r.isBot)?.count ?? 0), bots: Number(rows.find(r => r.isBot)?.count ?? 0) });
    if (limit) return limit;
    if (await trx.selectFrom("users").select("id").where(sql`lower(users.email)`, "=", email).executeTakeFirst()) return "That email already has an account.";
    const user = await trx.insertInto("users").values({ email, displayName: input.displayName, role: "user", isBot: input.bot }).returning("id").executeTakeFirstOrThrow();
    await trx.insertInto("userPasswords").values({ userId: user.id, passwordHash }).execute();
    return null;
   });
   return refused ? json({ error: refused }, 409) : json({ ok: true });
  }
  if (input.userId === householdAccess.ownerId) return json({ error: "The owner account can't be changed here." }, 400);
  const target = await db.selectFrom("users").select("id").where("id", "=", input.userId).executeTakeFirst();
  if (!target) return json({ error: "Account not found." }, 404);
  await db.transaction().execute(async trx => {
   // Revoking signs the account out everywhere and removes its password; its data stays. Set a password to restore.
   await trx.deleteFrom("sessions").where("userId", "=", input.userId).execute();
   await trx.deleteFrom("userPasswords").where("userId", "=", input.userId).execute();
   if (input.action === "setPassword") await trx.insertInto("userPasswords").values({ userId: input.userId, passwordHash: await generatePasswordHash(input.password) }).execute();
  });
  return json({ ok: true });
 } catch (error) {
  if (error instanceof NotAuthenticatedError) return json({ error: "Not authenticated" }, 401);
  console.error("Household accounts update failed:", error);
  return json({ error: "Could not update accounts" }, 500);
 }
}

export const handle = marqueeWriter.endpoint(handleRequest, "household-accounts_POST.ts", true);