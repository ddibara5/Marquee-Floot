import {marqueeWriter} from "../../helpers/marqueeWriter";
// adapt this to the database schema and helpers if necessary
import { db } from "../../helpers/db";
import { schema } from "./register_with_password_POST.schema";
import { randomBytes } from "crypto";
import {
  setServerSession,
  SessionExpirationSeconds,
} from "../../helpers/getSetServerSession";
import { generatePasswordHash } from "../../helpers/generatePasswordHash";
import superjson from "superjson";
import {sql} from "kysely";
import {isMigrationWriterError} from "../../helpers/migrationWriter";

export function createPasswordRegistration(database:typeof db=db){
 return async function handleRequest(request: Request) {
  try {
    const json = superjson.parse(await request.text());
    const { email, password, displayName } = schema.parse(json);

    const passwordHash=await generatePasswordHash(password);
    const sessionId=randomBytes(32).toString("hex"),now=new Date();
    const expiresAt=new Date(now.getTime()+SessionExpirationSeconds*1000);
    const newUser=await database.transaction().execute(async trx=>{
      await sql`select pg_advisory_xact_lock(hashtextextended(${email.toLowerCase()},0))`.execute(trx);
      const existing=await trx.selectFrom("users").select("id")
        .where(sql`lower(users.email)`,"=",email.toLowerCase()).executeTakeFirst();
      if(existing)return null;
      const user=await trx.insertInto("users").values({email,displayName,role:"user"})
        .returning(["id","email","displayName","createdAt"]).executeTakeFirstOrThrow();
      await trx.insertInto("userPasswords").values({userId:user.id,passwordHash}).execute();
      await trx.insertInto("sessions").values({id:sessionId,userId:user.id,createdAt:now,lastAccessed:now,expiresAt}).execute();
      return user;
    });
    if(!newUser)return new Response(superjson.stringify({message:"email already in use"}),{status:409,headers:{"Content-Type":"application/json"}});
    // Create response with user data
    const response = new Response(
      superjson.stringify({
        user: {
          ...newUser,
          role: "user" as const,
        },
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    // Set session cookie
    await setServerSession(response, {
      id: sessionId,
      createdAt: now.getTime(),
      lastAccessed: now.getTime(),
    });

    return response;
  } catch (error: unknown) {
    if(isMigrationWriterError(error))throw error;
    console.error("Registration error:", error);
    const errorMessage =
      error instanceof Error ? error.message : "Registration failed";
    return new Response(
      superjson.stringify({ message: errorMessage }),
      {
        status: 400,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}



}
const handleRequest=createPasswordRegistration();
export const handle = marqueeWriter.endpoint(handleRequest, "auth/register_with_password_POST.ts", true); 