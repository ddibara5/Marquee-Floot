import type { ReactNode } from "react";
import { Clapperboard } from "lucide-react";
import styles from "./FamilyAuthShell.module.css";
export function FamilyAuthShell({title,description,children}:{title:string;description:string;children:ReactNode}){
  return <main className={styles.page}><section className={styles.card} aria-label={title}>
    <div className={styles.brand}><span><Clapperboard size={20}/></span><h1>Marquee</h1></div>
    <h2 className={styles.title}>{title}</h2><p className={styles.intro}>{description}</p>{children}
  </section></main>;
}