import { useId } from "react";

/** Marquee logo mark (approved October 12, 2026: upright ticket, M cut through). Inherits currentColor. */
export function MarqueeMark({ size = 32 }: { size?: number }) {
  const id = "marquee-mark-" + useId().replace(/:/g, "");
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ display: "block", flex: "none" }}>
    <mask id={id}>
      <rect width="100" height="100" fill="#fff" />
      <circle cx="50" cy="12" r="8" fill="#000" />
      <circle cx="50" cy="88" r="8" fill="#000" />
      <path d="M33 64V36l17 14 17-14v28" fill="none" stroke="#000" strokeWidth="8" strokeLinecap="round" strokeLinejoin="round" />
    </mask>
    <rect x="22" y="12" width="56" height="76" rx="9" fill="currentColor" mask={`url(#${id})`} />
  </svg>;
}
