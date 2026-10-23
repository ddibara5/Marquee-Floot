import { effectiveRating, isRatingValue, ratingText, stepRating, wholeRating } from "./titleRatings";
import { schema } from "../endpoints/personal-state_POST.schema";

describe("half-point title ratings", () => {
  it("accepts 1 to 10 in half points only", () => {
    expect([1, 1.5, 7, 7.5, 10].every(isRatingValue)).toBeTrue();
    expect([0, 0.5, 10.5, 7.25, NaN, "7"].some(isRatingValue)).toBeFalse();
  });
  it("rounds half points up to the whole number Trakt receives", () => {
    expect(wholeRating(7.5)).toBe(8);
    expect(wholeRating(7)).toBe(7);
    expect(wholeRating(1.5)).toBe(2);
    expect(wholeRating(9.5)).toBe(10);
  });
  it("uses the score only while it still matches the whole rating", () => {
    expect(effectiveRating(8, "7.5")).toBe(7.5);
    expect(effectiveRating(8, 7.5)).toBe(7.5);
    expect(effectiveRating(6, "7.5")).toBe(6);
    expect(effectiveRating(7, null)).toBe(7);
    expect(effectiveRating(null, "7.5")).toBeNull();
  });
  it("formats whole and half ratings", () => {
    expect(ratingText(7)).toBe("7");
    expect(ratingText(7.5)).toBe("7.5");
    expect(stepRating(7, 0.5)).toBe(7.5);
    expect(stepRating(10, 0.5)).toBe(10);
    expect(stepRating(1, -0.5)).toBe(1);
  });
  it("keeps whole-number Trakt rating requests valid and accepts half points", () => {
    const base = { kind: "rating", mediaType: "movie", traktId: "12", action: "set" } as const;
    expect(schema.parse({ ...base, rating: 7 }).rating).toBe(7);
    expect(schema.parse({ ...base, rating: 7.5 }).rating).toBe(7.5);
    expect(() => schema.parse({ ...base, rating: 7.25 })).toThrow();
    expect(() => schema.parse({ ...base, rating: 0 })).toThrow();
    expect(schema.parse({ ...base, action: "remove" }).action).toBe("remove");
  });
});