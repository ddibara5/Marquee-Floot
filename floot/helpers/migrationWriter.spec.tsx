import { createMigrationWriter } from "./migrationWriter";
import { Kysely, sql as query, type Dialect } from "kysely";
import { PostgresJSDialect } from "kysely-postgres-js";

function fixture() {
  let paused = false;
  const calls: string[] = [], leases = new Set<string>();
  const connection = { executeQuery: async (q: any) => {
    if (q.sql.includes(".admit")) { calls.push("admit"); if (paused) throw Error("MIGRATION_WRITER_PAUSED"); }
    else calls.push(q.sql);
    return { rows: [{ value: 1 }] };
  }, streamQuery: () => { throw Error("unexpected stream"); } };
  const client: any = () => Promise.resolve([]);
  client.unsafe = async (text: string, params: any[]) => {
    if (text.includes("acquire_lease")) { if (paused) throw Error("MIGRATION_WRITER_PAUSED"); leases.add(params[0]); calls.push("acquire"); }
    if (text.includes("release_lease")) { leases.delete(params[0]); calls.push("release"); }
    return [];
  };
  client.begin = async (fn: any) => fn({unsafe:async()=>[],json:(x:any)=>x});
  const base = new PostgresJSDialect({postgres:client});
  const driver = {
    init: async()=>{}, destroy:async()=>{}, acquireConnection:async()=>connection,
    releaseConnection:async()=>{}, beginTransaction:async()=>{calls.push("begin");},
    commitTransaction:async()=>{calls.push("commit");}, rollbackTransaction:async()=>{calls.push("rollback");},
  };
  const dialect: Dialect = {createDriver:()=>driver as any,createAdapter:()=>base.createAdapter(),createIntrospector:db=>base.createIntrospector(db),createQueryCompiler:()=>base.createQueryCompiler()};
  const writer = createMigrationWriter({active:()=>true,barrier:"fixture_barrier",sql:()=>client});
  return {writer,calls,leases,pause:()=>{paused=true;},db:new Kysely<any>({dialect:writer.dialect(dialect)})};
}
describe("runtime writer protection",()=>{
 it("holds a durable lease across asynchronous side effects and always releases it",async()=>{
   const f=fixture();let seen="";
   await expectAsync(f.writer.work("provider",async()=>{seen=f.writer.currentLease()!;expect(f.leases.has(seen)).toBeTrue();await Promise.resolve();expect(f.writer.currentLease()).toBe(seen);throw Error("NETWORK_UNCERTAIN");})).toBeRejectedWithError("NETWORK_UNCERTAIN");
   expect(f.leases.size).toBe(0);expect(f.calls).toEqual(["acquire","release"]);
 });
 it("does not enter an API handler or send an effect when paused",async()=>{
   const f=fixture();f.pause();let sent=0;
   const handler=f.writer.endpoint(async()=>{sent++;return Response.json({ok:true});},"push");
   const response=await handler(new Request("https://example.test"));
   expect(response.status).toBe(503);expect(response.headers.get("Retry-After")).toBe("60");expect(sent).toBe(0);
 });
 it("does not release an import lease between queued phases",async()=>{
   const f=fixture();await f.writer.work("chunk",async()=>{expect(f.writer.currentLease()).toBe("existing-import");},"existing-import");
   expect(f.calls).toEqual([]);
 });
 it("keeps concurrent request identities separate",async()=>{
   const f=fixture();let unblock!:()=>void;const hold=new Promise<void>(r=>unblock=r);let a="",b="";
   const one=f.writer.work("one",async()=>{a=f.writer.currentLease()!;await hold;expect(f.writer.currentLease()).toBe(a);});
   await f.writer.work("two",async()=>{b=f.writer.currentLease()!;unblock();});await one;
   expect(a).not.toBe(b);expect(f.leases.size).toBe(0);
 });
 it("admits standalone statements inside their commit boundary",async()=>{
   const f=fixture();await query`update fixture set value=1`.execute(f.db);
   expect(f.calls[0]).toBe("begin");expect(f.calls[1]).toBe("admit");expect(f.calls.at(-1)).toBe("commit");await f.db.destroy();
 });
 it("admits an explicit multi-statement transaction once",async()=>{
   const f=fixture();await f.db.transaction().execute(async tx=>{await query`update fixture set value=1`.execute(tx);await query`delete from fixture`.execute(tx);});
   expect(f.calls.filter(x=>x==="begin").length).toBe(1);expect(f.calls.filter(x=>x==="admit").length).toBe(1);expect(f.calls.at(-1)).toBe("commit");await f.db.destroy();
 });
 it("rolls back a denied statement before any data mutation",async()=>{
   const f=fixture();f.pause();await expectAsync(query`update fixture set value=1`.execute(f.db)).toBeRejectedWithError("MIGRATION_WRITER_PAUSED");
   expect(f.calls).toEqual(["begin","admit","rollback"]);await f.db.destroy();
 });
 it("preserves encoded endpoint contracts for paused native clients",async()=>{
   const f=fixture();f.pause();
   const response=await f.writer.endpoint(async()=>Response.json({ok:true}),"auth",true)(new Request("https://example.test"));
   expect(response.status).toBe(503);expect((await response.json()).json.error).toContain("paused");
 });
 it("leaves inactive legacy work unchanged without accessing native credentials",async()=>{
   const writer=createMigrationWriter({active:()=>false,barrier:"fixture_barrier",sql:()=>{throw Error("UNEXPECTED_NATIVE_ACCESS");}});
   expect(await writer.work("legacy",async()=>42)).toBe(42);
 });
 it("reuses one durable lease for nested app work",async()=>{
   const f=fixture();let outer="";
   await f.writer.work("outer",async()=>{outer=f.writer.currentLease()!;await f.writer.work("inner",async()=>expect(f.writer.currentLease()).toBe(outer));});
   expect(f.calls).toEqual(["acquire","release"]);expect(f.leases.size).toBe(0);
 });
});