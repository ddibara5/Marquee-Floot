import {slidingExpiry} from "./getServerUserSession";
import {SessionExpirationSeconds} from "./getSetServerSession";

describe("sliding sign-in",()=>{
 it("moves the expiry a full lifetime past the latest use",()=>{
  const now=new Date("2026-10-12T15:00:00Z");
  expect(slidingExpiry(now).getTime()-now.getTime()).toBe(SessionExpirationSeconds*1000);
 });
});
