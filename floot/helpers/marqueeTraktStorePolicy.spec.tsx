import {traktStoreDisposition} from "./marqueeTraktStorePolicy";
describe("Marquee database transition",()=>{
 it("retains staged evidence while live native mode performs no Supabase call",()=>{expect(traktStoreDisposition("native","live")).toEqual({callSupabase:false,commitSupabase:false,commitNative:true,archiveStagedEvidence:true});});
 it("native shadow performs no committed writes",()=>{const d=traktStoreDisposition("native","shadow");expect(d.callSupabase).toBeFalse();expect(d.commitSupabase).toBeFalse();expect(d.commitNative).toBeFalse();});
 it("keeps current dual-store live disposition explicit",()=>{expect(traktStoreDisposition("dual","live").commitSupabase).toBeTrue();});
});