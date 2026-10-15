import type {Kysely} from "kysely";
import type {DB} from "./schema";
import {decryptSecret,encryptSecret} from "./secretCrypto";
import {refreshTraktToken,traktTokenExpiry} from "./traktApi";
const REFRESH_MARGIN_MS=24*60*60*1000;
export function createTraktTokenProvider(database:Kysely<DB>,refresh:typeof refreshTraktToken=refreshTraktToken) {
 return async (userId:number) => {
  const oauth = await database
    .selectFrom("marqueeTraktOauth")
    .selectAll()
    .where("userId", "=", userId)
    .executeTakeFirst();

  if (!oauth) throw new Error("TRAKT_NOT_CONNECTED");

  if (oauth.expiresAt.getTime() > Date.now() + REFRESH_MARGIN_MS) return decryptSecret(oauth.accessTokenCipher);
  return database.transaction().execute(async trx => {
  const locked = await trx.selectFrom("marqueeTraktOauth").selectAll().where("userId","=",userId).forUpdate().executeTakeFirstOrThrow();
  if (locked.expiresAt.getTime() > Date.now()+REFRESH_MARGIN_MS) return decryptSecret(locked.accessTokenCipher);
  let accessToken = decryptSecret(locked.accessTokenCipher);

  if (locked.expiresAt.getTime() <= Date.now() + REFRESH_MARGIN_MS) {
    const refreshed = await refresh(
      decryptSecret(locked.refreshTokenCipher)
    );

    if (!refreshed.access_token || !refreshed.refresh_token) {
      throw new Error("TRAKT_CREDENTIAL_RECONNECT_REQUIRED");
    }

    accessToken = refreshed.access_token;
    await trx
      .updateTable("marqueeTraktOauth")
      .set({
        accessTokenCipher: encryptSecret(refreshed.access_token),
        refreshTokenCipher: encryptSecret(refreshed.refresh_token),
        expiresAt: traktTokenExpiry(refreshed),
        updatedAt: new Date(),
      })
      .where("userId", "=", userId)
      .execute();
  }

  return accessToken;
  });

 };
}