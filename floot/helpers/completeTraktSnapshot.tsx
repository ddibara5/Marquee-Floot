import {TRAKT_FEEDS} from "./marqueeImportPolicy";
type Page={feed:string;page:number;metadata:{count:number;pages:number;terminal:boolean};payload:unknown[]};
export function completeTraktSnapshot(staged:Page[]):Record<string,unknown[]> {
 const feeds:Record<string,unknown[]>={};
 if(staged.some(p=>!TRAKT_FEEDS.includes(p.feed as any)))throw Error("TRAKT_UNEXPECTED_FEED");
 for(const feed of TRAKT_FEEDS){
  const pages=staged.filter(p=>p.feed===feed).sort((a,b)=>a.page-b.page),first=pages[0]?.metadata;
  if(!first||!Number.isSafeInteger(first.count)||first.count<0||!Number.isSafeInteger(first.pages)||first.pages<0||first.pages>100||
   (first.pages===0&&first.count!==0)||pages.length!==Math.max(1,first.pages)||
   pages.some((p,i)=>p.page!==i+1||!Array.isArray(p.payload)||p.payload.length>100||
    p.metadata?.count!==first.count||p.metadata?.pages!==first.pages||p.metadata?.terminal!==(i===pages.length-1)))
   throw Error("TRAKT_INCOMPLETE_SNAPSHOT");
  const rows=pages.flatMap(p=>p.payload);
  if(rows.length!==first.count)throw Error("TRAKT_INCOMPLETE_SNAPSHOT");
  feeds[feed]=rows;
 }
 return feeds;
}
