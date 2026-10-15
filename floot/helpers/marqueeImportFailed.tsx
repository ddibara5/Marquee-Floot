import {failImport} from "./marqueeImportState";
export async function marqueeImportFailed(input:{payload:{runId?:string},timedOut?:boolean}){
 if(input.payload?.runId)await failImport(input.payload.runId,Error(input.timedOut?"TASK_TIMEOUT":"TASK_TERMINAL_FAILURE"));
}
