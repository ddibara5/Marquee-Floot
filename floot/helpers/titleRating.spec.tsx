import { schema } from "../endpoints/tracking_POST.schema";

describe("local title rating", () => {
  it("accepts ratings 1 through 10 and removal", () => {
    expect(schema.parse({ action: "rating", titleId: 41, rating: 1 })).toEqual({ action: "rating", titleId: 41, rating: 1 });
    expect(schema.parse({ action: "rating", titleId: 41, rating: 10 })).toEqual({ action: "rating", titleId: 41, rating: 10 });
    expect(schema.parse({ action: "rating", titleId: 41, rating: null })).toEqual({ action: "rating", titleId: 41, rating: null });
  });
  it("rejects out-of-range ratings", () => {
    expect(() => schema.parse({ action: "rating", titleId: 41, rating: 0 })).toThrow();
    expect(() => schema.parse({ action: "rating", titleId: 41, rating: 11 })).toThrow();
  });
  it("accepts half points and rejects other fractions", () => {
    expect(schema.parse({ action: "rating", titleId: 41, rating: 7.5 })).toEqual({ action: "rating", titleId: 41, rating: 7.5 });
    expect(() => schema.parse({ action: "rating", titleId: 41, rating: 7.25 })).toThrow();
    expect(() => schema.parse({ action: "rating", titleId: 41, rating: 10.5 })).toThrow();
  });
});