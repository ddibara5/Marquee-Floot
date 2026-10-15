import {AsyncLocalStorage} from "node:async_hooks";
import {db as baseDb} from "./db";
const scope=new AsyncLocalStorage<{db:typeof baseDb;shadow:boolean}>();
export const ingestionDb:typeof baseDb=new Proxy(baseDb,{get(target,key){
 const executor=scope.getStore()?.db??target;
 const value=Reflect.get(executor,key);
 return typeof value==="function"?value.bind(executor):value;
}});
// Staged imports defer external discovery/artwork calls in both shadow and live transactions.
export const inShadowTransaction=()=>scope.getStore()?.shadow??false;
export async function runStagedTransaction<T>(work:()=>Promise<T>){
 return baseDb.transaction().execute(tx=>scope.run({db:tx as unknown as typeof baseDb,shadow:true},work));
}
export async function runShadowTransaction<T>(work:()=>Promise<T>){
 let result:T;
 class Rollback extends Error {}
 try{await baseDb.transaction().execute(async tx=>{
 result=await scope.run({db:tx as unknown as typeof baseDb,shadow:true},work);
 throw new Rollback();
 });}catch(e){if(!(e instanceof Rollback))throw e;}
 return result!;
}

export async function runIsolatedMigrationTransaction<T>(work:()=>Promise<T>){
 let result:T;class Rollback extends Error {}
 try{await baseDb.withSchema("candidate_marquee_20260930_v2").transaction().execute(async tx=>{
 result=await scope.run({db:tx as unknown as typeof baseDb,shadow:true},work);
 throw new Rollback();
 });}catch(e){if(!(e instanceof Rollback))throw e;}
 return result!;
}
