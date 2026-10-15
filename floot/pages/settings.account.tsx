import { useState } from "react";
import { Helmet } from "react-helmet";
import { LogOut } from "lucide-react";
import { Button } from "../components/Button";
import { useAuth } from "../helpers/useAuth";
import styles from "./settings.account.module.css";

export default function AccountPage() {
  const { authState, logout } = useAuth();
  const [error, setError] = useState("");
  return <>
    <Helmet><title>Account · Marquee</title></Helmet>
    <section className={styles.section}>
      <p className={styles.label}>SIGNED IN AS</p>
      <div className={styles.identity}>
        <strong>{authState.type === "authenticated" ? authState.user.displayName || authState.user.email : "Marquee account"}</strong>
        {authState.type === "authenticated" && <span>{authState.user.email}</span>}
      </div>
      <Button variant="outline" className={styles.signOut} onClick={() => void logout().catch(() => setError("Unable to sign out. Try again."))}><LogOut size={17}/> Sign out</Button>
      {error && <p role="alert" className={styles.error}>{error}</p>}
    </section>
  </>;
}