import postgres from "postgres";
import {migrationRemoteRecoveryExercise} from "../helpers/migrationRemoteRecoveryExercise";
// Fixed private targets, server-only connected credential; request supplies only a one-use capability.
export const handle=async(request:Request)=>{
 const value=process.env.POSTGRESQL_DATABASE_CONNECTION_STRING;if(!value)throw Error("LEGACY_DATABASE_MISSING");
 const url=new URL(value);if(!url.hostname.includes("eiskobjlvxzwvucgpenk")&&!decodeURIComponent(url.username).includes("eiskobjlvxzwvucgpenk"))throw Error("SOURCE_PROJECT_MISMATCH");
 const remote=postgres(value,{prepare:false,ssl:"require",max:4,connect_timeout:10,idle_timeout:10,connection:{application_name:"marquee-private-cross-resource"}});
 try{return await migrationRemoteRecoveryExercise(request,{remote,schema:"prep_marquee_cross_resource_20261001",barrier:"barrier_marquee_cross_resource_20261001"});}finally{await remote.end();}
};
