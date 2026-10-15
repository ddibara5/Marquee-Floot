import {marqueeWriter} from "../../helpers/marqueeWriter";
// adapt this to your database schema
import { db } from "../../helpers/db";
import {
  getServerSessionOrThrow,
  clearServerSession,
  NotAuthenticatedError,
} from "../../helpers/getSetServerSession";
import superjson from "superjson";
import {isMigrationWriterError} from "../../helpers/migrationWriter";

export function createPasswordLogout(database:typeof db=db) {
 return async function handleRequest(request: Request) {
  try {
    // Get the current session
    const session = await getServerSessionOrThrow(request);

    // Delete the session from the database
    await database.deleteFrom("sessions").where("id", "=", session.id).execute();

    // Create response with success message
    const response = new Response(
      superjson.stringify({
        success: true,
        message: "Logged out successfully",
      }),
      {
        headers: {
          "Content-Type": "application/json",
        },
      }
    );

    clearServerSession(response);

    return response;
  } catch (error) {
    if(isMigrationWriterError(error))throw error;
    if (error instanceof NotAuthenticatedError) {
      return new Response(
        superjson.stringify({ error: "Not authenticated" }),
        {
          status: 401,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }
    console.error("Logout error:", error);
    return new Response(
      superjson.stringify({
        error: "Logout failed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
}



}
const handleRequest=createPasswordLogout();
export const handle = marqueeWriter.endpoint(handleRequest, "auth/logout_POST.ts", true); 