import {completeTraktSnapshot} from "./completeTraktSnapshot";
import {TRAKT_FEEDS} from "./marqueeImportPolicy";
describe("complete rollback snapshot",()=>{
 const empty=()=>TRAKT_FEEDS.map(feed=>({feed,page:1,metadata:{count:0,pages:0,terminal:true},payload:[]}));
 it("accepts a complete empty six-feed snapshot",()=>expect(Object.keys(completeTraktSnapshot(empty())).length).toBe(6));
 it("rejects a missing feed before writes",()=>expect(()=>completeTraktSnapshot(empty().slice(1))).toThrow());
 it("rejects extra feeds",()=>expect(()=>completeTraktSnapshot([...empty(),{...empty()[0],feed:"other"}])).toThrow());
 it("rejects duplicate pages even with matching counts",()=>expect(()=>completeTraktSnapshot([...empty(),empty()[0]])).toThrow());
 it("rejects an early terminal marker",()=>{const p:any[]=empty();p[0]={...p[0],metadata:{count:1,pages:2,terminal:true},payload:[{id:1}]};p.push({...p[0],page:2,payload:[]});expect(()=>completeTraktSnapshot(p)).toThrow();});
 it("rejects missing advertised pages",()=>{const p=empty();p[0].metadata.pages=2;expect(()=>completeTraktSnapshot(p)).toThrow();});
 it("rejects count changes",()=>{const p=empty();p[0].metadata.count=1;expect(()=>completeTraktSnapshot(p)).toThrow();});
 it("accepts reordered complete pages and preserves provider dates",()=>{const p:any[]=empty();p[0]={...p[0],metadata:{count:1,pages:1,terminal:true},payload:[{id:1,watched_at:"1999-01-02T03:04:05Z"}]};expect((completeTraktSnapshot(p.reverse()).history_movies[0] as any).watched_at).toBe("1999-01-02T03:04:05Z");});
});
