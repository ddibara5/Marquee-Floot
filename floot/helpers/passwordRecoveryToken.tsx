import { createHmac } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";

const issuer = "family-password-recovery";
const key = (secret: string, passwordHash: string) => {
  if (!secret) throw new Error("Recovery signing is unavailable");
  return createHmac("sha256", secret).update(issuer + ":" + passwordHash).digest();
};

export const passwordRecoveryToken = {
  async issue(secret: string, passwordHash: string, userId: number, origin: string, now = new Date()) {
    const seconds = Math.floor(now.getTime() / 1000);
    return new SignJWT({ purpose: issuer })
      .setProtectedHeader({ alg: "HS256" }).setIssuer(issuer).setAudience(origin)
      .setSubject(String(userId)).setIssuedAt(seconds).setExpirationTime(seconds + 15 * 60)
      .sign(key(secret, passwordHash));
  },
  async verify(token: string, secret: string, passwordHash: string, userId: number, origin: string, now = new Date()) {
    const { payload } = await jwtVerify(token, key(secret, passwordHash), {
      algorithms: ["HS256"], issuer, audience: origin, currentDate: now,
    });
    if (payload.sub !== String(userId) || payload.purpose !== issuer) throw new Error("Invalid recovery link");
  },
};