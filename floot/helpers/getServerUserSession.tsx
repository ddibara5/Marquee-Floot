import { db } from "./db";
import { User } from "./User";
import { householdAccess } from "./householdAccess";

import {
  CleanupProbability,
  getServerSessionOrThrow,
  NotAuthenticatedError,
  SessionExpirationSeconds,
} from "./getSetServerSession";

// Sliding sign-in (audit Batch 4, Oct 12, 2026): each signed-in use keeps the session for another full lifetime.
export const slidingExpiry=(now:Date)=>new Date(now.getTime()+SessionExpirationSeconds*1000);

export function createServerUserSession(database:typeof db=db, allowUser:(userId:number)=>Promise<boolean>=(async()=>true)) {
 return async function getServerUserSession(request: Request) {
  const session = await getServerSessionOrThrow(request);

  // Occasionally clean up expired sessions
  if (Math.random() < CleanupProbability) {
    const expirationDate = new Date(
      Date.now() - SessionExpirationSeconds * 1000
    );
    try {
      await database
        .deleteFrom("sessions")
        .where("expiresAt", "<=", new Date())
        .execute();
    } catch (cleanupError) {
      // Log but don't fail the request if cleanup fails
      console.error("Session cleanup error:", cleanupError);
    }
  }

  // Query the sessions and users tables in a single join query
  const results = await database
    .selectFrom("sessions")
    .innerJoin("users", "sessions.userId", "users.id")
    .select([
      "sessions.id as sessionId",
      "sessions.createdAt as sessionCreatedAt",
      "sessions.lastAccessed as sessionLastAccessed",
      "users.id",
      "users.email",
      "users.displayName",
      "users.role",
      "users.avatarUrl",
      "users.isBot",
    ])
    .where("sessions.id", "=", session.id)
    .where("sessions.expiresAt", ">", new Date())
    .limit(1)
    .execute();

  if (results.length === 0) {
    throw new NotAuthenticatedError();
  }

  const result = results[0];
  if(!await allowUser(result.id))throw new NotAuthenticatedError();
  // The automation account acts as the owner (October 22, 2026).
  const user = {
    id: result.isBot ? householdAccess.ownerId : result.id,
    email: result.email,
    displayName: result.displayName,
    avatarUrl: result.avatarUrl,
    role: result.role,
  };

  // Update the session's lastAccessed timestamp
  const now = new Date();
  await database
    .updateTable("sessions")
    .set({ lastAccessed: now, expiresAt: slidingExpiry(now) })
    .where("id", "=", session.id)
    .execute();

  return {
    user: user satisfies User,
    isBot: result.isBot,
    accountId: result.id,
    // make sure to update the session in cookie
    session: {
      ...session,
      lastAccessed: now,
    },
  };
}

}
export const getServerUserSession=createServerUserSession(); 