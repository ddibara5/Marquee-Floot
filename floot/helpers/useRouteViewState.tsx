import {useCallback,useLayoutEffect,useRef,useState,type SetStateAction} from "react";
import {useLocation,useNavigationType} from "react-router-dom";

// Entry-scoped, in-memory only: personal searches never enter storage or shared URLs.
const entries=new Map<string,Map<string,unknown>>();
export function useRouteViewState<T>(name:string,initial:T|(()=>T)){
 const {key}=useLocation(),action=useNavigationType();
 const previous=useRef(key);
 if(!entries.has(key)){
  entries.set(key,action==="REPLACE"&&entries.has(previous.current)?new Map(entries.get(previous.current)):new Map());
  if(entries.size>120)entries.delete(entries.keys().next().value!);
 }
 const entry=entries.get(key)!;
 if(!entry.has(name))entry.set(name,typeof initial==="function"?(initial as ()=>T)():initial);
 const [snapshot,setSnapshot]=useState({key,value:entry.get(name) as T});
 const value=snapshot.key===key?snapshot.value:entry.get(name) as T;
 useLayoutEffect(()=>{previous.current=key;if(snapshot.key!==key)setSnapshot({key,value});},[key,value,snapshot.key]);
 const setValue=useCallback((next:SetStateAction<T>)=>{
  const target=entries.get(key);if(!target)return;
  const current=target.get(name) as T;
  const value=typeof next==="function"?(next as (previous:T)=>T)(current):next;
  target.set(name,value);setSnapshot({key,value});
 },[key,name]);
 return [value,setValue] as const;
}
