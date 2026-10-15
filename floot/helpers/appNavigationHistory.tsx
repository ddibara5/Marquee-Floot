export type AppNavigationAction = "PUSH" | "POP" | "REPLACE";
// Router-owned keys work with browser and memory routers. Keep this per-tab,
// not in persistent storage, so a direct/new-tab entry cannot inherit a trail.
export function createAppNavigationHistory() {
 let keys:string[]=[];let cursor=-1;
 return {
  observe(key:string,action:AppNavigationAction){
   if(keys[cursor]===key)return;
   if(cursor<0){keys=[key];cursor=0;return}
   if(action==="REPLACE"){keys[cursor]=key;return}
   if(action==="POP"){const found=keys.indexOf(key);if(found>=0){cursor=found;return}keys=[key];cursor=0;return}
   keys=keys.slice(0,cursor+1);keys.push(key);
   if(keys.length>100)keys.shift();
   cursor=keys.length-1;
  },
  canGoBack(){return cursor>0;}
 };
}
