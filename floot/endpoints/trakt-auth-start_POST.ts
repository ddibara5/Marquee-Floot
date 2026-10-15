import {marqueeWriter} from "../helpers/marqueeWriter";
import superjson from "superjson";
import { db } from "../helpers/db";
import { encryptSecret } from "../helpers/secretCrypto";
import { getServerUserSession } from "../helpers/getServerUserSession";
import {
  NotAuthenticatedError,
  setServerSession,
} from "../helpers/getSetServerSession";
import { requestTraktDeviceCode } from "../helpers/traktApi";
import type { OutputType } from "./trakt-auth-start_POST.schema";

async function handleRequest(request: Request) {
  try {
    const { user, session } = await getServerUserSession(request);
    const challenge = await requestTraktDeviceCode();

    if (
      !challenge.device_code ||
      !challenge.user_code ||
      !challenge.verification_url ||
      !Number.isFinite(challenge.expires_in) ||
      !Number.isFinite(challenge.interval)
    ) {
      throw new Error("Trakt returned an invalid device challenge");
    }

    const expiresAt = new Date(Date.now() + challenge.expires_in * 1000);

    await db
      .insertInto("marqueeTraktDeviceAuth")
      .values({
        userId: user.id,
        deviceCodeCipher: encryptSecret(challenge.device_code),
        userCode: challenge.user_code,
        verificationUrl: challenge.verification_url,
        intervalSeconds: challenge.interval,
        expiresAt,
      })
      .onConflict((oc) =>
        oc.column("userId").doUpdateSet({
          deviceCodeCipher: encryptSecret(challenge.device_code),
          userCode: challenge.user_code,
          verificationUrl: challenge.verification_url,
          intervalSeconds: challenge.interval,
          expiresAt,
          createdAt: new Date(),
        })
      )
      .execute();

    const response = new Response(
      superjson.stringify({
        status: "awaiting",
        userCode: challenge.user_code,
        verificationUrl: challenge.verification_url,
        expiresAt,
        intervalSeconds: challenge.interval,
      } satisfies OutputType),
      { headers: { "Content-Type": "application/json" } }
    );

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

    console.error("Trakt auth start error:", error);
    return new Response(
      superjson.stringify({
        error: error instanceof Error ? error.message : "Unable to start Trakt authorization",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
}


export const handle = marqueeWriter.endpoint(handleRequest, "trakt-auth-start_POST.ts", true);
