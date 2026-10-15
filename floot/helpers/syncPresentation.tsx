export function nextScheduled(hours:number[],minute:number,zone:string,now=new Date()){
 const fmt=new Intl.DateTimeFormat("en-US",{timeZone:zone,hour:"numeric",hourCycle:"h23"});
 const base=new Date(now);base.setUTCMinutes(minute,0,0);
 for(let i=0;i<50;i++){const date=new Date(base.getTime()+i*3600000);if(date>now&&hours.includes(Number(fmt.format(date))))return date;}
 return null;
}
export function sourceState(c:{mode:string;last_success_at?:string|null;run_id?:string|null;lease_run_id?:string|null;lease_until?:string|null;credential_blocked?:boolean},maxHours=30,now=new Date()){
 if(c.credential_blocked)return "Reconnect";
 if((c.run_id||c.lease_run_id)&&(!c.lease_until||new Date(c.lease_until)>now))return "Running";
 if(c.mode!=="live")return "Paused";
 if(!c.last_success_at||now.getTime()-new Date(c.last_success_at).getTime()>maxHours*3600000)return "Overdue";
 return "Active";
}