import {useEffect,useState} from "react";

/** True while the app shows its dark palette (body.dark), whatever chose it. Native bars use this to match the page. */
export function useAppDark(){
 const read=()=>typeof document!=="undefined"&&Boolean(document.body?.classList.contains("dark"));
 const [dark,setDark]=useState(read);
 useEffect(()=>{
  if(typeof MutationObserver==="undefined"||!document.body)return;
  const update=()=>setDark(read());update();
  const observer=new MutationObserver(update);observer.observe(document.body,{attributes:true,attributeFilter:["class"]});
  return()=>observer.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[]);
 return dark;
}

const OPEN_DIALOG='[role="dialog"][data-state="open"],[role="alertdialog"][data-state="open"]';

/** True while a sheet or dialog is open. Native bars sit above the web view, so they step aside then. */
export function useDialogOpen(enabled:boolean){
 const [open,setOpen]=useState(false);
 useEffect(()=>{
  if(!enabled||typeof MutationObserver==="undefined"||!document.body)return;
  const update=()=>setOpen(Boolean(document.querySelector(OPEN_DIALOG)));update();
  const observer=new MutationObserver(update);
  observer.observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:["data-state"]});
  return()=>{observer.disconnect();setOpen(false)};
 },[enabled]);
 return open;
}