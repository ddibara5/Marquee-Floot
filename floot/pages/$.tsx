import { Helmet } from "react-helmet";
import { Link } from "react-router-dom";
import { Button } from "../components/Button";
import styles from "./$.module.css";

export default function NotFoundPage() {
  return <div className={styles.notFound}>
    <Helmet><title>Page not found · Marquee</title></Helmet>
    <h2>This page doesn’t exist</h2>
    <p>The link may be old or mistyped.</p>
    <div className={styles.actions}>
      <Button asChild><Link to="/">Go to Home</Link></Button>
      <Button asChild variant="outline"><Link to="/library?view=titles">Search titles</Link></Button>
    </div>
  </div>;
}
