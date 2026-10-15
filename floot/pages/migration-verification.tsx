import {useState} from "react";
import {Helmet} from "react-helmet";
import {Link} from "react-router-dom";
import superjson from "superjson";
import {Button} from "../components/Button";
import {useAuth} from "../helpers/useAuth";
import {MARQUEE_TRAKT_STORE,MARQUEE_BARRIER_ACTIVE,MARQUEE_ADMISSION_ACTIVE} from "../helpers/marqueeDatabaseMode";
import styles from "./migration-verification.module.css";
// Unlinked operator page. Every check uses the app's normal API and browser session.
// No cookie, token, user email or provider credential is read or displayed.
export default function MigrationVerification(){
 const {authState}=useAuth();const [busy,setBusy]=useState(false);const [evidence,setEvidence]=useState<unknown>(null);
 const [undoPending,setUndoPending]=useState(false);
 if(authState.type!=="authenticated"||authState.user.id!==1)return <p role="alert">Owner access required.</p>;
 async function request(path:string,credentials:RequestCredentials="include",body?:unknown){
  const r=await fetch(path,{method:body?"POST":"GET",credentials,cache:"no-store",
   ...(body?{headers:{"Content-Type":"application/json"},body:superjson.stringify(body)}:{})});
  const data:any=superjson.parse(await r.text());
  return {status:r.status,data};
 }
 async function run(action:"read"|"set"|"undo"){
  setBusy(true);
  try{
   const session=await request("/_api/auth/session");
   if(session.status!==200||session.data.user?.id!==1)throw Error("Owner session unavailable");
   const checks:any={ownerSession:{status:session.status,id:session.data.user.id}};
   if(action==="read"){
    const history=await request("/_api/watch-history"),anonymousRead=await request("/_api/watch-history","omit"),
     anonymousWrite=await request("/_api/tracking","omit",{action:"status",titleId:1,status:"paused"});
    checks.history={status:history.status,eventCount:history.data.events?.length??null,
     recent:history.data.events?.slice(0,2).map((e:any)=>({eventId:e.eventId,titleId:e.titleId,episode:e.episodeTitle,watchedAt:e.watchedAt}))};
    checks.anonymousRead={status:anonymousRead.status};checks.anonymousWrite={status:anonymousWrite.status};
   }else{
    const write=await request("/_api/tracking","include",{action:"status",titleId:1,status:action==="set"?"paused":null});
    checks[action]={status:write.status,saved:write.data.saved===true,titleId:1};
    if(write.status===200&&write.data.saved===true)setUndoPending(action==="set");
   }
   setEvidence({at:new Date().toISOString(),origin:location.origin,
    build:{traktStore:MARQUEE_TRAKT_STORE,physicalBarrier:MARQUEE_BARRIER_ACTIVE,admission:MARQUEE_ADMISSION_ACTIVE},
    action,checks});
  }catch(e){setEvidence({at:new Date().toISOString(),error:(e as Error).message});}
  finally{setBusy(false);}
 }
 return <><Helmet><title>Verification · Marquee</title></Helmet><section className={styles.panel}>
  <p>Migration release verification</p><p className={styles.note}>Check signed-in reads and access protection. The controlled edit changes only a temporary local Paused choice for title 1; undo removes that choice.</p>
  <div className={styles.actions}><Button disabled={busy} onClick={()=>void run("read")}>Check access</Button>
   <Button disabled={busy||undoPending} onClick={()=>void run("set")}>Set temporary Paused</Button>
   <Button disabled={busy||!undoPending} onClick={()=>void run("undo")}>Undo temporary Paused</Button></div>
  <pre data-testid="migration-evidence" aria-live="polite">{evidence?JSON.stringify(evidence,null,2):"Ready"}</pre>
  <Link to="/">Return Home</Link></section></>;
}
