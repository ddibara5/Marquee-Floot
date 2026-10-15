import {act,cleanup,fireEvent,render,screen} from "@testing-library/react";
import {useRef} from "react";
import {Link,MemoryRouter,Route,Routes,useNavigate} from "react-router-dom";
import {useRouteRestoration} from "./useRouteRestoration";
function Frame(){const panel=useRef<HTMLDivElement>(null);useRouteRestoration(panel);return <div ref={panel}><Routes><Route path="/list" element={<><h1>List</h1><Link to="/detail">Open detail</Link><Link to="/detail" data-restore-focus="episode-one">Episode one</Link><Link to="/detail" data-restore-focus="episode-two">Episode two</Link></>}/><Route path="/detail" element={<Detail/>}/></Routes></div>;}
function Detail(){const navigate=useNavigate();return <><h1>Detail</h1><button onClick={()=>navigate(-1)}>Back</button></>;}
describe("Route scroll and focus restoration",()=>{
 let frames:Map<number,FrameRequestCallback>,index:number,scrollDescriptor:PropertyDescriptor|undefined,heightDescriptor:PropertyDescriptor|undefined,height:number;
 beforeEach(()=>{
  frames=new Map();index=0;height=3000;
  scrollDescriptor=Object.getOwnPropertyDescriptor(window,"scrollY");heightDescriptor=Object.getOwnPropertyDescriptor(document.documentElement,"scrollHeight");
  Object.defineProperty(window,"scrollY",{configurable:true,writable:true,value:0});
  Object.defineProperty(document.documentElement,"scrollHeight",{configurable:true,get:()=>height});
  spyOn(globalThis,"requestAnimationFrame").and.callFake(callback=>{frames.set(++index,callback);return index;});
  spyOn(globalThis,"cancelAnimationFrame").and.callFake(id=>{frames.delete(id);});
  spyOn(window,"scrollTo").and.callFake((options:any)=>{Object.defineProperty(window,"scrollY",{configurable:true,writable:true,value:Math.min(options.top,Math.max(0,height-window.innerHeight))});});
 });
 afterEach(()=>{cleanup();if(scrollDescriptor)Object.defineProperty(window,"scrollY",scrollDescriptor);if(heightDescriptor)Object.defineProperty(document.documentElement,"scrollHeight",heightDescriptor);else delete (document.documentElement as any).scrollHeight;});
 const flush=()=>act(()=>{const pending=[...frames.values()];frames.clear();pending.forEach(callback=>callback(0));});
 it("returns to the prior list scroll and originating link focus",()=>{
  render(<MemoryRouter initialEntries={[{pathname:"/list",key:crypto.randomUUID()}]}><Frame/></MemoryRouter>);flush();
  Object.defineProperty(window,"scrollY",{configurable:true,writable:true,value:600});fireEvent.scroll(window);
  screen.getByText("Open detail").focus();fireEvent.click(screen.getByText("Open detail"));flush();expect(window.scrollY).toBe(0);
  fireEvent.click(screen.getByText("Back"));flush();
  expect(window.scrollY).toBe(600);expect(document.activeElement).toBe(screen.getByText("Open detail"));
 });
 it("returns focus to the exact episode when multiple links share a details URL",()=>{
  render(<MemoryRouter initialEntries={[{pathname:"/list",key:crypto.randomUUID()}]}><Frame/></MemoryRouter>);flush();
  Object.defineProperty(window,"scrollY",{configurable:true,writable:true,value:700});fireEvent.scroll(window);
  fireEvent.click(screen.getByText("Episode two"));flush();fireEvent.click(screen.getByText("Back"));flush();
  expect(window.scrollY).toBe(700);expect(document.activeElement).toBe(screen.getByText("Episode two"));
 });
 it("waits for delayed list content before restoring the saved position",async()=>{
  render(<MemoryRouter initialEntries={[{pathname:"/list",key:crypto.randomUUID()}]}><Frame/></MemoryRouter>);flush();
  Object.defineProperty(window,"scrollY",{configurable:true,writable:true,value:900});fireEvent.scroll(window);fireEvent.click(screen.getByText("Open detail"));flush();
  height=window.innerHeight;fireEvent.click(screen.getByText("Back"));flush();expect(window.scrollY).toBe(0);
  height=3000;await act(async()=>{document.querySelector("h1")!.appendChild(document.createElement("span"));await Promise.resolve();});flush();
  expect(window.scrollY).toBe(900);expect(document.activeElement).toBe(screen.getByText("Open detail"));
 });
});
