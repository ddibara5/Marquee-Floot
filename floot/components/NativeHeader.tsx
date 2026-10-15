import {useEffect,useRef} from "react";
import {NativeNavigation} from "@capgo/capacitor-native-navigation";
import {useAppDark} from "../helpers/useAppDark";

export type NativeHeaderItem={id:string;title:string;symbol:string;enabled?:boolean};
const toNative=({id,title,symbol,enabled=true}:NativeHeaderItem)=>({id,title,enabled,icon:{ios:{sfSymbol:symbol}}});
// base.css --foreground in light and dark, instead of iOS default blue.
const INK={light:"#2a2029",dark:"#fff4ee"};

/** Native iOS navigation bar (Liquid Glass buttons on iOS 26). Rendered by AppShell only while the native tab bar is active.
 * `hideOnScroll`: the bar slides away scrolling down and returns scrolling up (title detail, where nothing sits under it). */
export default function NativeHeader({title,left,right,hidden,hideOnScroll=false,onAction}:{title:string;left:NativeHeaderItem[];right:NativeHeaderItem[];hidden:boolean;hideOnScroll?:boolean;onAction:(id:string)=>void}){
 const latest=useRef(onAction);latest.current=onAction;

 useEffect(()=>{
  const handle=NativeNavigation.addListener("navbarItemTap",({id})=>latest.current(id));
  return()=>{void handle.then(h=>h.remove());void NativeNavigation.setNavbar({hidden:true}).catch(()=>{})};
 },[]);

 const ink=useAppDark()?INK.dark:INK.light;
 // iOS lays right items out from the edge inward, so the first one sits rightmost.
 const key=JSON.stringify([title,left,right,hidden,ink,hideOnScroll]);
 useEffect(()=>{
  void NativeNavigation.setNavbar(hidden?{hidden:true,animated:true}:{hidden:false,animated:true,title,leftItems:left.map(toNative),rightItems:right.map(toNative),colors:{tint:ink,foreground:ink},scrollBehavior:hideOnScroll?"both":"none",resetScrollCollapsed:true}).catch(()=>{});
 },[key]); // eslint-disable-line react-hooks/exhaustive-deps
 return null;
}