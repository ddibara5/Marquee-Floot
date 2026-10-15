import {createMigrationWriter} from "./migrationWriter";
describe("maintenance admission before physical binding",()=>{
 function fixture(){
  let draining=false,providers=true; const calls:string[]=[],leases=new Set<string>();
  const client:any={unsafe:async(q:string,p:any[])=>{
   calls.push(q);
   if(q.includes("acquire_lease")){if(draining)throw Error("MIGRATION_WRITER_PAUSED");leases.add(p[0]);}
   if(q.includes("release_lease"))leases.delete(p[0]);
   return [];
  }};
  client.begin=async(fn:any)=>fn({unsafe:async(q:string)=>{calls.push(q);if(!q.startsWith("select ")&&!q.startsWith("update "))throw Error("INVALID_ADMISSION_SQL");if(q.includes("admit_bound"))throw Error("BINDINGS_NOT_INSTALLED");return []; }});
  const writer=createMigrationWriter({active:()=>false,admissionActive:()=>true,barrier:"fixture_admission",sql:()=>client,
   beforeWork:async(kind,terminal,lease)=>{if(!terminal&&kind.startsWith("provider:")&&!providers&&!(draining&&lease&&leases.has(lease)))throw Error("MIGRATION_PROVIDER_PAUSED");}});
  return {writer,calls,leases,drain:()=>{draining=true;},holdProviders:()=>{providers=false;}};
 }
 it("admits without requesting uninstalled physical bindings",async()=>{
  const f=fixture();expect(await f.writer.work("request",async()=>42)).toBe(42);
  expect(f.calls.some(q=>q.includes(".admit("))).toBeTrue();expect(f.calls.some(q=>q.includes("admit_bound"))).toBeFalse();expect(f.leases.size).toBe(0);
 });
 it("rejects new requests before entering a handler during drain",async()=>{
  const f=fixture();f.drain();let entered=false;
  const r=await f.writer.endpoint(async()=>{entered=true;return Response.json({ok:true});},"manual",true)(new Request("https://example.test"));
  expect(r.status).toBe(503);expect(entered).toBeFalse();expect(f.leases.size).toBe(0);
 });
 it("holds durable request identity across nested provider work",async()=>{
  const f=fixture();await f.writer.work("manual",async()=>{const id=f.writer.currentLease();await f.writer.work("provider:send",async()=>expect(f.writer.currentLease()).toBe(id));});
  expect(f.calls.filter(q=>q.includes("acquire_lease")).length).toBe(1);expect(f.leases.size).toBe(0);
 });
 it("passes the existing lease to drain an already admitted provider request",async()=>{
  const f=fixture();let finished=false;
  await f.writer.work("request",async()=>{f.drain();f.holdProviders();await f.writer.work("provider:finish",async()=>{finished=true;});});
  expect(finished).toBeTrue();expect(f.calls.filter(q=>q.includes("acquire_lease")).length).toBe(1);expect(f.leases.size).toBe(0);
 });
 it("keeps providers held when native owner acceptance is open",async()=>{
  const f=fixture();f.holdProviders();let sent=false;
  await f.writer.work("owner",async()=>{await expectAsync(f.writer.work("provider:send",async()=>{sent=true;})).toBeRejectedWithError("MIGRATION_PROVIDER_PAUSED");});
  expect(sent).toBeFalse();expect(f.leases.size).toBe(0);
 });
 it("does not release an admitted import lease between queued phases",async()=>{
  const f=fixture();await f.writer.work("import:page",async()=>{},"queued-import");
  expect(f.calls.some(q=>q.includes("acquire_lease"))).toBeFalse();expect(f.calls.some(q=>q.includes("release_lease"))).toBeFalse();
 });
 it("permits terminal acknowledgement after provider admission is held",async()=>{
  const f=fixture();f.holdProviders();expect(await f.writer.work("provider:terminal",async()=>true,"queued-import",true)).toBeTrue();
 });
});
