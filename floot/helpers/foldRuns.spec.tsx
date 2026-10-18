import { foldRuns } from "./foldRuns";

describe("foldRuns", () => {
  it("groups contiguous items of the same kind in order", () => {
    const runs = foldRuns([1, 2, 3, 5, 7, 8], n => n % 2 === 0 ? "even" : "odd");
    expect(runs).toEqual([
      { kind: "odd", items: [1] },
      { kind: "even", items: [2] },
      { kind: "odd", items: [3, 5, 7] },
      { kind: "even", items: [8] },
    ]);
  });
  it("returns no runs for an empty list", () => {
    expect(foldRuns([], () => "x")).toEqual([]);
  });
});
