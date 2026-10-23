import type { ReactNode } from "react";
import { MarqueeMark } from "./MarqueeMark";
import styles from "./FamilyAuthShell.module.css";
// October 22: sign-in uses the same mark as the sidebar and a glass card on the night ground, like the rest of the app.
export function FamilyAuthShell({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <main className={styles.page}><section className={styles.card} aria-label={title}>
    <div className={styles.brand}><span><MarqueeMark size={30}/></span><h1>Marquee</h1></div>
    <h2 className={styles.title}>{title}</h2><p className={styles.intro}>{description}</p>{children}
  </section></main>;
}
