import React from "react";
import {render,fireEvent,screen,cleanup} from "@testing-library/react";
import {MemoryRouter,Link,useLocation} from "react-router-dom";
import {useAppBack} from "./useAppBack";
function Navigation(){
 const location=useLocation();const back=useAppBack("/library");
 return <><span data-testid="route">{location.pathname}{location.search}</span><Link to="/detail/1">Detail</Link><Link to="/settings/sync">Sync</Link><button onClick={back}>Back</button></>;
}
describe("App Back navigation",()=>{
 afterEach(()=>cleanup());
 function start(path:string){render(<MemoryRouter initialEntries={[path]}><Navigation/></MemoryRouter>);}
 it("returns to the actual Home origin without browser idx",()=>{
 start("/");fireEvent.click(screen.getByText("Detail"));expect(screen.getByTestId("route").textContent).toBe("/detail/1");
 fireEvent.click(screen.getByText("Back"));expect(screen.getByTestId("route").textContent).toBe("/");
 });
 it("preserves the filtered previous page",()=>{
 start("/search?q=apothecary");fireEvent.click(screen.getByText("Detail"));fireEvent.click(screen.getByText("Back"));
 expect(screen.getByTestId("route").textContent).toBe("/search?q=apothecary");
 });
 it("returns from nested settings to the actual origin",()=>{
 start("/settings");fireEvent.click(screen.getByText("Sync"));fireEvent.click(screen.getByText("Back"));
 expect(screen.getByTestId("route").textContent).toBe("/settings");
 });
 it("uses a safe fallback for a directly opened detail",()=>{
 start("/detail/1");fireEvent.click(screen.getByText("Back"));expect(screen.getByTestId("route").textContent).toBe("/library");
 });
});
