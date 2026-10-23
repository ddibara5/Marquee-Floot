import { Helmet } from "react-helmet";
import { Check } from "lucide-react";
import { Button } from "../components/Button";
import { useThemeMode, type ThemeMode } from "../helpers/themeMode";
import styles from "./settings.appearance.module.css";

export default function AppearancePage() {
  const theme = useThemeMode();
  const choose = (mode: ThemeMode) => {
    if (mode === "light") theme.switchToLightMode();
    else if (mode === "dark") theme.switchToDarkMode();
    else theme.switchToAutoMode();
  };
  return <>
    <Helmet><title>Appearance · Marquee</title></Helmet>
    <section className={styles.section} aria-label="Display mode">
      <h2 className={styles.label}>Display mode</h2>
      <div className={styles.options}>
        {(["auto","dark","light"] as const).map(mode => <Button key={mode} variant="ghost" className={styles.option}
          aria-pressed={theme.mode === mode} onClick={() => choose(mode)}>
          <span><strong>{mode === "auto" ? "System" : mode === "dark" ? "Dark" : "Light"}</strong>
          {mode === "auto" && <small>Match your device</small>}</span>
          {theme.mode === mode && <Check size={19} aria-hidden="true"/>}
        </Button>)}
      </div>
    </section>
  </>;
}
