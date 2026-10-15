import { useEffect, useState } from "react";
import { useLocation,useNavigate } from "react-router-dom";
import { Helmet } from "react-helmet";
import { FamilyAuthShell } from "../components/FamilyAuthShell";
import { PasswordRecoveryForm } from "../components/PasswordRecoveryForm";
export default function ResetPasswordPage(){
  const location=useLocation(),navigate=useNavigate();
  const [token]=useState(()=>new URLSearchParams(location.hash.slice(1)).get("token") || "");
  useEffect(()=>{if(location.hash)navigate(location.pathname,{replace:true});},[location.hash,location.pathname,navigate]);
  return <><Helmet><title>Reset password · Marquee</title></Helmet><FamilyAuthShell title="Choose a new password" description="This changes Marquee’s password and signs out existing Marquee sessions."><PasswordRecoveryForm token={token}/></FamilyAuthShell></>;
}