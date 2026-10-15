import {marqueeWriter} from "./marqueeWriter";
import postgres from "postgres";
let local: ReturnType<typeof postgres> | undefined, remote: ReturnType<typeof postgres> | undefined;
export function importSql(){
 if(!process.env.FLOOT_DATABASE_URL) throw Error("DATABASE_MISSING");
 return marqueeWriter.sql(local ??= postgres(process.env.FLOOT_DATABASE_URL,{prepare:false,max:3,idle_timeout:10}));
}
export function supabaseSql(){
 const value=process.env.POSTGRESQL_DATABASE_CONNECTION_STRING;
 if(!value) throw Error("SUPABASE_MISSING");
 const url=new URL(value);
 if(!decodeURIComponent(url.username).includes("eiskobjlvxzwvucgpenk") && !url.hostname.includes("eiskobjlvxzwvucgpenk")) throw Error("SUPABASE_PROJECT_MISMATCH");
 return remote ??= postgres(value,{prepare:false,ssl:"require",max:2,idle_timeout:10});
}


