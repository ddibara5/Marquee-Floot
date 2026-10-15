import { ChevronDown, ChevronUp, Lock, SlidersHorizontal } from "lucide-react";
import { Button } from "./Button";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./Sheet";
import { Switch } from "./Switch";
import { HOME_SECTIONS, moveHomeSection, type HomeLayout } from "../helpers/homeLayout";
import { useIsMobile } from "../helpers/useIsMobile";
import styles from "./HomeCustomizeSheet.module.css";

export default function HomeCustomizeSheet({ layout, onChange, onReset }: {
  layout: HomeLayout; onChange: (layout: HomeLayout) => void; onReset: () => void;
}) {
  const mobile = useIsMobile();
  const byId = new Map(HOME_SECTIONS.map(section => [section.id, section]));
  return <Sheet>
    <SheetTrigger asChild>
      <Button variant="outline" className={styles.trigger}><SlidersHorizontal size={16} aria-hidden="true" />Customize Home</Button>
    </SheetTrigger>
    <SheetContent side={mobile ? "bottom" : "right"} className={styles.content} data-ui-overlay="">
      <SheetTitle className={styles.title}>Customize Home</SheetTitle>
      <SheetDescription className={styles.description}>Use the arrows to move a section. Turn a section off to hide it.</SheetDescription>
      <ul className={styles.list}>
        <li className={styles.row}>
          <Lock size={18} className={styles.lead} aria-hidden="true" />
          <span className={styles.copy}><strong>Up next</strong><small>The show you are watching now</small></span>
          <span className={styles.fixed}>Always first</span>
        </li>
        {layout.order.map((id, index) => {
          const section = byId.get(id)!;
          const shown = !layout.hidden.includes(id);
          return <li className={styles.row} key={id}>
            <span className={styles.copy}><strong>{section.label}</strong><small>{section.hint}</small></span>
            <button type="button" className={styles.move} aria-label={"Move " + section.label + " up"} disabled={index === 0}
              onClick={() => onChange(moveHomeSection(layout, id, -1))}><ChevronUp size={18} aria-hidden="true" /></button>
            <button type="button" className={styles.move} aria-label={"Move " + section.label + " down"} disabled={index === layout.order.length - 1}
              onClick={() => onChange(moveHomeSection(layout, id, 1))}><ChevronDown size={18} aria-hidden="true" /></button>
            <label className={styles.switchHit}>
              <Switch checked={shown} aria-label={"Show " + section.label}
                onCheckedChange={on => onChange({ ...layout, hidden: on ? layout.hidden.filter(other => other !== id) : [...layout.hidden, id] })} />
            </label>
          </li>;
        })}
      </ul>
      <div className={styles.footer}>
        <Button variant="ghost" onClick={onReset}>Reset to default</Button>
      </div>
      <p className={styles.note}>Your layout is saved on this device, like your theme.</p>
    </SheetContent>
  </Sheet>;
}