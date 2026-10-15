import {useState,type ImgHTMLAttributes} from "react";
type Props=ImgHTMLAttributes<HTMLImageElement>&{fallback:string};
export function MediaImage({src,fallback,onError,...props}:Props){
 const [failed,setFailed]=useState(false);
 return src&&!failed?<img {...props} src={src} onError={event=>{setFailed(true);onError?.(event);}}/>:<>{fallback}</>;
}