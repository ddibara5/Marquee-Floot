import { createHash } from "node:crypto";

// Stable UUID keeps the manual rating in the legacy UUID-keyed table without a migration.
export function manualTitleRatingId(userId: number, titleId: number): string {
  const bytes = createHash("sha1")
    .update(`marquee:manual:title-rating:v1:${userId}:${titleId}`)
    .digest();
  bytes[6] = (bytes[6] & 0x0f) | 0x50;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = bytes.subarray(0, 16).toString("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
