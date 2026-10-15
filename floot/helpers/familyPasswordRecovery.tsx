import { db } from "./db";
import { sql } from "kysely";
import { sendEmail } from "@floot/email";
import { recoveryEmailConfig } from "./recoveryEmailConfig";
import { generatePasswordHash } from "./generatePasswordHash";
import { passwordRecoveryToken } from "./passwordRecoveryToken";

const origin = "https://marquee-ddibara.floot.app";
const ownerId = 1;
const auditKey = "@recovery:owner";
const neutralMessage = "If this is the owner email, a recovery link will arrive shortly.";
const secret = () => process.env.JWT_SECRET || "";

async function owner() {
  const rows = await db.selectFrom("users")
    .innerJoin("userPasswords", "users.id", "userPasswords.userId")
    .select(["users.id", "users.email", "userPasswords.id as passwordId", "userPasswords.passwordHash"])
    .where("users.id", "=", ownerId).limit(2).execute();
  if (rows.length !== 1) throw new Error("Owner recovery is unavailable");
  return rows[0];
}

export const familyPasswordRecovery = {
  sameOrigin(request: Request) {
    if (request.headers.get("origin") !== new URL(request.url).origin) throw new Error("Origin denied");
  },
  async request(email: string) {
    // A separate audit key keeps recovery throttling separate from normal password login.
    const admitted = await db.transaction().execute(async trx => {
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${auditKey},0))`.execute(trx);
      const count = await trx.selectFrom("loginAttempts").select(trx.fn.countAll<number>().as("total"))
        .where("email","=",auditKey).where("attemptedAt",">=",new Date(Date.now()-15*60*1000)).executeTakeFirstOrThrow();
      if (Number(count.total) >= 5) return false;
      await trx.insertInto("loginAttempts").values({email:auditKey,attemptedAt:new Date(),success:false}).execute();
      return true;
    });
    if (!admitted) throw new Error("Recovery request limit reached");
    const account = await owner();
    if (email.trim().toLowerCase() !== account.email.toLowerCase()) return neutralMessage;
    const sender = recoveryEmailConfig.from;
    if (!sender) {
      console.error("Recovery email delivery failed", "RecoverySenderNotConfigured");
      throw new Error("Recovery email is unavailable");
    }
    const token = await passwordRecoveryToken.issue(secret(),account.passwordHash,account.id,origin);
    const sent = await sendEmail({
      // Floot shared-domain fallback is intentionally limited to this app owner.
      from:sender,
      to:account.email, subject:"Reset your Marquee password",
      text:"Reset your Marquee password using this link within 15 minutes:\n\n"+origin+"/reset-password#token="+encodeURIComponent(token)+"\n\nThis changes Marquee only and signs out existing Marquee sessions. If you did not request this, ignore the email.",
    });
    if (!sent.ok) {
      console.error("Recovery email delivery failed",sent.error.code);
      throw new Error("Recovery email is unavailable");
    }
    console.info("Recovery email accepted", sent.messageId);
    return neutralMessage;
  },
  async reset(token: string, password: string) {
    const account = await owner();
    await passwordRecoveryToken.verify(token,secret(),account.passwordHash,account.id,origin);
    const nextHash = await generatePasswordHash(password);
    await db.transaction().execute(async trx => {
      // Match login's lock so a concurrent login cannot escape session revocation.
      await sql`SELECT pg_advisory_xact_lock(hashtextextended(${account.email.toLowerCase()},0))`.execute(trx);
      const changed = await trx.updateTable("userPasswords").set({passwordHash:nextHash})
        .where("id","=",account.passwordId).where("passwordHash","=",account.passwordHash)
        .returning("id").execute();
      if (changed.length !== 1) throw new Error("Recovery link was already used");
      await trx.deleteFrom("sessions").where("userId","=",account.id).execute();
      await trx.deleteFrom("loginAttempts").where("email","=",account.email.toLowerCase()).where("success","=",false).execute();
    });
  },
};