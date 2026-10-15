import {startMarqueeImport} from "./marqueeStart";
export async function syncTraktDaily(){await startMarqueeImport("trakt","live");}
