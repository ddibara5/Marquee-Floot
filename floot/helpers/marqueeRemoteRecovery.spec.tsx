import {createMarqueeRemoteRecovery} from "./marqueeRemoteRecovery";
import {TRAKT_FEEDS} from "./marqueeImportPolicy";
function fixture(kind:"legacy-table"|"runtime"="legacy-table"){
 const calls:string[]=[],receipts=new Map<string,any>();let wrong=false,failBinding=false,failMarker=false;
 const unsafe=async(q:string,args?:any[])=>{
  calls.push(q);
  if(q.includes(".control"))return [{mode:"paused",valid:true}];
  if(q.includes(".writer_leases"))return [];
  if(q.includes(".verify_binding()")){if(failBinding)throw Error("LIVE_SHAPE_DRIFT");return [];}
  if(q.includes("select r.logical_name"))return [{logical_name:"marquee_titles",path:wrong?"public.wrong":"public.marquee_titles"}];
  if(q.includes("select snapshot_sha256"))return receipts.has(args![0])?[receipts.get(args![0])]:[];
  if(q.includes("marquee_trakt_apply_snapshot"))return [{result:{inserted:0}}];
  if(q.includes("insert into"))receipts.set(args![0],{snapshot_sha256:args![1],result:args![2]});
  return [];
 };
 const remote:any={unsafe,json:(x:any)=>x,begin:async(fn:any)=>fn(remote)};
 let markers=0;
 const recover=createMarqueeRemoteRecovery({remote,functionSchema:"public",receiptSchema:"source_barrier",barrier:"source_barrier",remoteBarrierKind:kind,
  bindings:{marquee_titles:"public.marquee_titles"},approved:{},requireNativeFrozen:async()=>{},
  withNativeFrozen:async(fn)=>fn(),markRecovered:async()=>{if(failMarker)throw Error("ACK_FAILED");markers++;}});
 const run={id:"11111111-1111-4111-8111-111111111111",counts:{store:"native",flootCommitted:true}};
 const pages=TRAKT_FEEDS.map(feed=>({feed,page:1,payload:[],metadata:{count:0,pages:0,terminal:true}}));
 return {recover,run,pages,calls,wrong:()=>{wrong=true;},drift:()=>{failBinding=true;},markerFailure:(v:boolean)=>{failMarker=v;},markers:()=>markers};
}
describe("Marquee recovery against reviewed live table barrier",()=>{
 it("uses live shape/binding verification without assuming a source lease table",async()=>{
  const f=fixture();const r=await f.recover(f.run,f.pages);
  expect(r.replayed).toBe(false);expect(f.markers()).toBe(1);
  expect(f.calls.filter(q=>q.includes("verify_binding()")).length).toBe(2);
  expect(f.calls.some(q=>q.includes("writer_leases"))).toBe(false);
  expect(f.calls.some(q=>q.includes("require_binding"))).toBe(false);
  expect(f.calls.some(q=>q.includes("quote_ident(n.nspname)")&&q.includes("pg_namespace"))).toBe(true);
 });
 it("rejects an unexpected physical registry before disabling gates or applying",async()=>{
  const f=fixture();f.wrong();await expectAsync(f.recover(f.run,f.pages)).toBeRejectedWithError("RECOVERY_BINDINGS_INVALID");
  expect(f.calls.some(q=>q.includes("disable trigger")||q.includes("marquee_trakt_apply_snapshot"))).toBe(false);
 });
 it("propagates reviewed live shape drift before recovery writes",async()=>{
  const f=fixture();f.drift();await expectAsync(f.recover(f.run,f.pages)).toBeRejectedWithError("LIVE_SHAPE_DRIFT");
  expect(f.calls.some(q=>q.includes("marquee_trakt_apply_snapshot"))).toBe(false);
 });
 it("repairs a failed native acknowledgement from the durable remote receipt",async()=>{
  const f=fixture();f.markerFailure(true);await expectAsync(f.recover(f.run,f.pages)).toBeRejectedWithError("ACK_FAILED");
  f.markerFailure(false);const r=await f.recover(f.run,f.pages);
  expect(r.replayed).toBe(true);expect(f.markers()).toBe(1);
  expect(f.calls.filter(q=>q.includes("marquee_trakt_apply_snapshot")).length).toBe(1);
 });
 it("retains runtime barrier lease and binding checks for existing rehearsal callers",async()=>{
  const f=fixture("runtime");await f.recover(f.run,f.pages);
  expect(f.calls.some(q=>q.includes("writer_leases"))).toBe(true);
  expect(f.calls.filter(q=>q.includes("require_binding")).length).toBe(2);
  expect(f.calls.some(q=>q.includes("verify_binding()"))).toBe(false);
 });
});
