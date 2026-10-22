import { useState } from "react";
import { Helmet } from "react-helmet";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "../components/Button";
import { Input } from "../components/Input";
import { Checkbox } from "../components/Checkbox";
import { Skeleton } from "../components/Skeleton";
import { getHouseholdAccounts, type HouseholdAccount } from "../endpoints/household-accounts_GET.schema";
import { postHouseholdAccounts, type InputType } from "../endpoints/household-accounts_POST.schema";
import styles from "./settings.household.module.css";

const KEY = ["marquee", "household-accounts"];

function AccountRow({ account, run, busy }: { account: HouseholdAccount; run: (input: InputType) => void; busy: boolean }) {
 const [password, setPassword] = useState("");
 const kind = account.isOwner ? "Owner" : account.isBot ? "Automation account" : "Member";
 return <div className={styles.account}>
  <div className={styles.who}><strong>{account.displayName || account.email}</strong><small>{account.email}</small><small>{kind}{account.isOwner ? "" : account.canSignIn ? " · can sign in" : " · access revoked"}</small></div>
  {!account.isOwner && <>
   <div className={styles.inline}>
    <Input type="password" aria-label={"New password for " + account.email} placeholder="New password" value={password} autoComplete="new-password" onChange={e => setPassword(e.target.value)} />
    <Button variant="outline" disabled={busy || password.length < 8} onClick={() => { run({ action: "setPassword", userId: account.id, password }); setPassword(""); }}>{account.canSignIn ? "Set password" : "Restore access"}</Button>
   </div>
   {account.canSignIn && <div className={styles.actions}><Button variant="destructive" disabled={busy} onClick={() => run({ action: "revoke", userId: account.id })}>Revoke access</Button></div>}
  </>}
 </div>;
}

export default function HouseholdPage() {
 const client = useQueryClient();
 const accounts = useQuery({ queryKey: KEY, queryFn: getHouseholdAccounts });
 const [form, setForm] = useState({ email: "", displayName: "", password: "", bot: false });
 const [status, setStatus] = useState("");
 const change = useMutation({ mutationFn: postHouseholdAccounts, onSuccess: (_d, input) => {
  setStatus(input.action === "create" ? "Account added." : input.action === "revoke" ? "Access revoked." : "Password saved.");
  if (input.action === "create") setForm({ email: "", displayName: "", password: "", bot: false });
  void client.invalidateQueries({ queryKey: KEY });
 }, onError: () => setStatus("") });
 const run = (input: InputType) => { setStatus(""); change.mutate(input); };
 const list = accounts.data?.accounts ?? [];
 const members = list.filter(a => !a.isBot).length, bots = list.filter(a => a.isBot).length;
 const canAdd = members < 2 || bots < 1;
 return <>
  <Helmet><title>Household access · Marquee</title></Helmet>
  <section className={styles.section}>
   <p className={styles.label}>HOUSEHOLD ACCESS</p>
   <p className={styles.intro}>Sign-up is closed. Add one member with their own watch history, and one automation account that uses your library for nightly checks. Revoke signs an account out everywhere.</p>
   {accounts.isPending ? <Skeleton style={{ height: 120 }} /> : accounts.error ? <p role="alert" className={styles.error}>{accounts.error.message}</p> :
    <div className={styles.list}>{list.map(a => <AccountRow key={a.id} account={a} run={run} busy={change.isPending} />)}</div>}
   {change.error && <p role="alert" className={styles.error}>{change.error.message}</p>}
   {status && <p role="status" className={styles.status}>{status}</p>}
   {accounts.data && canAdd && <form className={styles.form} onSubmit={e => { e.preventDefault(); run({ action: "create", ...form, bot: members >= 2 ? true : bots >= 1 ? false : form.bot }); }}>
    <h2>Add an account</h2>
    <label className={styles.field}>Name<Input value={form.displayName} maxLength={60} onChange={e => setForm(f => ({ ...f, displayName: e.target.value }))} /></label>
    <label className={styles.field}>Email<Input type="email" value={form.email} autoComplete="off" onChange={e => setForm(f => ({ ...f, email: e.target.value }))} /></label>
    <label className={styles.field}>Password (8 or more characters)<Input type="password" value={form.password} autoComplete="new-password" onChange={e => setForm(f => ({ ...f, password: e.target.value }))} /></label>
    {members < 2 && bots < 1 && <label className={styles.check}><Checkbox checked={form.bot} onChange={e => setForm(f => ({ ...f, bot: e.target.checked }))} />Automation account (uses your library)</label>}
    <Button type="submit" disabled={change.isPending || !form.email || !form.displayName || form.password.length < 8}>{change.isPending ? "Saving…" : "Add account"}</Button>
   </form>}
  </section>
 </>;
}