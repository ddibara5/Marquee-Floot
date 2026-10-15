import { AsyncLocalStorage } from "node:async_hooks";
import { randomUUID } from "node:crypto";
import { CompiledQuery, type DatabaseConnection, type Dialect, type Driver } from "kysely";
import superjson from "superjson";
import type postgres from "postgres";

type Sql = ReturnType<typeof postgres>;
type Context = { lease: string; terminal?: boolean; barrier: string };
const scope = new AsyncLocalStorage<Context>();
// Each app owns an independent instance. No shared runtime, in-memory pause flag, or secrets.
export function createMigrationWriter(config: { active: () => boolean; admissionActive?: () => boolean; beforeWork?: (kind: string, terminal: boolean, lease?: string) => Promise<void>; barrier: string; sql: () => Sql; bindings?: Readonly<Record<string,string>> }) {
  if (!/^[a-z][a-z0-9_]*$/.test(config.barrier)) throw Error("INVALID_BARRIER");
  const B = config.barrier;
  const admissionQuery = () => CompiledQuery.raw(
    "select " + B + (config.bindings ? ".admit_bound($1::uuid,$2::boolean,$3::jsonb)" : ".admit($1::uuid,$2::boolean)"),
    [(scope.getStore()?.barrier === B ? scope.getStore()?.lease : null) ?? null, scope.getStore()?.terminal ?? false, ...(config.bindings ? [config.bindings] : [])]);
  const admitSql = async (tx: postgres.TransactionSql) => {
    if (!config.active()) return;
    const q = admissionQuery();
    await tx.unsafe(q.sql, [...q.parameters] as any[]);
  };
  async function work<T>(kind: string, fn: () => Promise<T>, lease?: string, terminal = false): Promise<T> {
    if (!config.active() && !config.admissionActive?.()) return fn();
    await config.beforeWork?.(kind, terminal, lease ?? scope.getStore()?.lease);
    if (scope.getStore()?.barrier === B) return terminal ? scope.run({...scope.getStore()!,terminal:true},fn) : fn();
    const id = lease ?? randomUUID(), client = config.sql();
    if (!lease) await client.unsafe("select " + B + ".acquire_lease($1::uuid,$2::text)", [id, kind]);
    try {
      return await scope.run({ lease: id, terminal, barrier: B }, async () => {
        await client.begin(async tx => {
          if (config.active()) await admitSql(tx);
          else await tx.unsafe("select " + B + ".admit($1::uuid,$2::boolean)", [id, terminal]);
          if (!terminal) await tx.unsafe("update " + B + ".writer_leases set expires_at=clock_timestamp()+interval '9 minutes' where id=$1::uuid and exists(select 1 from " + B + ".control where id and mode='open')", [id]);
        });
        return fn();
      });
    } finally {
      // Existing import leases survive queued chunks and are released only by terminal callbacks.
      // An interrupted process leaves its durable lease unresolved; drain must fail closed.
      if (!lease) await client.unsafe("select " + B + ".release_lease($1::uuid)", [id]);
    }
  }
  function dialect(base: Dialect): Dialect {
    if (!config.active()) return base;
    return { createAdapter: () => base.createAdapter(), createIntrospector: db => base.createIntrospector(db),
      createQueryCompiler: () => base.createQueryCompiler(), createDriver: () => {
        const driver = base.createDriver();
        const raw = new WeakMap<DatabaseConnection, DatabaseConnection>();
        const transactional = new WeakSet<DatabaseConnection>();
        const unwrap = (c: DatabaseConnection) => raw.get(c) ?? c;
        const guarded: Driver = {
          init: () => driver.init(), destroy: () => driver.destroy(),
          acquireConnection: async () => {
            const c = await driver.acquireConnection();
            const proxy: DatabaseConnection = {
              executeQuery: async <R,>(query: CompiledQuery) => {
                if (transactional.has(c)) return c.executeQuery<R>(query);
                await driver.beginTransaction(c, {});
                try {
                  await c.executeQuery(admissionQuery());
                  const result = await c.executeQuery<R>(query);
                  await driver.commitTransaction(c);
                  return result;
                } catch (e) { await driver.rollbackTransaction(c); throw e; }
              },
              streamQuery: () => { throw Error("MIGRATION_STREAM_REVIEW_REQUIRED"); },
            };
            raw.set(proxy, c); return proxy;
          },
          releaseConnection: c => driver.releaseConnection(unwrap(c)),
          beginTransaction: async (c, settings) => {
            const u = unwrap(c); await driver.beginTransaction(u, settings);
            try { await u.executeQuery(admissionQuery()); transactional.add(u); }
            catch (e) { await driver.rollbackTransaction(u); throw e; }
          },
          commitTransaction: async c => { const u = unwrap(c); try { await driver.commitTransaction(u); } finally { transactional.delete(u); } },
          rollbackTransaction: async c => { const u = unwrap(c); try { await driver.rollbackTransaction(u); } finally { transactional.delete(u); } },
        };
        return guarded;
      } };
  }
  function sql(client: Sql): Sql {
    if (!config.active()) return client;
    return new Proxy(client, {
      apply: (_target, _this, args) => client.begin(async tx => { await admitSql(tx); return (tx as any)(...args); }),
      get: (target, key) => {
        if (key === "begin") return (...args: any[]) => {
          const fn = args.at(-1), options = args.length > 1 ? args[0] : undefined;
          const run = async (tx: postgres.TransactionSql) => { await admitSql(tx); return fn(tx); };
          return options === undefined ? client.begin(run) : client.begin(options, run);
        };
        if (key === "unsafe") return (...args: any[]) => client.begin(async tx => { await admitSql(tx); return (tx.unsafe as any)(...args); });
        const value = Reflect.get(target, key);
        return typeof value === "function" ? value.bind(target) : value;
      },
    });
  }
  function endpoint(handler: (request: Request) => Promise<Response>, kind: string, encoded = false) {
    return async (request: Request): Promise<Response> => {
      try { return await work("endpoint:" + kind, () => handler(request)); }
      catch (e) {
        const message = (e as Error).message;
        if (isMigrationWriterError(e)) return new Response(encoded ? superjson.stringify({error:"Writes are briefly paused for database maintenance"}) : JSON.stringify({error:"Writes are briefly paused for database maintenance"}), {status:503,headers:{"Content-Type":"application/json","Retry-After":"60"}});
        throw e;
      }
    };
  }
  return { work, dialect, sql, endpoint, admitSql, currentLease: () => scope.getStore()?.lease };
}

export function isMigrationWriterError(error:unknown):boolean {
 const e=error as {code?:string;message?:string}|null;
 return e?.code==="55000" || /^(MIGRATION_|LEASE_)/.test(e?.message??"");
}