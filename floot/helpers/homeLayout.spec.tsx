import { defaultHomeLayout, moveHomeSection, normalizeHomeLayout } from "./homeLayout";

describe("homeLayout", () => {
  it("defaults to every section shown in the designed order", () => {
    expect(defaultHomeLayout()).toEqual({ order: ["keep", "upcoming", "recent", "watchlist"], hidden: [] });
  });
  it("drops unknown or repeated ids and appends missing sections", () => {
    expect(normalizeHomeLayout({ order: ["recent", "bogus", "recent", "keep"], hidden: ["upcoming", "nope"] }))
      .toEqual({ order: ["recent", "keep", "upcoming", "watchlist"], hidden: ["upcoming"] });
    expect(normalizeHomeLayout("garbage")).toEqual(defaultHomeLayout());
  });
  it("drops Last 7 days from layouts saved before it left Home (October 17)", () => {
    expect(normalizeHomeLayout({ order: ["week", "keep", "upcoming", "recent", "watchlist"], hidden: ["week"] }))
      .toEqual(defaultHomeLayout());
  });
  it("moves a section one step and ignores moves past either end", () => {
    const layout = defaultHomeLayout();
    expect(moveHomeSection(layout, "upcoming", -1).order.slice(0, 2)).toEqual(["upcoming", "keep"]);
    expect(moveHomeSection(layout, "keep", -1)).toBe(layout);
    expect(moveHomeSection(layout, "watchlist", 1)).toBe(layout);
  });
});
