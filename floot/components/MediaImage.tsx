import {useState,type ImgHTMLAttributes} from "react";
import styles from "./MediaImage.module.css";
type Props=ImgHTMLAttributes<HTMLImageElement>&{fallback:string};
// Artwork fades in once it has loaded instead of painting in pieces (October 17, from GameDeck).
export function MediaImage({src,fallback,onError,onLoad,className,...props}:Props){
 // Load state belongs to one src: a new src starts hidden again and gets a fresh chance after an earlier failure.
 const [state,setState]=useState({src,failed:false,loaded:false});
 if(state.src!==src)setState({src,failed:false,loaded:false});
 return src&&!state.failed?<img {...props} className={[styles.image,className].filter(Boolean).join(" ")} data-loaded={state.loaded||undefined} src={src}
  onLoad={event=>{setState(s=>({...s,loaded:true}));onLoad?.(event);}} onError={event=>{setState(s=>({...s,failed:true}));onError?.(event);}}/>:<>{fallback}</>;
}
