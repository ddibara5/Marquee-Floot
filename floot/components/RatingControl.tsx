import { Minus, Plus } from "lucide-react";
import { Button } from "./Button";
import { RATING_MAX, RATING_MIN, ratingText, stepRating } from "../helpers/titleRatings";
import styles from "./RatingControl.module.css";

const WHOLE = Array.from({ length: 10 }, (_, i) => i + 1);
// GameDeck's 1 to 10 scale in half points: drag the ruler, tap a number, or step with the buttons. Arrow keys move half a point.
export default function RatingControl({ value, onChange, hint, label }: { value: number | null; onChange: (value: number) => void; hint: string; label: string }) {
  const shown = value ?? 5.5, pct = (shown - RATING_MIN) / (RATING_MAX - RATING_MIN) * 100;
  return <div className={styles.control} data-empty={value == null || undefined}>
    <div className={styles.score}>
      <Button variant="outline" size="icon-lg" className={styles.step} aria-label="Half a point lower" disabled={value != null && value <= RATING_MIN} onClick={() => onChange(value == null ? 5 : stepRating(value, -0.5))}><Minus size={20} /></Button>
      <div className={styles.readout}><strong aria-hidden="true">{value == null ? "–" : ratingText(value)}</strong><span>{hint}</span></div>
      <Button variant="outline" size="icon-lg" className={styles.step} aria-label="Half a point higher" disabled={value != null && value >= RATING_MAX} onClick={() => onChange(value == null ? 6 : stepRating(value, 0.5))}><Plus size={20} /></Button>
    </div>
    <div className={styles.ruler} style={{ "--fill": pct + "%" } as React.CSSProperties}>
      <div className={styles.ticks} aria-hidden="true">{Array.from({ length: 19 }, (_, i) => 1 + i / 2).map(r => <i key={r} data-whole={Number.isInteger(r) || undefined} data-on={value != null && r <= value || undefined} style={{ left: (r - 1) / 9 * 100 + "%" }} />)}</div>
      <input className={styles.range} type="range" min={RATING_MIN} max={RATING_MAX} step={0.5} value={shown} aria-label={label} aria-valuetext={value == null ? "Not rated" : ratingText(value) + " out of 10"} onChange={e => onChange(Number(e.currentTarget.value))} />
    </div>
    <div className={styles.numbers}>{WHOLE.map(n => <button type="button" key={n} className={styles.number} aria-label={"Rate " + n} aria-pressed={value === n} onClick={() => onChange(n)} style={{ left: (n - 1) / 9 * 100 + "%" }}>{n}</button>)}</div>
  </div>;
}