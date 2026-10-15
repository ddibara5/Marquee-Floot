import {traktPage,crunchyrollNext,validateEvents,sanitizeImportError,isAuthFailure} from "./marqueeImportPolicy";
import {recentCrunchyrollPlay} from "./crunchyrollAutoMatch";
describe("ingestion guards",()=>{
 const h=(count=100,pages=1,page=1)=>new Headers({"x-pagination-item-count":String(count),"x-pagination-page-count":String(pages),"x-pagination-page":String(page)});
 it("requires every Trakt page header and stable counts",()=>{
 expect(()=>traktPage([],new Headers(),1)).toThrow();
 expect(()=>traktPage([],h(5,2,2),1)).toThrow();
 expect(()=>traktPage([],h(5,2,2),2,{count:6,pages:2})).toThrow();
 expect(traktPage([],h(0,0),1).terminal).toBeTrue();
 expect(()=>traktPage([],h(0,101),1)).toThrow();
 });
 it("rejects foreign, repeated and skipped Crunchyroll pages",()=>{
 expect(crunchyrollNext("?page=2&page_size=20","account1234",1)).toContain("/account1234?");
 expect(crunchyrollNext("?page=eyJjIjoiRzhXVU4xOEU5In0&page_size=20","account1234",1)).toContain("/account1234?");
 for(const next of ["https://evil.example/?page=2","?page=1&page_size=20","?page=3&page_size=20","?page=2&page_size=20#x","/content/v1/watch-history/other?page=2&page_size=20"])expect(()=>crunchyrollNext(next,"account1234",1)).toThrow();
 });
 it("rejects duplicate source evidence and invalid dates",()=>{
 const e={id:"x",date_played:"2026-09-30T01:00:00Z",fully_watched:true};
 expect(()=>validateEvents([e,e])).toThrow();
 expect(()=>validateEvents([{...e,date_played:"invalid"}])).toThrow();
 validateEvents([e]);
 });
 it("never creates dates for historical, repeated or first imports",()=>{
 const now=new Date("2026-09-30T12:00:00Z"),prior=new Date("2026-09-29T09:00:00Z");
 expect(recentCrunchyrollPlay("2026-09-27T12:00:00Z",prior,now,false)).toBeNull();
 expect(recentCrunchyrollPlay("2026-09-30T01:00:00Z",prior,now,true)).toBeNull();
 expect(recentCrunchyrollPlay("2026-09-30T01:00:00Z",null,now,false)).toBeNull();
 expect(recentCrunchyrollPlay("2026-09-30T01:00:00Z",prior,now,false)?.toISOString()).toBe("2026-09-30T01:00:00.000Z");
 });
 it("blocks expired credentials without retrying provider challenges as credential failures",()=>{
 expect(isAuthFailure("TRAKT_CREDENTIAL_RECONNECT_REQUIRED")).toBeTrue();
 expect(isAuthFailure("TRAKT_NOT_CONNECTED")).toBeTrue();
 expect(isAuthFailure("CR_AUTH_HTTP_401")).toBeTrue();
 expect(isAuthFailure("CR_HISTORY_PROVIDER_BLOCKED")).toBeFalse();
 });
 it("does not expose provider bodies or database messages",()=>{
 expect(sanitizeImportError(Error("Authorization: Bearer private"))).toBe("IMPORT_FAILED");
 expect(sanitizeImportError(Error("CR_AUTH_HTTP_401"))).toBe("CR_AUTH_HTTP_401");
 });
});
