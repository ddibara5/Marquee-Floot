import {decodeJwt} from "jose";
import {setServerSession,clearServerSession,SessionExpirationSeconds} from "./getSetServerSession";
describe("session lifetime",()=>{
 it("aligns the signed token and cookie with the existing seven-day policy",async()=>{
  const response=new Response();
  await setServerSession(response,{id:"fixture-not-a-real-session",createdAt:0,lastAccessed:0},"fixture-signing-key-for-session-test");
  const cookie=response.headers.get("Set-Cookie")!;
  const token=cookie.split(";")[0].split("=")[1];
  const claims=decodeJwt(token);
  expect(claims.exp! - claims.iat!).toBe(SessionExpirationSeconds);
  expect(cookie).toContain("Max-Age="+SessionExpirationSeconds);
  expect(cookie).toContain("HttpOnly");expect(cookie).toContain("Secure");expect(cookie).toContain("SameSite=Lax");
  expect(cookie.toLowerCase()).not.toContain("domain=");
 });
 it("clears the host-only session cookie on the same path",()=>{
  const response=new Response();clearServerSession(response);
  const cookie=response.headers.get("Set-Cookie")!;
  expect(cookie).toContain("Max-Age=0");expect(cookie).toContain("Path=/");
  expect(cookie).toContain("HttpOnly");expect(cookie.toLowerCase()).not.toContain("domain=");
 });
});