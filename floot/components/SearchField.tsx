import {useRef,type InputHTMLAttributes} from "react";
import {Search,X} from "lucide-react";
import {Input} from "./Input";
import styles from "./SearchField.module.css";
type Props=Omit<InputHTMLAttributes<HTMLInputElement>,"value"|"onChange"|"onCompositionStart"|"onCompositionEnd"> & {
 value:string;onValueChange:(value:string)=>void;onCompositionChange?:(composing:boolean)=>void;onSubmitSearch?:()=>void;
};
export function SearchField({value,onValueChange,onCompositionChange,onSubmitSearch,className,...props}:Props){
 const input=useRef<HTMLInputElement>(null);
 return <div className={`${styles.field} ${className??""}`}>
  <Search size={17} aria-hidden="true" className={styles.icon}/>
  <Input {...props} ref={input} type="search" value={value}
   onChange={event=>onValueChange(event.target.value)}
   onCompositionStart={()=>onCompositionChange?.(true)}
   onCompositionEnd={()=>onCompositionChange?.(false)}
   onKeyDown={event=>{props.onKeyDown?.(event);if(event.defaultPrevented)return;if(event.key==="Enter"&&!event.nativeEvent.isComposing){event.preventDefault();onSubmitSearch?.();}}}/>
  {value&&<button type="button" className={styles.clear} aria-label="Clear search"
   onClick={()=>{onCompositionChange?.(false);onValueChange("");input.current?.focus();}}><X size={17} aria-hidden="true"/></button>}
 </div>;
}
