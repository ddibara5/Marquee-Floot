// Half-point ratings, mirroring GameDeck's helpers/ratings (October 23, AF-20261023-06).
export const RATING_MIN = 1, RATING_MAX = 10;
export const isRatingValue = (value: unknown): value is number =>
  typeof value === "number" && Number.isFinite(value) && value >= RATING_MIN && value <= RATING_MAX && Number.isInteger(value * 2);
// Same rounding as Postgres round() for these positive values: 7.5 becomes 8. Trakt only takes this whole number.
export const wholeRating = (score: number) => Math.floor(score + 0.5);
// A half-point score counts only while it still rounds to the whole-number rating; a Trakt import or an older client that writes only the whole number wins.
export function effectiveRating(rating: number | null | undefined, ratingScore: number | string | null | undefined): number | null {
  if (rating == null) return null;
  const score = ratingScore == null ? null : Number(ratingScore);
  return score != null && isRatingValue(score) && wholeRating(score) === rating ? score : rating;
}
export const ratingText = (value: number) => Number.isInteger(value) ? String(value) : value.toFixed(1);
export const stepRating = (value: number, delta: number) =>
  Math.min(RATING_MAX, Math.max(RATING_MIN, Math.round((value + delta) * 2) / 2));