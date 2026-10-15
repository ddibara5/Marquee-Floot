import {useCallback,useLayoutEffect} from "react";
import {useLocation,useNavigate,useNavigationType} from "react-router-dom";
import {createAppNavigationHistory} from "./appNavigationHistory";
const trail=createAppNavigationHistory();
export function useAppBack(fallback:string){
 const navigate=useNavigate(),location=useLocation(),action=useNavigationType();
 useLayoutEffect(()=>{trail.observe(location.key,action)},[location.key,action]);
 return useCallback(()=>{
  trail.observe(location.key,action);
  const index=window.history.state?.idx;
  if(trail.canGoBack()||(typeof index==="number"&&index>0))navigate(-1);
  else navigate(fallback,{replace:true});
 },[navigate,fallback,location.key,action]);
}
