import {useEffect,useState} from "react";
export function useSearchTerm(value:string,composing=false,delay=300){
 const [term,setTerm]=useState(value.trim());
 useEffect(()=>{if(composing)return;const timer=setTimeout(()=>setTerm(value.trim()),delay);return()=>clearTimeout(timer);},[value,composing,delay]);
 return value.trim()?term:"";
}