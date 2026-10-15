import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, useLocation } from "react-router-dom";
import AppBackButton from "../components/AppBackButton";

function Route() {
  const location = useLocation();
  return <><AppBackButton fallback="/settings" fallbackLabel="Settings" /><span data-testid="path">{location.pathname}</span></>;
}

describe("Marquee subpage back navigation", () => {
  const originalState = window.history.state;
  afterEach(() => {
    cleanup();
    window.history.replaceState(originalState, "");
  });

  it("returns direct entry to the explicit parent instead of external browser history", async () => {
    window.history.replaceState({ idx: 0 }, "");
    render(<MemoryRouter initialEntries={["/sync"]}><Route /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Back, or go to Settings/ }));
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/settings"));
  });

  it("uses the prior in-app entry when available", async () => {
    window.history.replaceState({ idx: 1 }, "");
    render(<MemoryRouter initialEntries={["/library", "/titles/1"]} initialIndex={1}><Route /></MemoryRouter>);
    fireEvent.click(screen.getByRole("button", { name: /Back, or go to Settings/ }));
    await waitFor(() => expect(screen.getByTestId("path").textContent).toBe("/library"));
  });
});