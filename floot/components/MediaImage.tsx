import {useState,type ImgHTMLAttributes} from "react";
import styles from "./MediaImage.module.css";
type Props=ImgHTMLAttributes<HTMLImageElement>&{fallback:string};
// Artwork fades in once it has loaded instead of painting in pieces (October 17, from GameDeck).
export function MediaImage({src,fallback,onError,onLoad,className,...props}:Props){
 const [failed,setFailed]=useState(false);
 const [loaded,setLoaded]=useState(false);
 return src&&!failed?<img {...props} className={[styles.image,className].filter(Boolean).join(" ")} data-loaded={loaded||undefined} src={src}
  onLoad={event=>{setLoaded(true);onLoad?.(event);}} onError={event=>{setFailed(true);onError?.(event);}}/>:<>{fallback}</>;
}
