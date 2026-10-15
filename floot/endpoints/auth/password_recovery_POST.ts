import { schema } from "./password_recovery_POST.schema";
import { familyPasswordRecovery } from "../../helpers/familyPasswordRecovery";
import { clearServerSession } from "../../helpers/getSetServerSession";
import { marqueeWriter } from "../../helpers/marqueeWriter";
import { isMigrationWriterError } from "../../helpers/migrationWriter";

async function handleRequest(request:Request){
  try{
    familyPasswordRecovery.sameOrigin(request);
  }catch{
    return Response.json({message:"Open recovery from Marquee."},{status:403,headers:{"Cache-Control":"no-store"}});
  }
  try{
    const body=schema.parse(await request.json());
    const message=body.action==="request"
      ? await familyPasswordRecovery.request(body.email!)
      : (await familyPasswordRecovery.reset(body.token!,body.password!),"Password reset. Sign in with your new password.");
    const response=Response.json({message},{headers:{"Cache-Control":"no-store"}});
    if(body.action==="reset")clearServerSession(response);
    return response;
  }catch(error){
    if(isMigrationWriterError(error))throw error;
    return Response.json({message:"Recovery could not be completed. Request a new link and try again."},{status:400,headers:{"Cache-Control":"no-store"}});
  }
}
export const handle=marqueeWriter.endpoint(handleRequest,"auth/password_recovery_POST.ts");