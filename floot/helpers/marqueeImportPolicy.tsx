export const TRAKT_FEEDS=["history_movies","history_episodes","ratings_movies","ratings_shows","watchlist_movies","watchlist_shows"] as const;
export type ImportSource="trakt"|"crunchyroll"|"anilist";
export type Feed=typeof TRAKT_FEEDS[number];
export function traktPage(body:unknown,headers:Headers,page:number,prior?:{count:number,pages:number}){
 const count=Number(headers.get("x-pagination-item-count")),pages=Number(headers.get("x-pagination-page-count")),current=Number(headers.get("x-pagination-page"));
 if(!Array.isArray(body)||body.length>100||!headers.has("x-pagination-item-count")||!headers.has("x-pagination-page-count")||!headers.has("x-pagination-page")||
 !Number.isSafeInteger(count)||count<0||!Number.isSafeInteger(pages)||pages<0||pages>100||current!==page||
 (pages===0&&count!==0)|| (prior&&(prior.count!==count||prior.pages!==pages))) throw Error("TRAKT_PAGINATION_INVALID");
 return {count,pages,terminal:page>=pages};
}
export function crunchyrollNext(next:unknown,account:string,page:number){
 if(next==null||next==="") return null;
 const path="/content/v1/watch-history/"+account;
 if(typeof next!=="string"||next.includes("#")||!(next.startsWith(path+"?")||next.startsWith("?"))) throw Error("CR_PAGINATION_INVALID");
 const url=new URL(next.startsWith("?")?path+next:next,"https://www.crunchyroll.com");
 const cursor=url.searchParams.get("page");
 if(!cursor||cursor.length>1000||!/^[-A-Za-z0-9_]+={0,2}$/.test(cursor)||(/^\d+$/.test(cursor)&&Number(cursor)!==page+1)||url.origin!=="https://www.crunchyroll.com"||url.pathname!==path||url.searchParams.get("page_size")!=="20") throw Error("CR_PAGINATION_INVALID");
 return url.toString();
}
export function validateEvents(events:unknown){
 if(!Array.isArray(events)||events.length>400) throw Error("CR_WINDOW_INVALID");
 const ids=new Set<string>();
 for(const e of events) {
 if(!e||typeof e.id!=="string"||!e.id||ids.has(e.id)||typeof e.date_played!=="string"||
 !/^\d{4}-\d\d-\d\dT/.test(e.date_played)||!Number.isFinite(Date.parse(e.date_played))||typeof e.fully_watched!=="boolean") throw Error("CR_EVENT_INVALID");
 ids.add(e.id);
 }
}
export function sanitizeImportError(error:unknown){
 const m=error instanceof Error?error.message:"";
 return /^[A-Z][A-Z0-9_]{2,64}$/.test(m)?m:"IMPORT_FAILED";
}
export function isAuthFailure(code:string){return /HTTP_(401|403)$|CREDENTIAL|NOT_CONNECTED/.test(code);}
