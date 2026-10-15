import {importHttp} from "./marqueeImportHttp";
describe("bounded provider retries",()=>{
 it("never retries authentication or rate limiting",async()=>{
 const spy=spyOn(globalThis,"fetch");
 for(const status of [401,403,429]){
 spy.calls.reset();spy.and.resolveTo(new Response("",{status}));
 await expectAsync(importHttp("https://test.invalid")).toBeRejected();
 expect(spy.calls.count()).toBe(1);
 }
 });
 it("retries one transient read failure",async()=>{
 const spy=spyOn(globalThis,"fetch").and.returnValues(Promise.resolve(new Response("",{status:503})),Promise.resolve(new Response("{}")));
 expect((await importHttp("https://test.invalid")).status).toBe(200);expect(spy.calls.count()).toBe(2);
 });
 it("does not retry a token exchange",async()=>{
 const spy=spyOn(globalThis,"fetch").and.resolveTo(new Response("",{status:503}));
 await expectAsync(importHttp("https://test.invalid",{},"AUTH",false)).toBeRejected();expect(spy.calls.count()).toBe(1);
 });
});
