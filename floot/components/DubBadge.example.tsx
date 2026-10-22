import { DubBadge } from "./DubBadge";

export default function DubBadgeExample() {
  return <div style={{ display: "flex", flexDirection: "column", gap: 16, padding: 24 }}>
    <div style={{ display: "flex", gap: 8 }}><DubBadge hasEnDub /><DubBadge hasEnDub={false} /></div>
    <div style={{ display: "flex", gap: 10 }}>
      {[true, false].map(dub => <span key={String(dub)} style={{ position: "relative", width: 104, height: 156, borderRadius: 10, background: "linear-gradient(160deg,#4a6fa8,#151b2e)" }}>
        <DubBadge hasEnDub={dub} overlay /></span>)}
    </div>
  </div>;
}
