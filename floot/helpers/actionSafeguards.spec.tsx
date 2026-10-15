import {act,cleanup,fireEvent,render,screen,waitFor,within} from "@testing-library/react";
import {QueryClient,QueryClientProvider} from "@tanstack/react-query";
import {MemoryRouter,Route,Routes} from "react-router-dom";
import superjson from "superjson";
import WatchlistPage from "../pages/watchlist";
import TitleDetailPage from "../pages/titles.$titleId";
import {MediaImage} from "../components/MediaImage";
const response=(data:unknown,status=200)=>new Response(superjson.stringify(data),{status});
const row={id:"saved1",titleId:1,mediaType:"show",traktId:"one",source:"local",title:"Audit series",year:2020,pendingAction:null};
const personal={watchlist:[row],ratings:[],mappings:[]};
function mount(element:React.ReactNode,path="/watchlist"){
 const client=new QueryClient({defaultOptions:{queries:{retry:false,staleTime:Infinity},mutations:{retry:false}}});
 client.setQueryData(["marquee","personal-state"],personal);
 client.setQueryData(["mq","enhancement-preferences"],{});
 client.setQueryData(["marquee","titles"],[{id:"1",title:"Audit series",type:"show",watchedEpisodes:1,releasedEpisodes:2}]);
 client.setQueryData(["marquee","catalog-detail",1],{});
 const episodes=[1,2,3,4].map(id=>({id,seasonId:10,episodeNumber:id,displayTitle:"Episode "+id,overview:"Known episode",tmdbStillPath:"/still.jpg",airedAt:id===3?null:new Date(id===4?"2099-01-01":"2020-01-01")}));
 client.setQueryData(["marquee","title-episodes",1],{seasons:[{id:10,seasonNumber:1}],episodes,watchEvents:[],undatedEpisodeIds:[1]});
 return render(<QueryClientProvider client={client}><MemoryRouter initialEntries={[path]}><Routes><Route path={path==="/watchlist"?"/watchlist":"/titles/:titleId"} element={element}/></Routes></MemoryRouter></QueryClientProvider>);
}
describe("Marquee action safeguards",()=>{
 const nativeEvent=globalThis.Event,nativeCustomEvent=globalThis.CustomEvent;
 beforeEach(()=>{globalThis.Event=window.Event;globalThis.CustomEvent=window.CustomEvent;});
 afterEach(()=>{cleanup();localStorage.clear();globalThis.Event=nativeEvent;globalThis.CustomEvent=nativeCustomEvent;});
 it("keeps failed Undo visible alongside its retry and removal context",async()=>{
  const fetchSpy=spyOn(globalThis,"fetch").and.callFake(async(_url,init)=>init?.method==="POST"?response({saved:true,synced:false,message:"Saved."}):response({...personal,watchlist:[]}));
  mount(<WatchlistPage/>);
  fireEvent.keyDown(screen.getByRole("button",{name:"Actions for Audit series"}),{key:"ArrowDown"});
  await waitFor(()=>expect(screen.getByRole("menuitem",{name:/Remove/})).toBeTruthy());
  fireEvent.click(screen.getByRole("menuitem",{name:/Remove/}));
  await waitFor(()=>expect(screen.getByRole("button",{name:"Undo"})).toBeTruthy());
  fetchSpy.and.callFake(async()=>response({error:"Undo unavailable; reconnect."},500));
  fireEvent.click(screen.getByRole("button",{name:"Undo"}));
  await waitFor(()=>expect(screen.getByRole("alert").textContent).toContain("Undo unavailable"));
  expect(screen.getByRole("button",{name:"Retry Undo"})).toBeTruthy();
  expect(screen.getByText("Audit series removed from your Watch List.")).toBeTruthy();
 });
 it("confirms the precise catch-up scope, allows Cancel, and leaves errors in the dialog",async()=>{
  const fetchSpy=spyOn(globalThis,"fetch").and.callFake(async()=>response({error:"Could not save catch-up."},500));
  mount(<TitleDetailPage/>,"/titles/1");
  expect(screen.getByText("1/2 released")).toBeTruthy();
  expect(screen.getByText(/2 released episodes/)).toBeTruthy();
  fireEvent.click(screen.getByRole("button",{name:"Mark available episodes watched"}));
  const dialog=screen.getByRole("dialog");
  expect(dialog.textContent).toContain("mark 2 missing episodes");
  expect(dialog.textContent).toContain("1 have no known air date");
  expect(dialog.textContent).toContain("Future dated episodes are excluded");
  expect(fetchSpy).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(within(dialog).getByRole("button",{name:"Cancel"}));
  fireEvent.click(within(dialog).getByRole("button",{name:"Cancel"}));
  expect(screen.queryByRole("dialog")).toBeNull();expect(fetchSpy).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button",{name:"Mark available episodes watched"}));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("button",{name:"Mark watched"}));
  await waitFor(()=>expect(within(screen.getByRole("dialog")).getByRole("alert").textContent).toContain("Could not save"));
  expect(within(screen.getByRole("dialog")).getByRole("button",{name:"Retry"})).toBeTruthy();
 });
 it("shows a fallback when artwork fails without removing the reserved outer frame",()=>{
  render(<span data-testid="frame"><MediaImage src="/missing.jpg" alt="Poster" fallback="A"/></span>);
  fireEvent.error(screen.getByRole("img"));expect(screen.getByTestId("frame").textContent).toBe("A");expect(screen.queryByRole("img")).toBeNull();
 });
});
