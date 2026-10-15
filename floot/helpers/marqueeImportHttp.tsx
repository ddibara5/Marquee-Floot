export async function importHttp(url:string,init:RequestInit={},stage="PROVIDER",canRetry=true){
 for(let attempt=0;attempt<2;attempt++){
 let response:Response;
 try{response=await fetch(url,{...init,signal:AbortSignal.timeout(25000)});}
 catch{if(attempt===0&&canRetry)continue;throw Error(stage+"_TRANSPORT_FAILED");}
 if(response.status===403&&(response.headers.get("cf-mitigated")==="challenge"||response.headers.get("content-type")?.includes("text/html")))throw Error(stage+"_PROVIDER_BLOCKED");
 if(response.status===429) throw Error(stage+"_HTTP_429");
 if(!response.ok){if(response.status>=500&&attempt===0&&canRetry)continue;throw Error(stage+"_HTTP_"+response.status);}
 return response;
 }
 throw Error(stage+"_TRANSPORT_FAILED");
}
