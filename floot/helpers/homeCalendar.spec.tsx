import { addDays, agendaFrom, calendarMonthRange, monthCells } from "./homeCalendar";

describe("homeCalendar", () => {
  it("pads October 2026 (starts Thursday) to six Sunday-first weeks", () => {
    const cells = monthCells("2026-10");
    expect(cells.length).toBe(42);
    expect(cells.slice(0, 5)).toEqual([null, null, null, null, "2026-10-01"]);
    expect(cells[34]).toBe("2026-10-31");
    expect(cells[35]).toBeNull();
  });
  it("handles February in a leap year", () => {
    expect(monthCells("2028-02").filter(Boolean).length).toBe(29);
  });
  it("lists months across a year end and adds days across months", () => {
    expect(calendarMonthRange("2026-11-20", addDays("2026-11-20", 60))).toEqual(["2026-11", "2026-12", "2027-01"]);
    expect(addDays("2026-10-23", 60)).toBe("2026-12-22");
  });
  it("starts the agenda at the selected day but never before today", () => {
    const items = ["2026-10-30", "2026-10-25", "2026-11-01"].map(day => ({ key: day, day, name: day, detail: "", to: "/" }));
    expect(agendaFrom(items, "2026-10-26", "2026-10-23", 4).map(item => item.day)).toEqual(["2026-10-30", "2026-11-01"]);
    expect(agendaFrom(items, "2026-10-02", "2026-10-23", 2).map(item => item.day)).toEqual(["2026-10-25", "2026-10-30"]);
  });
});
