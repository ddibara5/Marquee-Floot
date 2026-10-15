import { Helmet } from "react-helmet";
import { FamilyAuthShell } from "../components/FamilyAuthShell";
import { PasswordRecoveryForm } from "../components/PasswordRecoveryForm";
export default function ForgotPasswordPage(){
  return <><Helmet><title>Recover account · Marquee</title></Helmet><FamilyAuthShell title="Recover your account" description="Enter your owner email to reset your Marquee password."><PasswordRecoveryForm/></FamilyAuthShell></>;
}