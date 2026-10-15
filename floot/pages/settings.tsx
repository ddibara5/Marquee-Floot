import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ChevronRight, CircleUserRound, RefreshCw, SunMoon } from "lucide-react";
import { useThemeMode } from "../helpers/themeMode";
import { useTraktStatus } from "../helpers/useTraktStatus";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const theme = useThemeMode();
  const trakt = useTraktStatus();
  return <>
    <Helmet><title>Settings · Marquee</title></Helmet>
    <div className={styles.menu}>
      <p className={styles.groupLabel}>PREFERENCES</p>
      <nav className={styles.group} aria-label="Settings">
        <Link className={styles.row} to="/settings/appearance"><SunMoon size={19} aria-hidden="true"/><span><strong>Appearance</strong><small>{theme.mode === "auto" ? "System" : theme.mode === "dark" ? "Dark" : "Light"}</small></span><ChevronRight size={18} aria-hidden="true"/></Link>
        <Link className={styles.row} to="/sync"><RefreshCw size={19} aria-hidden="true"/><span><strong>Connections &amp; sync</strong><small>{trakt.isError ? "Status unavailable" : trakt.isLoading ? "Checking…" : trakt.data?.connected ? "Trakt connected" : "Connect Trakt"}</small></span><ChevronRight size={18} aria-hidden="true"/></Link>
      </nav>
      <p className={styles.groupLabel}>ACCOUNT</p>
      <nav className={styles.group} aria-label="Account settings">
        <Link className={styles.row} to="/settings/account"><CircleUserRound size={19} aria-hidden="true"/><span><strong>Account</strong></span><ChevronRight size={18} aria-hidden="true"/></Link>
      </nav>
    </div>
  </>;
}