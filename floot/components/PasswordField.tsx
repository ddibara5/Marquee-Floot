import { forwardRef,useState,type ComponentProps } from "react";
import { Input } from "./Input";
import { Button } from "./Button";
import styles from "./PasswordField.module.css";
export const PasswordField=forwardRef<HTMLInputElement,ComponentProps<typeof Input>>((props,ref)=>{
  const [visible,setVisible]=useState(false);
  return <div className={styles.field}><Input {...props} ref={ref} type={visible?"text":"password"} className={styles.input+" "+(props.className||"")}/>
    <Button type="button" variant="ghost" size="sm" disabled={props.disabled} className={styles.toggle}
      aria-label={visible?"Hide password":"Show password"} aria-pressed={visible} aria-controls={props.id}
      onClick={()=>setVisible(value=>!value)}>{visible?"Hide":"Show"}</Button></div>;
});
PasswordField.displayName="PasswordField";