import {useLayoutEffect,type RefObject} from "react";
import {useLocation,useNavigationType} from "react-router-dom";
type Position={y:number;focus:string|null;focusKey?:string|null};
const positions=new Map<string,Position>();
export function useRouteRestoration(panel:RefObject<HTMLElement|null>){
 const {key}=useLocation(),action=useNavigationType();
 useLayoutEffect(()=>{
  const saved=action==="POP"?positions.get(key):undefined;
  let restoring=Boolean(saved),frame=0;
  let resize:ResizeObserver|undefined,mutations:MutationObserver|undefined;
  const previousMode=window.history.scrollRestoration;
  window.history.scrollRestoration="manual";
  const remember=()=>{
   if(restoring)return;
   const active=document.activeElement;
   const focus=active instanceof HTMLAnchorElement?active.getAttribute("href"):null;
   const prior=positions.get(key);
   positions.set(key,{y:window.scrollY,focus:focus??prior?.focus??null,focusKey:focus?active?.getAttribute("data-restore-focus")??null:prior?.focusKey??null});
   if(positions.size>120)positions.delete(positions.keys().next().value!);
  };
  const stopObserving=()=>{resize?.disconnect();mutations?.disconnect();};
  const restore=()=>{
   // Keep waiting for delayed list pages rather than overwriting the saved position with a clamped scroll.
   const ready=!saved||document.documentElement.scrollHeight-window.innerHeight>=saved.y||Boolean(panel.current?.querySelector('[role="alert"]'));
   window.scrollTo({top:saved?.y??0,behavior:"instant"});
   if(!ready)return;
   if(saved?.focus){
    const links=Array.from(panel.current?.querySelectorAll<HTMLAnchorElement>("a[href]")??[]);
    const link=saved.focusKey?links.find(el=>el.getAttribute("data-restore-focus")===saved.focusKey):links.find(el=>el.getAttribute("href")===saved.focus);
    link?.focus({preventScroll:true});
   }else if(action!=="POP"){
    const heading=panel.current?.querySelector<HTMLElement>("h1,h2");
    if(heading){heading.setAttribute("tabindex","-1");heading.focus({preventScroll:true});}
   }
   restoring=false;stopObserving();remember();
  };
  const schedule=()=>{if(!restoring)return;cancelAnimationFrame(frame);frame=requestAnimationFrame(restore);};
  if(saved){
   if(typeof ResizeObserver!=="undefined"){resize=new ResizeObserver(schedule);resize.observe(document.documentElement);}
   mutations=new MutationObserver(schedule);if(panel.current)mutations.observe(panel.current,{childList:true,subtree:true});
  }
  frame=requestAnimationFrame(restore);
  const cancelRestore=()=>{restoring=false;cancelAnimationFrame(frame);stopObserving();remember();};
  const cancelKey=(event:KeyboardEvent)=>{if(["Tab","ArrowUp","ArrowDown","PageUp","PageDown","Home","End"].includes(event.key))cancelRestore();};
  const rememberLink=(event:MouseEvent)=>{
   if(restoring)cancelRestore();remember();
   const link=event.target instanceof Element?event.target.closest<HTMLAnchorElement>("a[href]"):null;
   if(link&&panel.current?.contains(link))positions.set(key,{y:window.scrollY,focus:link.getAttribute("href"),focusKey:link.getAttribute("data-restore-focus")});
  };
  window.addEventListener("scroll",remember,{passive:true});
  document.addEventListener("focusin",remember);
  document.addEventListener("click",rememberLink,true);
  window.addEventListener("wheel",cancelRestore,{passive:true});
  window.addEventListener("touchstart",cancelRestore,{passive:true});
  document.addEventListener("keydown",cancelKey);
  return ()=>{
   cancelAnimationFrame(frame);stopObserving();
   window.removeEventListener("scroll",remember);document.removeEventListener("focusin",remember);
   document.removeEventListener("click",rememberLink,true);window.removeEventListener("wheel",cancelRestore);
   window.removeEventListener("touchstart",cancelRestore);document.removeEventListener("keydown",cancelKey);
   window.history.scrollRestoration=previousMode;
  };
 },[key,action,panel]);
}
