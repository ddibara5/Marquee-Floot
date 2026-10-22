/**
 * Household accounts (October 22, 2026). Dave (user 1) owns the data. The owner can add up to one more member
 * (a partner, with their own data) and one automation account. The automation account acts as the owner, except
 * that it cannot manage accounts.
 */
export const householdAccess = {
 ownerId: 1,
 /** The reason a new account is refused, or null. Members counts the owner. */
 limit(kind: "member" | "bot", counts: { members: number; bots: number }): string | null {
  if (kind === "bot") return counts.bots >= 1 ? "The automation account already exists." : null;
  return counts.members >= 2 ? "Both household accounts already exist." : null;
 },
};