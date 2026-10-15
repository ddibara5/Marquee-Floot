type Candidate = { id: number; episodeNumber: number; title: string };
type Anchor = { kind: string; titleId: number | null };

const normalized = (text: string) => text.trim().normalize("NFKC").toLocaleLowerCase("en");

export function trustedCrunchyrollTitle(anchors: Anchor[]): number | null {
  const titleId = anchors[0]?.titleId;
  return anchors.length >= 3 && titleId &&
    anchors.every(anchor => anchor.kind === "episode" && anchor.titleId === titleId)
    ? titleId : null;
}

// A trusted series still needs one unambiguous episode match. Crunchyroll's
// season label can differ for dubs, so use number and exact episode title.
export function uniqueCrunchyrollEpisode(
  candidates: Candidate[], number: unknown, title: unknown
): number | null {
  if (!Number.isInteger(number) || (number as number) < 1 ||
      typeof title !== "string" || !title.trim()) return null;
  const matches = candidates.filter(row =>
    row.episodeNumber === number && normalized(row.title) === normalized(title));
  return matches.length === 1 ? matches[0].id : null;
}

// Backfills and late or changed source observations remain undated until reviewed.
export function recentCrunchyrollPlay(
  sourceDate: string, priorSuccess: Date | null, now: Date, alreadySeen: boolean
): Date | null {
  const timestamp = Date.parse(sourceDate);
  if (alreadySeen || !priorSuccess || !Number.isFinite(timestamp) ||
      timestamp > now.getTime() ||
      timestamp < now.getTime() - 48 * 3600000 ||
      timestamp < priorSuccess.getTime() - 48 * 3600000) return null;
  return new Date(timestamp);
}
type Playback = {parent_id?: string; panel?: {id?: string; title?: string; episode_metadata?: {identifier?: string; series_id?: string; episode_number?: number}}};
// Playback date, playhead and completion are mutable. A provider label may be
// renumbered only with the same stable panel, series, title and episode number.
export function sameCrunchyrollEpisode(before: Playback, after: Playback): boolean {
 const a=before.panel, b=after.panel, am=a?.episode_metadata, bm=b?.episode_metadata;
 if (!a?.id || a.id!==b?.id || !am?.series_id || am.series_id!==bm?.series_id ||
     (before.parent_id??null)!==(after.parent_id??null)) return false;
 if ((am.identifier??null)===(bm?.identifier??null)) return true;
 return Number.isInteger(am.episode_number) && am.episode_number===bm?.episode_number &&
   typeof a.title==="string" && !!a.title.trim() && typeof b?.title==="string" &&
   normalized(a.title)===normalized(b.title);
}
export function resumedCrunchyrollCompletion(before: {fully_watched?: boolean; date_played?: string}, after: {fully_watched: boolean; date_played: string}): boolean {
 return before.fully_watched===false && after.fully_watched &&
   Number.isFinite(Date.parse(before.date_played??"")) &&
   Date.parse(after.date_played)>=Date.parse(before.date_played!);
}
