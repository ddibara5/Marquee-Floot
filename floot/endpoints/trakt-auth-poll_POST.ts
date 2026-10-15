import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { decryptSecret, encryptSecret } from "../helpers/secretCrypto";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import {
  pollTraktDeviceToken,
  traktTokenExpiry,
} from "../helpers/traktApi";
import type { OutputType } from "./trakt-auth-poll_POST.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const pending = await db
      .selectFrom("marqueeTraktDeviceAuth")
      .selectAll()
      .where("userId", "=", user.id)
      .executeTakeFirst();

    let payload: OutputType;

    if (!pending) {
      payload = { status: "not_started" };
    } else if (pending.expiresAt.getTime() <= Date.now()) {
      await db
        .deleteFrom("marqueeTraktDeviceAuth")
        .where("userId", "=", user.id)
        .execute();
      payload = { status: "expired" };
    } else {
      const result = await pollTraktDeviceToken(
        decryptSecret(pending.deviceCodeCipher)
      );

      if (result.status === "connected") {
        const token = result.token;
        if (!token.access_token || !token.refresh_token) {
          throw new Error("Trakt returned incomplete credentials");
        }

        const expiresAt = traktTokenExpiry(token);

        await db
          .insertInto("marqueeTraktOauth")
          .values({
            userId: user.id,
            accessTokenCipher: encryptSecret(token.access_token),
            refreshTokenCipher: encryptSecret(token.refresh_token),
            expiresAt,
            connectedAt: new Date(),
            updatedAt: new Date(),
          })
          .onConflict((oc) =>
            oc.column("userId").doUpdateSet({
              accessTokenCipher: encryptSecret(token.access_token),
              refreshTokenCipher: encryptSecret(token.refresh_token),
              expiresAt,
              connectedAt: new Date(),
              updatedAt: new Date(),
            })
          )
          .execute();

        await db
          .deleteFrom("marqueeTraktDeviceAuth")
          .where("userId", "=", user.id)
          .execute();

        await db
          .insertInto("marqueeTraktSyncState")
          .values({
            userId: user.id,
            consecutiveFailures: 0,
            updatedAt: new Date(),
          })
          .onConflict((oc) => oc.column("userId").doNothing())
          .execute();

        payload = { status: "connected" };
      } else {
        if (result.status === "expired" || result.status === "denied") {
          await db
            .deleteFrom("marqueeTraktDeviceAuth")
            .where("userId", "=", user.id)
            .execute();
        }
        payload = { status: result.status };
      }
    }

    const response = new Response(superjson.stringify(payload), {
      headers: { "Content-Type": "application/json" },
    });

    await setServerSession(response, {
      id: session.id,
      createdAt: session.createdAt,
      lastAccessed: session.lastAccessed.getTime(),
    });

    return response;
  } catch (error) {
    if (error instanceof NotAuthenticatedError) {
      return new Response(superjson.stringify({ error: "Not authenticated" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    console.error("Trakt auth poll error:", error);
    return new Response(
      superjson.stringify({
        error: error instanceof Error ? error.message : "Unable to confirm Trakt authorization",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "trakt-auth-poll_POST.ts", true);
