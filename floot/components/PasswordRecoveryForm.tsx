import { useState,useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "./Button";
import { Input } from "./Input";
import { PasswordField } from "./PasswordField";
import { schema,postPasswordRecovery } from "../endpoints/auth/password_recovery_POST.schema";
import { AUTH_QUERY_KEY } from "../helpers/useAuth";
import styles from "./PasswordRecoveryForm.module.css";

export function PasswordRecoveryForm({token}:{token?:string}){
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [confirmation,setConfirmation]=useState("");
  const [busy,setBusy]=useState(false);
  const [message,setMessage]=useState("");
  const [error,setError]=useState("");
  const [invalid,setInvalid]=useState("");
  const emailRef=useRef<HTMLInputElement>(null),passwordRef=useRef<HTMLInputElement>(null),confirmationRef=useRef<HTMLInputElement>(null);
  const queryClient=useQueryClient();
  const navigate=useNavigate();
  const resetting=token!==undefined;
  async function submit(event:React.FormEvent){
    event.preventDefault();if(busy)return;setError("");setInvalid("");setMessage("");
    const payload=resetting ? {action:"reset" as const,token,password} : {action:"request" as const,email};
    const parsed=schema.safeParse(payload);
    if(!parsed.success){const issue=parsed.error.issues[0],field=String(issue.path[0]||"password");setError(issue.message);setInvalid(field);(field==="email"?emailRef:passwordRef).current?.focus();return;}
    if(resetting && password!==confirmation){setError("The passwords do not match.");setInvalid("confirmation");confirmationRef.current?.focus();return;}
    setBusy(true);
    try{
      const result=await postPasswordRecovery(parsed.data);
      if(resetting){
        setPassword("");setConfirmation("");
        queryClient.clear();queryClient.setQueryData(AUTH_QUERY_KEY,null);
        navigate("/login?reset=complete",{replace:true});
      }else setMessage(result.message);
    }catch{
      setError(resetting ? "The link may have expired or already been used. Request a new recovery link." : "Recovery is unavailable. Please try again.");
    }finally{setBusy(false);}
  }
  return <form noValidate className={styles.form} onSubmit={submit} aria-busy={busy}>
    <div className={styles.feedback}>{error && <p id="recovery-error" role="alert" className={styles.error}>{error}</p>}{message && <p role="status" className={styles.message}>{message}</p>}</div>
    {!resetting ? <label className={styles.field} htmlFor="recovery-email">Email
      <Input ref={emailRef} aria-invalid={invalid==="email"} aria-describedby={invalid==="email"?"recovery-error":undefined} id="recovery-email" name="email" type="email" autoComplete="username" value={email} onChange={e=>setEmail(e.target.value)} required disabled={busy} />
    </label> : <>
      <label className={styles.field} htmlFor="new-password">New password
        <PasswordField ref={passwordRef} aria-invalid={invalid==="password"} id="new-password" name="new-password" type="password" autoComplete="new-password" minLength={6} value={password} onChange={e=>setPassword(e.target.value)} required disabled={busy || !token} aria-describedby={invalid==="password"?"password-guidance recovery-error":"password-guidance"} />
      </label>
      <p id="password-guidance" className={styles.hint}>Use at least 6 characters.</p>
      <label className={styles.field} htmlFor="confirm-password">Confirm password
        <PasswordField ref={confirmationRef} aria-invalid={invalid==="confirmation"} aria-describedby={invalid==="confirmation"?"recovery-error":undefined} id="confirm-password" name="confirm-password" type="password" autoComplete="new-password" minLength={6} value={confirmation} onChange={e=>setConfirmation(e.target.value)} required disabled={busy || !token}/>
      </label>
    </>}
    {resetting && !token && <p role="alert">Open the recovery link from your email, or request a new one.</p>}
    <Button type="submit" disabled={busy || (resetting && !token)}>{busy ? "Please wait…" : resetting ? "Reset password" : "Send recovery link"}</Button>
    {resetting && <Button asChild variant="link"><Link to="/forgot-password">Request a new link</Link></Button>}
    <Button asChild variant="link"><Link to="/login">Back to sign in</Link></Button>
  </form>;
}