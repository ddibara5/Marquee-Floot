import {nextPageStack,type PageEntry} from "./pageStack";
const entry=(key:string,pathname=("/"+key))=>({key,pathname,element:key,location:{pathname}}) as PageEntry<string>;
describe("Phone page stack",()=>{
 it("keeps the covered page under a pushed page",()=>{
  const stack=nextPageStack([entry("home","/")],entry("title","/titles/1"),"PUSH");
  expect(stack.map(e=>e.key)).toEqual(["home","title"]);
 });
 it("keeps at most two pages",()=>{
  let stack=[entry("home","/")];
  stack=nextPageStack(stack,entry("a"),"PUSH");stack=nextPageStack(stack,entry("b"),"PUSH");
  expect(stack.map(e=>e.key)).toEqual(["a","b"]);
 });
 it("reveals the covered page on Back with its saved scroll and frame",()=>{
  const home={...entry("home","/"),scrollY:640,frame:{top:-580,left:0,width:440}};
  const stack=nextPageStack([home,entry("title","/titles/1")],{...entry("home","/"),element:"fresh"},"POP");
  expect(stack.length).toBe(1);expect(stack[0].scrollY).toBe(640);expect(stack[0].frame?.top).toBe(-580);expect(stack[0].element).toBe("fresh");
 });
 it("starts over when Back lands on a page it does not hold",()=>{
  const stack=nextPageStack([entry("a"),entry("b")],entry("z"),"POP");
  expect(stack.map(e=>e.key)).toEqual(["z"]);
 });
 it("swaps the top page on REPLACE and refreshes it on a re-render",()=>{
  let stack=nextPageStack([entry("home","/"),entry("a")],entry("b"),"REPLACE");
  expect(stack.map(e=>e.key)).toEqual(["home","b"]);
  const frame={top:1,left:2,width:3};
  stack=[entry("home","/"),{...entry("t","/titles/1"),frame}];
  stack=nextPageStack(stack,{...entry("t","/titles/1"),element:"new"},"PUSH");
  expect(stack.length).toBe(2);expect(stack[1].element).toBe("new");expect(stack[1].frame).toBe(frame);
 });
});
