import {Link} from "react-router-dom";
import {nextScheduled,sourceState} from "../helpers/syncPresentation";
import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ExternalLink, RefreshCw } from "lucide-react";
import { Button } from "../components/Button";
import { getCrunchyrollStatus } from "../endpoints/crunchyroll-status_GET.schema";
import { pollTraktAuth } from "../endpoints/trakt-auth-poll_POST.schema";
import { startTraktAuth } from "../endpoints/trakt-auth-start_POST.schema";
import { syncTrakt } from "../endpoints/trakt-sync_POST.schema";
import { useTraktStatus } from "../helpers/useTraktStatus";
import styles from "./sync.module.css";
import { getIngestionHealth } from "../endpoints/ingestion_GET.schema";
import { runIngestion } from "../endpoints/ingestion_POST.schema";

const formatTime = (value: Date | string | null | undefined) =>
  value ? new Date(value).toLocaleString(undefined, { month:"short", day:"numeric", hour:"numeric", minute:"2-digit" }) : "Never";

export default function SyncPage() {
  const trakt = useTraktStatus();
  const crunchyroll = useQuery({ queryKey:["marquee","crunchyroll-status"], queryFn:getCrunchyrollStatus, retry:false });
  const health = useQuery({queryKey:["marquee","ingestion-health"],queryFn:getIngestionHealth,retry:false});
  const anyRunning = health.data?.sources.some(source=>Boolean(source.run_id)) ?? false;
  const queryClient = useQueryClient();
  const [busy,setBusy] = useState(false);
  const [message,setMessage] = useState("");
  const [messageSource,setMessageSource] = useState<"trakt"|"background">("trakt");
  const [failed,setFailed] = useState(false);

  const run = async (action:"connect"|"confirm"|"sync") => {
    setMessageSource("trakt");setBusy(true); setMessage(""); setFailed(false);
    try {
      if (action === "connect") {
        await startTraktAuth();
        setMessage("Approve the code on Trakt, then return here.");
      } else if (action === "confirm") {
        const result = await pollTraktAuth();
        setMessage(result.status === "connected" ? "Trakt connected." :
          result.status === "pending" ? "Still waiting for approval on Trakt." :
          result.status === "expired" ? "Code expired. Start again." :
          result.status === "denied" ? "Trakt authorization was denied." : "Start Trakt authorization first.");
        setFailed(result.status === "expired" || result.status === "denied");
      } else {
        const result = await syncTrakt();
        setMessage(`Sync complete · ${result.inserted} added · ${result.updated} updated · ${result.unmapped} pending`);
        await Promise.all([
          queryClient.invalidateQueries({queryKey:["marquee","titles"]}),
          queryClient.invalidateQueries({queryKey:["marquee","watch-history"]}),
          queryClient.invalidateQueries({queryKey:["marquee","personal-state"]}),
        ]);
      }
      await trakt.refetch();
    } catch (error) {
      setFailed(true);
      setMessage(error instanceof Error ? error.message : "Unable to update Trakt.");
      await trakt.refetch();
    } finally { setBusy(false); }
  };

  return <>
    <Helmet><title>Connections &amp; sync · Marquee</title></Helmet>
    <div className={styles.sections}>
      <section className={styles.card} aria-labelledby="background-heading">
        <div className={styles.heading}><h2 id="background-heading">Source health</h2><Button size="sm" variant="ghost" disabled={health.isFetching} onClick={()=>{if(messageSource==="background")setMessage("");void health.refetch();}} aria-label="Refresh sync health"><RefreshCw size={16}/></Button></div>
        {message&&messageSource==="background"&&<p role={failed?"alert":"status"} className={failed?styles.error:styles.success}>{message}</p>}
        {health.isError && <p role="alert" className={styles.error}>Unable to load sync health.</p>}
        <Link to="/sync/review">Review unmatched episodes →</Link>
        <p>{health.data?.monitoring?"Health checked "+formatTime(health.data.monitoring.checkedAt)+" · "+(health.data.monitoring.issues.length?health.data.monitoring.issues.join(", "):"Scheduled sources healthy"):"Health monitor will begin after release."}</p>
        {health.data?.sources.map(source=><div key={source.source} className={styles.sourceRow}>
          <strong>{source.source==="anilist"?"AniList":source.source==="trakt"?"Trakt":"Crunchyroll"}</strong>
          <p>{source.source==="anilist"?"One-time status and rating seed":source.mode==="live"?"Background sync enabled":"Background sync paused"}</p>
          {source.source==="anilist"?<p>{source.latest?.counts?.seed?`${source.latest.counts.seed.statuses} seeded statuses · ${source.latest.counts.seed.ratings} ratings`:"Status and rating seed retained"}</p>:<p>Last background sync <strong>{formatTime(source.last_success_at)}</strong></p>}
          <p><strong>{sourceState(source)}</strong>{source.mode==="live"&&source.source!=="anilist"?" · Next "+formatTime(nextScheduled([source.source==="trakt"?11:9],source.source==="trakt"?17:0,"Etc/UTC")):""}</p>
          <details><summary>Diagnostics</summary>
          {source.latest&&<p>Latest check: {source.latest.status} · {formatTime(source.latest.started_at)}{source.latest.counts?.legacyManual?" · existing sync":source.latest.mode==="shadow"?" · history unchanged":""}</p>}
          {source.latest?.error_code&&<p role="alert" className={styles.error}>{source.latest.error_code}</p>}
          {source.credential_blocked&&<p role="alert" className={styles.error}>Reconnect this source securely before checking again.</p>}
          {source.retry_after&&new Date(source.retry_after)>new Date()&&<p>Next check available after {formatTime(source.retry_after)}.</p>}
          </details>
          <div className={styles.actions}>
            {source.credential_blocked&&<Button variant="outline" disabled={busy||anyRunning} onClick={async()=>{
              setMessageSource("background");setMessage("");setBusy(true);setFailed(false);try{await runIngestion({source:source.source as "trakt"|"crunchyroll"|"anilist",action:"retry"});setMessage("Connection check queued. Use refresh to see its result.");await health.refetch();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Unable to verify connection");}finally{setBusy(false);}
            }}>Check renewed connection</Button>}
            <details><summary>Check options</summary><Button variant="outline" disabled={busy||anyRunning||source.credential_blocked} onClick={async()=>{
              setMessageSource("background");setMessage("");setBusy(true);setFailed(false);try{const r=await runIngestion({source:source.source as "trakt"|"crunchyroll"|"anilist",action:"shadow"});setMessage("Check started. Use refresh to see its result.");await health.refetch();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Unable to start check");}finally{setBusy(false);}
            }}>Check without importing</Button></details>
            {source.mode==="live"&&source.source!=="anilist"&&<Button disabled={busy||anyRunning||source.credential_blocked} onClick={async()=>{
              setMessageSource("background");setMessage("");setBusy(true);setFailed(false);try{await runIngestion({source:source.source as "trakt"|"crunchyroll",action:"sync"});setMessage("Sync queued. Use refresh to see its result.");await health.refetch();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Unable to queue sync");}finally{setBusy(false);}
            }}>Sync now</Button>}
          </div>
          {source.history.length>0&&<details><summary>Recent runs</summary><ol>{source.history.map(item=><li key={item.id}>
            {formatTime(item.started_at)} · {item.counts?.legacyManual?"Existing sync":item.mode==="shadow"?"Check":"Import"} · {item.status}
            {item.counts?.fetched!=null?` · ${item.counts.fetched} fetched`:item.counts?.feeds?` · ${Object.values(item.counts.feeds).reduce((n:number,x)=>n+Number(x),0)} fetched`:""}
            {item.counts?.newEvents!=null?` · ${item.counts.newEvents} new`:""}{item.counts?.held!=null?` · ${item.counts.held} held`:""}
            {item.error_code?` · ${item.error_code}`:""}
          </li>)}</ol></details>}
        </div>)}
      </section>
      <details className={styles.card}><summary>Trakt connection</summary><section aria-labelledby="trakt-heading">
        <div className={styles.heading}><h2 id="trakt-heading">Trakt</h2><span>{trakt.isLoading ? "Checking…" : trakt.data?.connected ? "Connected" : "Not connected"}</span></div>
        {trakt.isError && <p role="alert" className={styles.error}>Unable to load Trakt status. <Button size="sm" variant="ghost" onClick={() => void trakt.refetch()}>Retry</Button></p>}
        {trakt.data?.connected ? <>
          <p>Last sync <strong>{formatTime(trakt.data.lastSyncAt)}</strong></p>
          {trakt.data.personal && <p>{trakt.data.personal.watchlistCount} watchlisted · {trakt.data.personal.ratingsCount} rated</p>}
          {(trakt.data.lastError || trakt.data.personal?.lastError) && <p role="alert" className={styles.error}>{trakt.data.lastError || trakt.data.personal?.lastError}</p>}
          <Button disabled={busy||anyRunning} onClick={() => void run("sync")}> <RefreshCw size={16} aria-hidden="true"/>{busy ? "Syncing…" : "Sync now"}</Button>
        </> : trakt.data?.awaiting ? <>
          <p>Enter this code on Trakt:</p>
          <strong className={styles.code}>{trakt.data.awaiting.userCode}</strong>
          <div className={styles.actions}>
            <Button variant="outline" asChild><a href={trakt.data.awaiting.verificationUrl} target="_blank" rel="noreferrer"><ExternalLink size={16}/> Open Trakt</a></Button>
            <Button disabled={busy} onClick={() => void run("confirm")}>I've approved</Button>
          </div>
        </> : !trakt.isLoading && <Button disabled={busy} onClick={() => void run("connect")}>Connect Trakt</Button>}
        {message && messageSource==="trakt" && <p role={failed ? "alert" : "status"} className={failed ? styles.error : styles.success}>{message}</p>}
      </section>
      </details><details className={styles.card}><summary>Crunchyroll import details</summary><section aria-labelledby="crunchy-heading">
        <div className={styles.heading}><h2 id="crunchy-heading">Crunchyroll</h2><span>{crunchyroll.isLoading ? "Checking…" : crunchyroll.data?.lastSuccessAt ? "Active" : "Waiting for import"}</span></div>
        {crunchyroll.isError ? <p role="alert" className={styles.error}>Unable to load Crunchyroll status. <Button size="sm" variant="ghost" onClick={() => void crunchyroll.refetch()}>Retry</Button></p> :
          <><p>Last import <strong>{formatTime(crunchyroll.data?.lastSuccessAt)}</strong></p>
          {crunchyroll.data?.lastSuccessAt && <p>{crunchyroll.data.fetched} fetched · {crunchyroll.data.newEvents} new</p>}
          {crunchyroll.data?.held ? <p>{crunchyroll.data.held} identifiers need review.</p> : null}
          {crunchyroll.data?.lastError && <p role="alert" className={styles.error}>{crunchyroll.data.lastError}</p>}</>}
      </section>
      </details>
    </div>
  </>;
}