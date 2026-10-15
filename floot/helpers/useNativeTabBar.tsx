import {useEffect,useRef,useState} from "react";
import {useNavigate} from "react-router-dom";
import {Capacitor} from "@capacitor/core";
import {NativeNavigation} from "@capgo/capacitor-native-navigation";
import {useMediaQuery} from "./useMediaQuery";
import {useAppDark} from "./useAppDark";

// AppShell.module.css switches to the sidebar at 900px; the native bar only replaces the phone bar.
const SIDEBAR_SHELL="(min-width:900px)";
// base.css --primary in light and dark (Grid: deep teal on silver, cyan on night).
export const NATIVE_TINT={light:"#0a7a96",dark:"#48e5ff"};
export const SEARCH_TAB="/library?view=titles";
// Apple HIG: filled symbols in tab bars. Unknown names render blank, so only long-standing SF Symbols.
const SYMBOLS:Record<string,string>={"/":"house.fill","/library":"clock.arrow.circlepath","/watchlist":"bookmark.fill","/insights":"chart.bar.fill",[SEARCH_TAB]:"magnifyingglass"};
export type NativeTab={to:string;label:string;role?:"search"};

export const nativeNavigationSupported=()=>Capacitor.getPlatform()==="ios"&&Capacitor.isPluginAvailable("NativeNavigation");

/** Native iOS tab bar (Liquid Glass on iOS 26) for the phone shell. Returns true while it replaces the web bar.
 * `hidden` is for open sheets and dialogs only (HIG: keep the tab bar visible between sections).
 * `subpage` lets a tap on the highlighted tab return to that tab's root. Ported from GameDeck, October 15. */
export function useNativeTabBar(tabs:NativeTab[],selectedId:string|undefined,hidden:boolean,subpage:boolean){
 const navigate=useNavigate();
 const sidebarShell=useMediaQuery(SIDEBAR_SHELL);
 const dark=useAppDark();
 const [failed,setFailed]=useState(false);
 const active=nativeNavigationSupported()&&!sidebarShell&&!failed;
 // role "search" is iOS 26's detached round Liquid Glass button beside the tab capsule.
 const nativeTabs=tabs.map(({to,label,role})=>{const symbol=SYMBOLS[to]??"circle.fill";return{id:to,title:label,icon:{ios:{sfSymbol:symbol}},selectedIcon:{ios:{sfSymbol:symbol}},...(role?{role}:{})}});
 const tabsKey=JSON.stringify(nativeTabs);
 // Refs keep the listener keyed on `active` only; React Router's navigate changes on every route.
 const latest=useRef({selectedId,navigate,subpage});latest.current={selectedId,navigate,subpage};

 useEffect(()=>{
  if(!active)return;
  const handle=NativeNavigation.addListener("tabSelect",({id})=>{const now=latest.current;if(id!==now.selectedId||now.subpage)now.navigate(id)});
  return()=>{void handle.then(h=>h.remove());void NativeNavigation.setTabbar({tabs:nativeTabs,hidden:true,animated:true}).catch(()=>{})};
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active]);

 useEffect(()=>{
  if(!active)return;
  // Full tabs every call: the plugin treats a call without tabs as "remove the bar".
  NativeNavigation.setTabbar({tabs:nativeTabs,selectedId,hidden,animated:true,colors:{tint:dark?NATIVE_TINT.dark:NATIVE_TINT.light}}).catch(()=>setFailed(true));
  // eslint-disable-next-line react-hooks/exhaustive-deps
 },[active,selectedId,hidden,dark,tabsKey]);

 return active;
}