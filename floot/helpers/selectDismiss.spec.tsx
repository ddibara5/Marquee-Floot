import React from "react";
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../components/Select";

function ControlledExample() {
  const [value, setValue] = React.useState<string | undefined>();
  return <>
    <Select value={value} onValueChange={setValue}>
      <SelectTrigger aria-label="Override"><SelectValue placeholder="Pause or drop" /></SelectTrigger>
      <SelectContent>
        <SelectItem value="paused">Paused</SelectItem>
        <SelectItem value="dropped">Dropped</SelectItem>
      </SelectContent>
    </Select>
    <button onClick={() => setValue(undefined)}>Clear choice</button>
  </>;
}

describe("Select trigger", () => {
  const nativeEvent = globalThis.Event;
  const nativeCustomEvent = globalThis.CustomEvent;
  beforeEach(() => {
    globalThis.Event = window.Event;
    globalThis.CustomEvent = window.CustomEvent;
  });
  afterEach(() => {
    cleanup();
    globalThis.Event = nativeEvent;
    globalThis.CustomEvent = nativeCustomEvent;
  });

  const dropdown = () => <Select defaultValue="7">
    <SelectTrigger aria-label="Rating"><SelectValue /></SelectTrigger>
    <SelectContent>
      <SelectItem value="7">7</SelectItem>
      <SelectItem value="8">8</SelectItem>
    </SelectContent>
  </Select>;

  it("toggles open and closed from the same trigger without changing the value", async () => {
    render(dropdown());
    const trigger = screen.getByRole("combobox", { name: "Rating" });
    expect(trigger.getAttribute("aria-expanded")).toBe("false");
    fireEvent.pointerDown(trigger, { pointerType: "touch", button: 0 });
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    expect(document.body.style.pointerEvents).not.toBe("none");
    expect(screen.queryByRole("button", { name: "Close dropdown" })).toBeNull();
    fireEvent.pointerDown(trigger, { pointerType: "touch", button: 0 });
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
    expect(trigger.textContent).toContain("7");
    fireEvent.click(trigger);
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
  });

  it("supports keyboard opening and closing", async () => {
    render(dropdown());
    const trigger = screen.getByRole("combobox", { name: "Rating" });
    trigger.focus();
    fireEvent.keyDown(trigger, { key: "ArrowDown" });
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("true"));
    fireEvent.keyDown(document, { key: "Escape" });
    await waitFor(() => expect(trigger.getAttribute("aria-expanded")).toBe("false"));
  });

  it("shows its placeholder again when a controlled choice is cleared", async () => {
    render(<ControlledExample />);
    const trigger = screen.getByRole("combobox", { name: "Override" });
    expect(trigger.textContent).toContain("Pause or drop");
    fireEvent.click(trigger);
    fireEvent.click(await screen.findByRole("option", { name: "Paused" }));
    await waitFor(() => expect(trigger.textContent).toContain("Paused"));
    fireEvent.click(screen.getByRole("button", { name: "Clear choice" }));
    expect(trigger.textContent).toContain("Pause or drop");
  });
});
