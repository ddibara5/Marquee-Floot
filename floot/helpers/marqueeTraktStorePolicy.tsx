import {MARQUEE_TRAKT_STORE} from "./marqueeDatabaseMode";
export function traktStoreDisposition(store:"dual"|"native",mode:"shadow"|"live"){return {callSupabase:store==="dual",commitSupabase:store==="dual"&&mode==="live",commitNative:mode==="live",archiveStagedEvidence:true};}
export const currentTraktDisposition=(mode:"shadow"|"live")=>traktStoreDisposition(MARQUEE_TRAKT_STORE,mode);
