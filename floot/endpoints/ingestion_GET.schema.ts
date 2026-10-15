import superjson from "superjson";
export type IngestionRun={id:string;mode:string;status:string;started_at:string;finished_at:string|null;counts:Record<string,any>;error_code:string|null};
export type SourceHealth={source:string;mode:string;verified_at:string|null;credential_blocked:boolean;retry_after:string|null;last_success_at:string|null;run_id:string|null;latest:IngestionRun|null;history:IngestionRun[]};
export type OutputType={sources:SourceHealth[];monitoring?:{checkedAt:string;issues:string[]}|null};
export async function getIngestionHealth():Promise<OutputType>{
 const response=await fetch("/_api/ingestion");const data=superjson.parse<any>(await response.text());
 if(!response.ok)throw Error(data.error??"Unable to load sync health");return data;
}
