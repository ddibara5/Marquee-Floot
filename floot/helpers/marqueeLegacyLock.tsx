import {claimImport,finishImport,failImport} from "./marqueeImportState";
import type {ImportSource} from "./marqueeImportPolicy";
export async function marqueeLegacyLock<T>(source:ImportSource,work:()=>Promise<T>){
 const runId=await claimImport(source,"shadow");
 try{const result=await work();await finishImport(runId,{legacyManual:true});return result;}
 catch(e){await failImport(runId,e);throw e;}
}
