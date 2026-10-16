import {useCallback,useEffect,useLayoutEffect,useRef} from "react";
import type {RefObject} from "react";

/** Page motion for the phone page stack (October 16, mockup https://claude.ai/artifact/J7N4vkbvpcPEdWNE6hLGC1, Idea 1).
 *  On any subpage, a swipe from the left edge slides the page away with the thumb while the real page under it eases
 *  in; Back does the same slide. Opening a subpage is the same motion forward, like an iOS push: the new page slides in
 *  from the right while the page it covers shifts left and dims (a short fade under Reduce Motion).
 *  Ported from GameDeck on October 16 (App Studio layout-navigation.md, "Page stack: opening and Back"). `canLeave`
 *  runs before a swipe completes. Marquee's pages are see-through over the fixed sky backdrop (`seeThrough`): while a page
 *  moves, the page under it and the dim are clipped to the strip left of its edge, so nothing shows through it.
 *  Layers are the AppShell sections marked data-page-layer ("top" and "under"); styles here are inline and are
 *  cleared after every navigation. */
const EASE="cubic-bezier(.2,.8,.2,1)";
const SLIDE_MS=220,IN_MS=350,IN_EASE="cubic-bezier(.32,.72,0,1)";
const KEYS=["transform","transition","visibility","opacity","boxShadow","willChange","minHeight","clipPath"] as const;
type Layers={top:HTMLElement;under:HTMLElement|null;dim:HTMLElement|null};

function findLayers(panel:HTMLElement|null):Layers|null{
 const top=panel?.querySelector<HTMLElement>('[data-page-layer="top"]');
 if(!panel||!top)return null;
 const unders=panel.querySelectorAll<HTMLElement>('[data-page-layer="under"]');
 return {top,under:unders[unders.length-1]??null,dim:panel.querySelector<HTMLElement>("[data-page-dim]")};
}
function clear(el:HTMLElement|null){if(el)for(const key of KEYS)el.style[key]=""}
const reducedMotion=()=>typeof matchMedia!=="undefined"&&matchMedia("(prefers-reduced-motion: reduce)").matches;
function blocked(target:EventTarget|null){
 return Boolean(document.querySelector('[data-ui-overlay][data-state="open"],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]')||(target instanceof Element&&target.closest('input,textarea,select,[contenteditable="true"]')));
}

export function usePageGestures({stack,swipe,routeKey,panel,onBack,canLeave,seeThrough=false}:{
 stack:boolean;swipe:boolean;routeKey:string;panel:RefObject<HTMLElement|null>;onBack:()=>void;canLeave?:()=>boolean;seeThrough?:boolean;
}){
 const clip=useRef(seeThrough);clip.current=seeThrough;
 const latest=useRef(onBack);latest.current=onBack;
 const leave=useRef(canLeave);leave.current=canLeave;
 const busy=useRef(false),run=useRef(0);
 const timers=useRef<number[]>([]);
 const later=(fn:()=>void,ms:number)=>{timers.current.push(window.setTimeout(fn,ms))};
 useEffect(()=>()=>{timers.current.forEach(clearTimeout)},[]);

 // Every navigation: the new top page starts clean.
 useLayoutEffect(()=>{
  if(!stack)return;
  panel.current?.querySelectorAll<HTMLElement>("[data-page-layer],[data-page-dim]").forEach(clear);
  busy.current=false;run.current++;
 },[routeKey,stack,panel]);

 const begin=(L:Layers)=>{
  for(const el of [L.top,L.under,L.dim])if(el)el.style.transition="none";
  L.top.style.willChange="transform";
  const r=L.top.getBoundingClientRect();
  if(r.bottom<innerHeight)L.top.style.minHeight=Math.ceil(innerHeight-r.top)+"px";
  if(L.under)L.under.style.visibility="visible";
 };
 const pose=(L:Layers,dx:number)=>{
  const p=Math.min(1,dx/innerWidth);
  L.top.style.transform="translate3d("+dx+"px,0,0)";
  L.top.style.boxShadow="-14px 0 28px rgba(0,0,0,.35)";
  if(L.under)L.under.style.transform="translate3d("+(-0.3*innerWidth*(1-p))+"px,0,0)";
  if(L.dim)L.dim.style.opacity=String(0.3*(1-p));
  if(clip.current){
   const shift=-0.3*innerWidth*(1-p);
   if(L.under)L.under.style.clipPath="inset(0 "+Math.max(0,L.under.offsetWidth-(dx-shift)).toFixed(1)+"px 0 0)";
   if(L.dim)L.dim.style.clipPath="inset(0 "+Math.max(0,innerWidth-dx).toFixed(1)+"px 0 0)";
  }
 };
 // The clip moves with the same timing as the page, so the two never drift apart.
 const motion=(L:Layers,ms:number,ease:string)=>{
  const t="transform "+ms+"ms "+ease,c=clip.current?",clip-path "+ms+"ms "+ease:"";
  L.top.style.transition=t;if(L.under)L.under.style.transition=t+c;if(L.dim)L.dim.style.transition="opacity "+ms+"ms ease"+c;
 };
 const settle=(L:Layers,done:boolean)=>{
  motion(L,SLIDE_MS,EASE);
  pose(L,done?innerWidth:0);
  if(done){busy.current=true;later(()=>latest.current(),SLIDE_MS)}
  else later(()=>{if(!busy.current){clear(L.top);clear(L.under);clear(L.dim)}},SLIDE_MS);
 };
 const slideBack=useCallback(()=>{
  const L=findLayers(panel.current);
  if(!L||busy.current||reducedMotion()){if(!busy.current)latest.current();return}
  begin(L);pose(L,0);void L.top.getBoundingClientRect();settle(L,true);
 },[panel]);

 const slideIn=useCallback(()=>{
  const L=findLayers(panel.current);
  if(!L?.under)return;
  const gen=run.current,done=(ms:number)=>later(()=>{if(run.current!==gen)return;busy.current=false;clear(L.top);clear(L.under);clear(L.dim)},ms);
  busy.current=true;
  if(reducedMotion()){
   L.top.style.transition="none";L.top.style.opacity="0";void L.top.getBoundingClientRect();
   L.top.style.transition="opacity 150ms ease";L.top.style.opacity="1";done(150);return;
  }
  begin(L);pose(L,innerWidth);
  // Start once the new page has painted: a heavy first render would otherwise eat the start of the slide.
  requestAnimationFrame(()=>requestAnimationFrame(()=>{
   if(run.current!==gen)return;
   motion(L,IN_MS,IN_EASE);
   pose(L,0);done(IN_MS);
  }));
 },[panel]);

 useEffect(()=>{
  if(!stack||!swipe)return;
  let start:{x:number;y:number;t:number;moving:boolean;L:Layers}|null=null;
  let dx=0,dy=0;
  const down=(e:TouchEvent)=>{
   start=null;
   if(busy.current||e.touches.length!==1||blocked(e.target))return;
   const t=e.touches[0];
   if(t.clientX>28)return;
   const L=findLayers(panel.current);if(!L)return;
   start={x:t.clientX,y:t.clientY,t:performance.now(),moving:false,L};dx=dy=0;
  };
  const move=(e:TouchEvent)=>{
   if(!start||e.touches.length!==1)return;
   const t=e.touches[0];dx=t.clientX-start.x;dy=t.clientY-start.y;
   if(!start.moving){
    if(dx>12&&dx>Math.abs(dy)*1.2){start.moving=true;begin(start.L)}
    else if(Math.abs(dx)>12||Math.abs(dy)>12){start=null;return}
    else return;
   }
   e.preventDefault();
   pose(start.L,Math.max(0,Math.min(innerWidth,dx)));
  };
  // Back past 76px, or past 46px on a quick flick; anything less springs back.
  const up=()=>{const s=start;start=null;if(!s?.moving)return;const done=dx>76||(dx>46&&performance.now()-s.t<240);settle(s.L,done&&(leave.current?.()??true))};
  const cancel=()=>{const s=start;start=null;if(s?.moving)settle(s.L,false)};
  document.addEventListener("touchstart",down,{passive:true});
  document.addEventListener("touchmove",move,{passive:false});
  document.addEventListener("touchend",up,{passive:true});
  document.addEventListener("touchcancel",cancel,{passive:true});
  return()=>{
   document.removeEventListener("touchstart",down);document.removeEventListener("touchmove",move);
   document.removeEventListener("touchend",up);document.removeEventListener("touchcancel",cancel);
  };
 },[stack,swipe,panel]);

 return {slideBack,slideIn};
}
