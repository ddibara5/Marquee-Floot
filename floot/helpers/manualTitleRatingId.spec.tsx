import { manualTitleRatingId } from "./manualTitleRatingId";

describe("manual title rating key", () => {
  it("produces a stable UUID for a user's title", () => {
    const id = manualTitleRatingId(1, 41);
    expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    expect(manualTitleRatingId(1, 41)).toBe(id);
  });

  it("keeps different users and titles separate", () => {
    expect(manualTitleRatingId(1, 41)).not.toBe(manualTitleRatingId(2, 41));
    expect(manualTitleRatingId(1, 41)).not.toBe(manualTitleRatingId(1, 42));
  });
});
