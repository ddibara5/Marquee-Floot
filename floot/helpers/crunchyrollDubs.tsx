import { randomUUID } from "node:crypto";
import { sql } from "kysely";
import { db } from "./db";
import { importHttp } from "./marqueeImportHttp";

// Same host and client as the live Crunchyroll import (marqueeCrPage).
const API = "https://beta-api.crunchyroll.com";
const MAX_SERIES = 40;

type Panel = { id?: string; episode_metadata?: { audio_locale?: string; versions?: { audio_locale?: string }[] | null } };
type UpNext = { data?: { panel?: Panel; fully_watched?: boolean }[] };

/** True when the episode has an en-US audio version. Episodes without a versions list carry a single audio_locale. */
export function hasEnglishDub(panel: Panel | undefined): boolean | null {
  const meta = panel?.episode_metadata;
  if (!meta) return null;
  const locales = meta.versions?.length ? meta.versions.map(version => version.audio_locale) : [meta.audio_locale];
  return locales.includes("en-US");
}

const normal = (value: string) => value.normalize("NFKD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]/g, "");
/** The one search hit with the same title (ignoring case and punctuation) and a launch year within one year, else null. Never guesses. */
export function matchCrunchyrollSeries(title: string, year: number | null, items: { id: string; title: string; year: number | null }[]) {
  const hits = items.filter(item => normal(item.title) === normal(title) &&
    (year === null || item.year === null || Math.abs(item.year - year) <= 1));
  return hits.length === 1 ? hits[0].id : null;
}

/** Records whether the next episode to watch (S1 E1 for unstarted Watch List anime) has an English dub. */
export async function checkCrunchyrollDubs(userId: number) {
  const cookie = process.env.CRUNCHYROLL_ETP_RT;
  if (!cookie || /[\r\n;]/.test(cookie)) throw Error("CR_CREDENTIAL_MISSING");
  const form = new URLSearchParams({ grant_type: "etp_rt_cookie", scope: "offline_access", device_id: randomUUID(),
    device_name: "Marquee Floot", device_type: "com.crunchyroll.desktop.windows" });
  const tokenBody = await (await importHttp(API + "/auth/v1/token", { method: "POST", headers: {
    Authorization: "Basic " + Buffer.from("noaihdevm_6iyg0a8l0q:").toString("base64"),
    Cookie: "etp_rt=" + cookie, "Content-Type": "application/x-www-form-urlencoded" }, body: form.toString() }, "CR_AUTH", false)).json();
  if (typeof tokenBody.access_token !== "string") throw Error("CR_AUTH_SHAPE");
  const headers = { Authorization: "Bearer " + tokenBody.access_token, Accept: "application/json" };
  const get = async (path: string) => (await importHttp(API + path, { headers }, "CR_DUB")).json();

  // Started: Crunchyroll series played in the last 120 days, keyed to their canonical Marquee title through a
  // mapped episode or, for partial plays that never map an episode, the reviewed series mapping.
  const started = await sql<{ titleId: number; seriesId: string }>`
    SELECT DISTINCT ON (title_id) title_id AS "titleId", series_id AS "seriesId" FROM (
      SELECT COALESCE(alias.canonical_title_id, s.title_id, series.title_id) AS title_id, r.source_series_id AS series_id, r.source_date::timestamptz AS played
      FROM marquee_crunchyroll_raw r
      LEFT JOIN marquee_episodes e ON e.id = r.episode_id
      LEFT JOIN marquee_seasons s ON s.id = e.season_id
      LEFT JOIN marquee_title_aliases alias ON alias.duplicate_title_id = s.title_id
      LEFT JOIN marquee_source_mappings series ON series.source = 'crunchyroll' AND series.source_entity_type = 'series'
        AND series.source_id = r.source_series_id
      WHERE r.user_id = ${userId} AND r.source_series_id IS NOT NULL
        AND r.source_date::timestamptz >= now() - interval '120 days') recent
    WHERE title_id IS NOT NULL
    ORDER BY title_id, played DESC`.execute(db);
  // Watch List anime; a series id found by an earlier search is reused.
  const saved = await sql<{ titleId: number; title: string; year: number | null; seriesId: string | null }>`
    WITH saved AS (
      SELECT title_id, is_anime FROM marquee_trakt_watchlist WHERE user_id = ${userId} AND active AND title_id IS NOT NULL
      UNION ALL SELECT title_id, false FROM marquee_legacy_watchlist WHERE user_id = ${userId} AND source = 'manual')
    SELECT DISTINCT ON (t.id) t.id AS "titleId", t.display_title AS title, t.release_year AS year, d.series_id AS "seriesId"
    FROM saved JOIN marquee_titles t ON t.id = saved.title_id
    LEFT JOIN marquee_crunchyroll_dubs d ON d.user_id = ${userId} AND d.title_id = t.id
    WHERE t.is_anime OR saved.is_anime IS TRUE
    ORDER BY t.id`.execute(db);

  const series = new Map(started.rows.map(row => [row.titleId, row.seriesId]));
  let unmatched = 0;
  for (const row of saved.rows) {
    if (series.has(row.titleId)) continue;
    let seriesId = row.seriesId;
    if (!seriesId) {
      const found = await get("/content/v2/discover/search?q=" + encodeURIComponent(row.title) + "&type=series&locale=en-US");
      const items = (found.data ?? []).find((group: { type?: string }) => group.type === "series")?.items ?? [];
      seriesId = matchCrunchyrollSeries(row.title, row.year, items.map((item: { id: string; title: string; series_metadata?: { series_launch_year?: number } }) =>
        ({ id: item.id, title: item.title, year: item.series_metadata?.series_launch_year ?? null })));
    }
    if (seriesId) series.set(row.titleId, seriesId); else unmatched++;
  }

  let dubbed = 0, subOnly = 0, none = 0, failed = 0;
  for (const [titleId, seriesId] of [...series].slice(0, MAX_SERIES)) {
    const upNext = async (id: string) => ((await get("/content/v2/discover/up_next/" + encodeURIComponent(id) + "?locale=en-US")) as UpNext).data?.[0];
    let panel: Panel | undefined;
    try {
      // By series id Crunchyroll returns the episode to resume, or S1 E1 if never watched. When that episode is
      // already fully watched, the episode after it comes from up_next by episode id; none means caught up.
      const resume = await upNext(seriesId);
      panel = resume?.fully_watched ? (resume.panel?.id ? (await upNext(resume.panel.id))?.panel : undefined) : resume?.panel;
    } catch { failed++; continue; }
    const hasEnDub = hasEnglishDub(panel);
    if (hasEnDub === null) none++; else if (hasEnDub) dubbed++; else subOnly++;
    // dub_arrived_at marks the day the same episode went from Sub only to English dub (the future alert's trigger).
    await sql`
      INSERT INTO marquee_crunchyroll_dubs (user_id, title_id, series_id, episode_id, has_en_dub)
      VALUES (${userId}, ${titleId}, ${seriesId}, ${panel?.id ?? null}, ${hasEnDub})
      ON CONFLICT (user_id, title_id) DO UPDATE SET
        series_id = excluded.series_id, episode_id = excluded.episode_id, has_en_dub = excluded.has_en_dub,
        dub_arrived_at = CASE
          WHEN marquee_crunchyroll_dubs.episode_id IS DISTINCT FROM excluded.episode_id THEN NULL
          WHEN excluded.has_en_dub AND marquee_crunchyroll_dubs.has_en_dub = false THEN now()
          ELSE marquee_crunchyroll_dubs.dub_arrived_at END,
        checked_at = now()`.execute(db);
  }
  return { series: series.size, dubbed, subOnly, none, failed, unmatched };
}
