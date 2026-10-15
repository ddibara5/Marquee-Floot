export function calendarMonths(keys:string[],period:"3"|"12"|"all",now=new Date()){
 const parts=new Intl.DateTimeFormat("en-US",{timeZone:"America/New_York",year:"numeric",month:"2-digit"}).formatToParts(now);
 const year=Number(parts.find(p=>p.type==="year")!.value),month=Number(parts.find(p=>p.type==="month")!.value)-1;
 const end=year*12+month,valid=keys.filter(k=>/^\d{4}-\d{2}$/.test(k)&&Number(k.slice(5))>=1&&Number(k.slice(5))<=12);
 const start=period==="all"?Math.min(end,...valid.map(k=>Number(k.slice(0,4))*12+Number(k.slice(5))-1)):end-Number(period)+1;
 return Array.from({length:Math.max(0,end-start+1)},(_,i)=>{const n=start+i;return Math.floor(n/12)+"-"+String(n%12+1).padStart(2,"0")});
}
export function inCalendarPeriod(date:string,months:string[]){return months.includes(date.slice(0,7));}
