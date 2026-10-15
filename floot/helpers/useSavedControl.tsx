import {useRouteViewState} from "./useRouteViewState";
export function useSavedControl<T extends string>(key:string,fallback:T,allowed:readonly T[]){
 const [value,setValue]=useRouteViewState<T>(key,()=>{try{const stored=localStorage.getItem(key);return allowed.includes(stored as T)?stored as T:fallback;}catch{return fallback;}});
 return [value,(next:T)=>{if(!allowed.includes(next))return;setValue(next);try{localStorage.setItem(key,next);}catch{}}] as const;
}