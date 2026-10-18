import {Link} from "react-router-dom";
import {nextScheduled,sourceState} from "../helpers/syncPresentation";
import { useState, type ReactNode } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronRight, ExternalLink, RefreshCw } from "lucide-react";
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
const formatClock = (value: Date | string) => new Date(value).toLocaleTimeString(undefined, { hour:"numeric", minute:"2-digit" });
// Today shows only the time; older values keep the date.
const formatShort = (value: Date | string | null | undefined) =>
  !value ? "Never" : new Date(value).toDateString() === new Date().toDateString() ? formatClock(value) : formatTime(value);
const SOURCE_ORDER: Record<string, number> = { trakt:0, crunchyroll:1, anilist:2 };
type Tone = "ok"|"warn"|"bad"|"idle";
const stateTone = (state: string): Tone => state === "Active" || state === "Running" ? "ok" : state === "Paused" ? "idle" : "bad";

function Row({ id, open, onToggle, tone, name, sub, meta, children }: { id:string; open:boolean; onToggle:()=>void; tone?:Tone; name:string; sub?:ReactNode; meta?:ReactNode; children:ReactNode }) {
  return <li className={styles.item}>
    <button type="button" className={styles.row} aria-expanded={open} aria-controls={id} onClick={onToggle}>
      {tone && <span className={styles.dot} data-tone={tone} aria-hidden="true"/>}
      <span className={styles.rowText}><strong>{name}</strong>{sub && <span>{sub}</span>}</span>
      {meta && <span className={styles.meta}>{meta}</span>}
      <ChevronDown size={18} className={styles.chevron} aria-hidden="true"/>
    </button>
    <div id={id} className={styles.panel} hidden={!open}>{children}</div>
  </li>;
}

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
  const [open,setOpen] = useState<string|null>(null);
  const toggle = (key:string) => () => setOpen(current => current === key ? null : key);

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

  const monitoring = health.data?.monitoring;
  const statusTone: Tone = health.isError ? "bad" : monitoring ? (monitoring.issues.length ? "warn" : "ok") : "idle";
  const sources = [...(health.data?.sources ?? [])].sort((a,b)=>(SOURCE_ORDER[a.source] ?? 9)-(SOURCE_ORDER[b.source] ?? 9));


  return <>
    <Helmet><title>Connections &amp; sync · Marquee</title></Helmet>
    <div className={styles.sections}>
      <section className={styles.status} aria-label="Source health">
        <div className={styles.statusLine}>
          <span className={styles.dot} data-tone={statusTone} aria-hidden="true"/>
          <span className={styles.rowText}>
            {health.isError ? <strong role="alert" className={styles.error}>Unable to load sync health.</strong> :
              <strong>{health.isPending ? "Checking sources…" : monitoring ? (monitoring.issues.length ? monitoring.issues.join(", ") : "All sources healthy") : "Health monitor will begin after release."}</strong>}
            {monitoring && <span>Checked {formatShort(monitoring.checkedAt)}</span>}
          </span>
          <Button size="sm" variant="outline" disabled={health.isFetching} onClick={()=>{if(messageSource==="background")setMessage("");void health.refetch();}} aria-label="Refresh sync health"><RefreshCw size={16} aria-hidden="true"/> Refresh</Button>
        </div>
        {message&&messageSource==="background"&&<p role={failed?"alert":"status"} className={failed?styles.error:styles.success}>{message}</p>}
      </section>

      <section aria-labelledby="sources-heading">
        <h2 id="sources-heading" className={styles.label}>Sources</h2>
        <ul className={styles.list}>
        {sources.map(source=>{
          const state = sourceState(source);
          const live = source.mode==="live"&&source.source!=="anilist";
          const next = live ? nextScheduled([source.source==="trakt"?11:9],source.source==="trakt"?17:0,"Etc/UTC") : null;
          const name = source.source==="anilist"?"AniList":source.source==="trakt"?"Trakt":"Crunchyroll";
          const sub = source.source==="anilist" ? (source.latest?.counts?.seed ? `One-time seed · ${source.latest.counts.seed.statuses} statuses` : "One-time seed") :
            live ? (next ? `Daily · next ${formatClock(next)}` : "Daily") : "Background sync paused";
          return <Row key={source.source} id={`source-${source.source}`} open={open===source.source} onToggle={toggle(source.source)} tone={stateTone(state)} name={name} sub={sub} meta={state==="Active"?formatShort(source.last_success_at):state}>
          <p>{source.source==="anilist"?"One-time status and rating seed":source.mode==="live"?"Background sync enabled":"Background sync paused"}</p>
          {source.source==="anilist"?<p>{source.latest?.counts?.seed?`${source.latest.counts.seed.statuses} seeded statuses · ${source.latest.counts.seed.ratings} ratings`:"Status and rating seed retained"}</p>:<p>Last background sync <strong>{formatTime(source.last_success_at)}</strong></p>}
          <p><strong>{state}</strong>{live?" · Next "+formatTime(next):""}</p>
          <div className={styles.actions}>
            {source.credential_blocked&&<Button variant="outline" disabled={busy||anyRunning} onClick={async()=>{
              setMessageSource("background");setMessage("");setBusy(true);setFailed(false);try{await runIngestion({source:source.source as "trakt"|"crunchyroll"|"anilist",action:"retry"});setMessage("Connection check queued. Use refresh to see its result.");await health.refetch();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Unable to verify connection");}finally{setBusy(false);}
            }}>Check renewed connection</Button>}
            {live&&<Button disabled={busy||anyRunning||source.credential_blocked} onClick={async()=>{
              setMessageSource("background");setMessage("");setBusy(true);setFailed(false);try{await runIngestion({source:source.source as "trakt"|"crunchyroll",action:"sync"});setMessage("Sync queued. Use refresh to see its result.");await health.refetch();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Unable to queue sync");}finally{setBusy(false);}
            }}>Sync now</Button>}
          </div>
          <details><summary>Diagnostics</summary>
          {source.latest&&<p>Latest check: {source.latest.status} · {formatTime(source.latest.started_at)}{source.latest.counts?.legacyManual?" · existing sync":source.latest.mode==="shadow"?" · history unchanged":""}</p>}
          {source.latest?.error_code&&<p role="alert" className={styles.error}>{source.latest.error_code}</p>}
          {source.credential_blocked&&<p role="alert" className={styles.error}>Reconnect this source securely before checking again.</p>}
          {source.retry_after&&new Date(source.retry_after)>new Date()&&<p>Next check available after {formatTime(source.retry_after)}.</p>}
          </details>
          <details><summary>Check options</summary><Button variant="outline" disabled={busy||anyRunning||source.credential_blocked} onClick={async()=>{
            setMessageSource("background");setMessage("");setBusy(true);setFailed(false);try{await runIngestion({source:source.source as "trakt"|"crunchyroll"|"anilist",action:"shadow"});setMessage("Check started. Use refresh to see its result.");await health.refetch();}catch(e){setFailed(true);setMessage(e instanceof Error?e.message:"Unable to start check");}finally{setBusy(false);}
          }}>Check without importing</Button></details>
          {source.history.length>0&&<details><summary>Recent runs</summary><ol>{source.history.map(item=><li key={item.id}>
            {formatTime(item.started_at)} · {item.counts?.legacyManual?"Existing sync":item.mode==="shadow"?"Check":"Import"} · {item.status}
            {item.counts?.fetched!=null?` · ${item.counts.fetched} fetched`:item.counts?.feeds?` · ${Object.values(item.counts.feeds).reduce((n:number,x)=>n+Number(x),0)} fetched`:""}
            {item.counts?.newEvents!=null?` · ${item.counts.newEvents} new`:""}{item.counts?.held!=null?` · ${item.counts.held} held`:""}
            {item.error_code?` · ${item.error_code}`:""}
          </li>)}</ol></details>}
          </Row>;})}
        </ul>
        {sources.length>0&&<p className={styles.hint}>Tap a source for Sync now, checks and recent runs.</p>}
      </section>

      <section aria-labelledby="connections-heading">
        <h2 id="connections-heading" className={styles.label}>Connections</h2>
        <ul className={styles.list}>
          <Row id="connection-trakt" open={open==="trakt-account"} onToggle={toggle("trakt-account")} tone={trakt.data?.connected?"ok":trakt.isError?"bad":"idle"} name="Trakt account"
            sub={trakt.data?.connected ? `Last sync ${formatShort(trakt.data.lastSyncAt)}` : trakt.data?.awaiting ? "Waiting for approval" : "Connect to import history"}
            meta={trakt.isLoading ? "Checking…" : trakt.data?.connected ? "Connected" : "Not connected"}>
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
          </Row>
          <Row id="connection-crunchyroll" open={open==="crunchyroll-import"} onToggle={toggle("crunchyroll-import")} tone={crunchyroll.isError||crunchyroll.data?.lastError?"bad":crunchyroll.data?.lastSuccessAt?"ok":"idle"} name="Crunchyroll import"
            sub={crunchyroll.data?.lastSuccessAt ? `Last import ${formatShort(crunchyroll.data.lastSuccessAt)}` : "Import details"}
            meta={crunchyroll.isLoading ? "Checking…" : crunchyroll.isError ? "Unavailable" : crunchyroll.data?.lastSuccessAt ? "Active" : "Waiting for import"}>
            {crunchyroll.isError ? <p role="alert" className={styles.error}>Unable to load Crunchyroll status. <Button size="sm" variant="ghost" onClick={() => void crunchyroll.refetch()}>Retry</Button></p> :
              <><p>Last import <strong>{formatTime(crunchyroll.data?.lastSuccessAt)}</strong></p>
              {crunchyroll.data?.lastSuccessAt && <p>{crunchyroll.data.fetched} fetched · {crunchyroll.data.newEvents} new</p>}
              {crunchyroll.data?.held ? <p>{crunchyroll.data.held} identifiers need review.</p> : null}
              {crunchyroll.data?.lastError && <p role="alert" className={styles.error}>{crunchyroll.data.lastError}</p>}</>}
          </Row>
          <li className={styles.item}>
            <Link to="/sync/review" className={styles.row}>
              {/* No count here: Crunchyroll's held total is not the review queue (159 held vs none to review, October 18). */}
              <span className={styles.dot} data-tone="idle" aria-hidden="true"/>
              <span className={styles.rowText}><strong>Mapping review</strong><span>Unmatched Crunchyroll episodes</span></span>
              <ChevronRight size={18} className={styles.chevron} aria-hidden="true"/>
            </Link>
          </li>
        </ul>
      </section>
    </div>
  </>;
}
