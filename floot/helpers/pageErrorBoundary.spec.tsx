import { render, screen, fireEvent } from "@testing-library/react";
import { PageErrorBoundary } from "../components/PageErrorBoundary";

function Broken({ fail }: { fail: boolean }) {
  if (fail) throw new Error("cancelIdleCallback is not defined");
  return <p>Watch List</p>;
}
let flakyFails = true;
function Flaky() {
  return <Broken fail={flakyFails} />;
}

describe("PageErrorBoundary", () => {
  let fetchSpy: jasmine.Spy;
  beforeEach(() => {
    fetchSpy = spyOn(globalThis, "fetch").and.resolveTo(new Response(null, { status: 204 }));
    spyOn(console, "error"); // React logs the caught error
  });

  it("shows Try again and Reload instead of a blank screen, and reports the crash once", () => {
    render(<PageErrorBoundary resetKey="a"><Broken fail /></PageErrorBoundary>);
    expect(screen.getByRole("alert").textContent).toContain("This page hit a problem");
    expect(screen.getByText(/cancelIdleCallback is not defined/)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Reload" })).toBeTruthy();
    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.calls.mostRecent().args;
    expect(url).toBe("/_api/client-error");
    expect(JSON.parse(init.body).message).toBe("cancelIdleCallback is not defined");
  });

  it("recovers when the user moves to another page", () => {
    const { rerender } = render(<PageErrorBoundary resetKey="a"><Broken fail /></PageErrorBoundary>);
    rerender(<PageErrorBoundary resetKey="b"><Broken fail={false} /></PageErrorBoundary>);
    expect(screen.getByText("Watch List")).toBeTruthy();
  });

  it("Try again re-renders the page", () => {
    flakyFails = true;
    render(<PageErrorBoundary><Flaky /></PageErrorBoundary>);
    flakyFails = false;
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(screen.getByText("Watch List")).toBeTruthy();
  });
});
