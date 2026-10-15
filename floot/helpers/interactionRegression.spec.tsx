import {cleanup,fireEvent,render,screen,act} from "@testing-library/react";
import {MemoryRouter,Route,Routes,useNavigate} from "react-router-dom";
import {useState} from "react";
import {useRouteViewState} from "./useRouteViewState";
import {shouldHandlePageBack} from "./shouldHandlePageBack";
import {useSearchTerm} from "./useSearchTerm";
import {SearchField} from "../components/SearchField";
function List(){
 const [query,setQuery]=useRouteViewState("test-query","");
 const [count,setCount]=useRouteViewState("test-count",12);
 const navigate=useNavigate();
 return <><input aria-label="Filter" value={query} onChange={event=>setQuery(event.target.value)}/><output>{count}</output><button onClick={()=>setCount(n=>n+12)}>More</button><button onClick={()=>navigate("/detail")}>Detail</button><button onClick={()=>navigate("/list")}>Fresh list</button></>;
}
function Detail(){const navigate=useNavigate();return <button onClick={()=>navigate(-1)}>Back</button>;}
function Search(){const [value,setValue]=useState("");const [composing,setComposing]=useState(false);const term=useSearchTerm(value,composing);return <><SearchField aria-label="Search titles" value={value} onValueChange={setValue} onCompositionChange={setComposing}/><output aria-label="Remote term">{term}</output></>;}
describe("Interaction regression",()=>{
 afterEach(()=>cleanup());
 it("restores typed search and loaded count on Back but gives a new list entry fresh state",()=>{
  render(<MemoryRouter initialEntries={[{pathname:"/list",key:crypto.randomUUID()}]}><Routes><Route path="/list" element={<List/>}/><Route path="/detail" element={<Detail/>}/></Routes></MemoryRouter>);
  fireEvent.change(screen.getByLabelText("Filter"),{target:{value:"Dune"}});
  fireEvent.click(screen.getByText("More"));fireEvent.click(screen.getByText("Detail"));fireEvent.click(screen.getByText("Back"));
  expect((screen.getByLabelText("Filter") as HTMLInputElement).value).toBe("Dune");expect(screen.getByText("24")).toBeTruthy();
  fireEvent.click(screen.getByText("Fresh list"));
  expect((screen.getByLabelText("Filter") as HTMLInputElement).value).toBe("");expect(screen.getByText("12")).toBeTruthy();
 });
 it("clears immediately, preserves input focus, and waits for composition before remote search",async()=>{
  render(<Search/>);const input=screen.getByLabelText("Search titles");
  fireEvent(input,new input.ownerDocument.defaultView!.CompositionEvent("compositionstart",{bubbles:true}));fireEvent.change(input,{target:{value:"映画"}});
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,330));});
  expect(screen.getByLabelText("Remote term").textContent).toBe("");
  fireEvent(input,new input.ownerDocument.defaultView!.CompositionEvent("compositionend",{bubbles:true}));
  await act(async()=>{await new Promise(resolve=>setTimeout(resolve,330));});
  expect(screen.getByLabelText("Remote term").textContent).toBe("映画");
  fireEvent.click(screen.getByLabelText("Clear search"));
  expect((input as HTMLInputElement).value).toBe("");expect(document.activeElement).toBe(input);expect(screen.getByLabelText("Remote term").textContent).toBe("");
 });
 it("respects inputs, overlays and already-handled Escape",()=>{
  const input=document.createElement("input");document.body.append(input);const event=new KeyboardEvent("keydown",{key:"Escape",bubbles:true,cancelable:true});input.dispatchEvent(event);expect(shouldHandlePageBack(event)).toBeFalse();input.remove();
  const overlay=document.createElement("div");overlay.dataset.uiOverlay="";overlay.dataset.state="open";document.body.append(overlay);expect(shouldHandlePageBack(new KeyboardEvent("keydown",{key:"Escape"}))).toBeFalse();overlay.remove();
  const handled=new KeyboardEvent("keydown",{key:"Escape",cancelable:true});handled.preventDefault();expect(shouldHandlePageBack(handled)).toBeFalse();expect(shouldHandlePageBack(new KeyboardEvent("keydown",{key:"Escape"}))).toBeTrue();
 });
});
