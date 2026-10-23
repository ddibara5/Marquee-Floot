import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { ChevronRight, CircleUserRound, MessageSquare, RefreshCw, SunMoon, Users } from "lucide-react";
import { FeedbackSheet } from "../components/FeedbackSheet";
import { useAuth } from "../helpers/useAuth";
import { useThemeMode } from "../helpers/themeMode";
import { useTraktStatus } from "../helpers/useTraktStatus";
import styles from "./settings.module.css";

export default function SettingsPage() {
  const theme = useThemeMode();
  const trakt = useTraktStatus();
  const { authState } = useAuth();
  // Dave is user 1, the same check the feedback endpoint makes on the server.
  const isDave = authState.type === "authenticated" && authState.user.id === 1;
  return <>
    <Helmet><title>Settings · Marquee</title></Helmet>
    <div className={styles.menu}>
      <h2 className={styles.groupLabel}>Preferences</h2>
      <nav className={styles.group} aria-label="Settings">
        <Link className={styles.row} to="/settings/appearance"><SunMoon size={19} aria-hidden="true"/><span><strong>Appearance</strong><small>{theme.mode === "auto" ? "System" : theme.mode === "dark" ? "Dark" : "Light"}</small></span><ChevronRight size={18} aria-hidden="true"/></Link>
        <Link className={styles.row} to="/sync"><RefreshCw size={19} aria-hidden="true"/><span><strong>Connections &amp; sync</strong><small>{trakt.isError ? "Status unavailable" : trakt.isLoading ? "Checking…" : trakt.data?.connected ? "Trakt connected" : "Connect Trakt"}</small></span><ChevronRight size={18} aria-hidden="true"/></Link>
      </nav>
      {isDave && <>
        <h2 className={styles.groupLabel}>Feedback</h2>
        <div className={styles.group}>
          <FeedbackSheet>
            <button type="button" className={`${styles.row} ${styles.rowButton}`}><MessageSquare size={19} aria-hidden="true"/><span><strong>Send feedback</strong><small>Bugs and ideas go to your vault</small></span><ChevronRight size={18} aria-hidden="true"/></button>
          </FeedbackSheet>
        </div>
      </>}
      <h2 className={styles.groupLabel}>Account</h2>
      <nav className={styles.group} aria-label="Account settings">
        <Link className={styles.row} to="/settings/account"><CircleUserRound size={19} aria-hidden="true"/><span><strong>Account</strong></span><ChevronRight size={18} aria-hidden="true"/></Link>
        {isDave && <Link className={styles.row} to="/settings/household"><Users size={19} aria-hidden="true"/><span><strong>Household access</strong><small>Members and automation account</small></span><ChevronRight size={18} aria-hidden="true"/></Link>}
      </nav>
    </div>
  </>;
}
