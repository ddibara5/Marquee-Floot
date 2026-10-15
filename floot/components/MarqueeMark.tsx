/** Marquee logo mark (October 15, Grid): the tilted red ticket with a perforation, no letter, so it reads small.
 * Ticket red comes from --brand; the perforation cuts through in the page background. */
export function MarqueeMark({ size = 32 }: { size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 100 100" aria-hidden="true" focusable="false" style={{ display: "block", flex: "none" }}>
    <g transform="rotate(-16 50 50)">
      <path d="M14 30h72v13a7 7 0 0 0 0 14v13H14V57a7 7 0 0 0 0-14z" fill="var(--brand)" />
      <path d="M36 33v34" stroke="var(--background)" strokeWidth="3.5" strokeDasharray="5 4" />
    </g>
  </svg>;
}
