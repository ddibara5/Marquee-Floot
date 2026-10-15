import { Link,Navigate,useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet";
import { PasswordLoginForm } from "../components/PasswordLoginForm";
import { FamilyAuthShell } from "../components/FamilyAuthShell";
import { Button } from "../components/Button";
import { useAuth } from "../helpers/useAuth";
export default function LoginPage(){
  const [params]=useSearchParams();
  const {authState}=useAuth();
  if(authState.type==="authenticated")return <Navigate to="/" replace/>;
  return <><Helmet><title>Sign in · Marquee</title></Helmet>
    <FamilyAuthShell title="Sign in" description="Your private watch ledger.">
      {params.get("reset")==="complete" && <p role="status">Password reset. Sign in with your new password.</p>}
      <PasswordLoginForm/>
      <Button asChild variant="link"><Link to="/forgot-password">Forgot password?</Link></Button>
    </FamilyAuthShell></>;
}
