import { Component, type ErrorInfo, type ReactNode } from "react";
import { Capacitor } from "@capacitor/core";
import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { reportClientError } from "../endpoints/client-error_POST.schema";
import styles from "./PageErrorBoundary.module.css";

type Props = { children: ReactNode; resetKey?: string };
type State = { error: Error | null };

/** A page that throws shows this instead of taking the whole app down with it (October 17: in the iPhone app a crash
 *  also hid the native tab bar and header, leaving a blank screen). Moving to another page resets it. */
export class PageErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    reportClientError({
      message: String(error?.message ?? error), stack: error?.stack, componentStack: info.componentStack ?? undefined,
      path: typeof location === "undefined" ? "" : location.pathname, platform: Capacitor.getPlatform(),
    });
  }

  componentDidUpdate(previous: Props) {
    if (this.state.error && previous.resetKey !== this.props.resetKey) this.setState({ error: null });
  }

  render() {
    if (!this.state.error) return this.props.children;
    return <div className={styles.panel} role="alert">
      <AlertTriangle size={28} aria-hidden="true" />
      <h2>This page hit a problem</h2>
      <p>It has been reported. Try again, or reload Marquee.</p>
      <code>{String(this.state.error.message ?? this.state.error).slice(0, 160)}</code>
      <div className={styles.actions}>
        <Button variant="outline" onClick={() => this.setState({ error: null })}>Try again</Button>
        <Button onClick={() => location.reload()}>Reload</Button>
      </div>
    </div>;
  }
}
