export function shouldHandlePageBack(event:KeyboardEvent){
 if(event.key!=="Escape"||event.defaultPrevented||event.isComposing)return false;
 // Radix portals are outside the shell. A topmost layer owns Escape and gestures.
 if(document.querySelector('[data-ui-overlay][data-state="open"],[role="dialog"],[role="alertdialog"],[role="menu"],[role="listbox"]'))return false;
 const target=event.target;
 return !(target instanceof Element&&target.closest('input,textarea,select,[contenteditable="true"]'));
}
