import type { ReactNode } from "react";
import { SlidersHorizontal } from "lucide-react";
import { Sheet, SheetClose, SheetContent, SheetTitle, SheetTrigger } from "./Sheet";
import { useIsMobile } from "../helpers/useIsMobile";
import styles from "./OptionsSheet.module.css";

/** Filters and sorting behind one Options button with a count of what is on (October 17, GameDeck's Library pattern). */
export function OptionsSheet({ label, activeCount, canReset, doneLabel, onReset, children }: {
  label: string; activeCount: number; canReset: boolean; doneLabel: string; onReset: () => void; children: ReactNode;
}) {
  const mobile = useIsMobile();
  return <Sheet>
    <SheetTrigger asChild>
      <button type="button" className={styles.trigger} aria-label={activeCount ? `${label}, ${activeCount} on` : label}>
        <SlidersHorizontal size={18} aria-hidden="true" /><span>Options</span>
        {activeCount > 0 && <span className={styles.badge} aria-hidden="true">{activeCount}</span>}
      </button>
    </SheetTrigger>
    <SheetContent side={mobile ? "bottom" : "right"} className={styles.content} data-ui-overlay="">
      <SheetTitle className={styles.title}>Options</SheetTitle>
      <div className={styles.fields}>{children}</div>
      <div className={styles.footer}>
        <button type="button" className={styles.reset} onClick={onReset} disabled={!canReset}>Reset</button>
        <SheetClose asChild><button type="button" className={styles.done}>{doneLabel}</button></SheetClose>
      </div>
    </SheetContent>
  </Sheet>;
}

/** A labelled row of choices inside the sheet; one is always selected. */
export function OptionChoice<T extends string>({ label, value, options, onChange }: {
  label: string; value: T; options: readonly (readonly [T, string])[]; onChange: (value: T) => void;
}) {
  return <div className={styles.field}>
    <span className={styles.label}>{label}</span>
    <div className={styles.choices} role="group" aria-label={label}>
      {options.map(([option, text]) => <button type="button" key={option} aria-pressed={value === option} onClick={() => onChange(option)}>{text}</button>)}
    </div>
  </div>;
}
