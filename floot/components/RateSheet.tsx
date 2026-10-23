import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetTitle, SheetDescription } from "./Sheet";
import { Button } from "./Button";
import { MediaImage } from "./MediaImage";
import RatingControl from "./RatingControl";
import { ratingText } from "../helpers/titleRatings";
import { tmdbImageUrl } from "../helpers/tmdbImageUrl";
import styles from "./RateSheet.module.css";

// Rating sheet for one title (GameDeck's RateSheet). Saving and clearing are the caller's writes; the sheet closes once a write succeeds.
export default function RateSheet({ open, onOpenChange, title, posterPath, current, onSave }: {
  open: boolean; onOpenChange: (open: boolean) => void; title: string; posterPath?: string | null; current: number | null; onSave: (score: number | null) => Promise<void>;
}) {
  const [value, setValue] = useState<number | null>(current);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  useEffect(() => { if (open) { setValue(current); setError(""); } }, [open, current]);
  const write = async (score: number | null) => {
    setBusy(true); setError("");
    try { await onSave(score); onOpenChange(false); } catch (e) { setError((e as Error).message); } finally { setBusy(false); }
  };
  const poster = tmdbImageUrl(posterPath ?? undefined, "w185");
  return <Sheet open={open} onOpenChange={onOpenChange}>
    <SheetContent side="bottom" className={styles.sheet} data-ui-overlay="">
      <span className={styles.grabber} aria-hidden="true" />
      <div className={styles.head}>
        <span className={styles.poster} aria-hidden="true"><MediaImage key={poster ?? title} src={poster} fallback={title.slice(0, 1)} alt="" decoding="async" /></span>
        <div><SheetTitle className={styles.title}>{title}</SheetTitle><SheetDescription className={styles.description}>{current != null ? "Rated " + ratingText(current) : "Not rated yet"}</SheetDescription></div>
      </div>
      <RatingControl value={value} onChange={setValue} hint="out of 10" label={"Rating for " + title} />
      {error && <p className={styles.error} role="alert">Rating not saved: {error}</p>}
      <div className={styles.actions}>
        {current != null && <Button variant="outline" size="lg" disabled={busy} onClick={() => void write(null)}>Clear rating</Button>}
        <Button size="lg" className={styles.save} disabled={busy || value == null || value === current} onClick={() => void write(value)}>{value == null ? "Save" : "Save " + ratingText(value)}</Button>
      </div>
    </SheetContent>
  </Sheet>;
}