import { useId, useState, type ReactElement } from "react";
import { useLocation } from "react-router-dom";
import { Capacitor } from "@capacitor/core";
import { toast } from "sonner";
import { Sheet, SheetContent, SheetDescription, SheetTitle, SheetTrigger } from "./Sheet";
import { Textarea } from "./Textarea";
import { OptionChoice } from "./OptionsSheet";
import { useIsMobile } from "../helpers/useIsMobile";
import { deviceName, screenName } from "../helpers/feedbackContext";
import { postFeedback } from "../endpoints/feedback/send_POST.schema";
import styles from "./FeedbackSheet.module.css";

type Kind = "Bug" | "Enhancement" | "Unclear";
const KINDS = [["Bug", "Bug"], ["Enhancement", "Idea"], ["Unclear", "Not sure"]] as const;

/** Send feedback (October 20, Dave only): a note to App Feedback in the vault, in the OptionsSheet look. */
export function FeedbackSheet({ children }: { children: ReactElement }) {
  const mobile = useIsMobile();
  const { pathname } = useLocation();
  const fieldId = useId();
  const [open, setOpen] = useState(false);
  const [finding, setFinding] = useState("");
  const [kind, setKind] = useState<Kind>("Unclear");
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const device = deviceName(navigator.userAgent, navigator.maxTouchPoints) + (Capacitor.isNativePlatform() ? " app" : " web");
  const saved = `${screenName(pathname)}, ${device}`;

  async function send() {
    setPending(true);
    setError(null);
    try {
      const { id } = await postFeedback({ finding, type: kind, context: "Sent from " + saved });
      setOpen(false);
      setFinding("");
      setKind("Unclear");
      toast.success("Saved to App Feedback as " + id);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save feedback.");
    } finally {
      setPending(false);
    }
  }

  return <Sheet open={open} onOpenChange={setOpen}>
    <SheetTrigger asChild>{children}</SheetTrigger>
    <SheetContent side={mobile ? "bottom" : "right"} className={styles.content} data-ui-overlay="">
      <SheetTitle className={styles.title}>Send feedback</SheetTitle>
      <SheetDescription className={styles.description}>Saves to App Feedback in your vault.</SheetDescription>
      <form className={styles.fields} onSubmit={event => { event.preventDefault(); if (finding.trim() && !pending) void send(); }}>
        <div className={styles.field}>
          <label className={styles.label} htmlFor={fieldId}>What happened, or what do you want?</label>
          <Textarea id={fieldId} className={styles.text} value={finding} maxLength={2000} autoFocus
            onChange={event => setFinding(event.target.value)} />
        </div>
        <OptionChoice label="Type" value={kind} options={KINDS} onChange={setKind} />
        <p className={styles.saved}>Also saved: {saved}</p>
        {error && <p className={styles.error} role="alert">{error}</p>}
        <button type="submit" className={styles.send} disabled={!finding.trim() || pending}>{pending ? "Sending…" : "Send"}</button>
      </form>
    </SheetContent>
  </Sheet>;
}
