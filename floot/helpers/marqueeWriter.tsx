import {runtimeBindings} from "./migrationRuntimeBindings";
import postgres from "postgres";
import { createMigrationWriter } from "./migrationWriter";
import { MARQUEE_BARRIER_ACTIVE, MARQUEE_BARRIER_SCHEMA, MARQUEE_ADMISSION_ACTIVE } from "./marqueeDatabaseMode";
let client: ReturnType<typeof postgres> | undefined;
const sql = () => { if (!process.env.FLOOT_DATABASE_URL) throw Error("NATIVE_DATABASE_MISSING"); return client ??= postgres(process.env.FLOOT_DATABASE_URL, {prepare:false,max:2,connect_timeout:10,idle_timeout:10}); };
const providerEndpoint = /^(ingestion_POST|trakt-(auth-start|auth-poll|sync)_POST|crunchyroll-(sync|ingest)_POST|tmdb-(anime|enrich|refresh)_POST)\.ts$/;
async function beforeWork(kind:string,terminal:boolean,lease?:string) {
 if(terminal || !(/^(provider:|import:|task:)/.test(kind) || (kind.startsWith("endpoint:") && providerEndpoint.test(kind.slice(9))))) return;
 const [control]=await sql().unsafe("select p.admission_open, (c.mode='draining' and exists(select 1 from "+MARQUEE_BARRIER_SCHEMA+".writer_leases l where l.id=$1::uuid and l.released_at is null and l.epoch=c.epoch-1 and l.expires_at>clock_timestamp())) admitted_drain from "+MARQUEE_BARRIER_SCHEMA+".provider_admission p cross join "+MARQUEE_BARRIER_SCHEMA+".control c where p.id and c.id", [lease??null]);
 if(control?.admission_open!==true && control?.admitted_drain!==true) throw Error("MIGRATION_PROVIDER_PAUSED");
}
export const marqueeWriter = createMigrationWriter({active:()=>MARQUEE_BARRIER_ACTIVE,admissionActive:()=>MARQUEE_ADMISSION_ACTIVE,beforeWork,barrier:MARQUEE_BARRIER_SCHEMA,sql,bindings:runtimeBindings});