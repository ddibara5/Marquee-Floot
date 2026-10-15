import {passwordRecoveryToken} from "./passwordRecoveryToken";
import {schema} from "../endpoints/auth/password_recovery_POST.schema";
import {decodeJwt} from "jose";
describe("password recovery",()=>{
  const signing="fixture-signing-key",hash="fixture-current-hash",owner=1,origin="https://example.test";
  const now=new Date("2026-10-02T12:00:00Z");
  const issue=()=>passwordRecoveryToken.issue(signing,hash,owner,origin,now);
  it("accepts an unexpired token for the correct account and app",async()=>{
    await passwordRecoveryToken.verify(await issue(),signing,hash,owner,origin,new Date(now.getTime()+14*60000));
  });
  it("expires at fifteen minutes",async()=>{
    await expectAsync(passwordRecoveryToken.verify(await issue(),signing,hash,owner,origin,new Date(now.getTime()+15*60000))).toBeRejected();
  });
  it("invalidates all outstanding links after the password hash changes",async()=>{
    await expectAsync(passwordRecoveryToken.verify(await issue(),signing,"fixture-rotated-hash",owner,origin,now)).toBeRejected();
  });
  it("rejects links for another account",async()=>{
    await expectAsync(passwordRecoveryToken.verify(await issue(),signing,hash,2,origin,now)).toBeRejected();
  });
  it("rejects links on another app",async()=>{
    await expectAsync(passwordRecoveryToken.verify(await issue(),signing,hash,owner,"https://other.test",now)).toBeRejected();
  });
  it("rejects tampered signatures and different signing keys",async()=>{
    const token=await issue(),parts=token.split(".");
    parts[2]=(parts[2][0]==="a"?"b":"a")+parts[2].slice(1);
    await expectAsync(passwordRecoveryToken.verify(parts.join("."),signing,hash,owner,origin,now)).toBeRejected();
    await expectAsync(passwordRecoveryToken.verify(token,"fixture-other-key",hash,owner,origin,now)).toBeRejected();
  });
  it("fails closed without a signing key",async()=>{
    await expectAsync(passwordRecoveryToken.issue("",hash,owner,origin,now)).toBeRejected();
  });
  it("does not place the password hash in token claims",async()=>{
    const claims=decodeJwt(await issue());
    expect(JSON.stringify(claims)).not.toContain(hash);
    expect(claims.sub).toBe("1");
  });
  it("requires the fields for the selected recovery action",()=>{
    expect(schema.safeParse({action:"request"}).success).toBe(false);
    expect(schema.safeParse({action:"request",email:"owner@example.test"}).success).toBe(true);
    expect(schema.safeParse({action:"reset",token:"fixture"}).success).toBe(false);
  });
  it("accepts simple passphrases and rejects short or bcrypt-truncated passwords",()=>{
    expect(schema.safeParse({action:"reset",token:"fixture",password:"a".repeat(6)}).success).toBe(true);
    expect(schema.safeParse({action:"reset",token:"fixture",password:"a".repeat(5)}).success).toBe(false);
    expect(schema.safeParse({action:"reset",token:"fixture",password:"a".repeat(73)}).success).toBe(false);
    expect(schema.safeParse({action:"reset",token:"fixture",password:"😊".repeat(19)}).success).toBe(false);
  });
});