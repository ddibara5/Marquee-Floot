import { householdAccess } from "./householdAccess";
describe("householdAccess", () => {
 it("allows the owner plus one member, and one automation account", () => {
  expect(householdAccess.limit("member", { members: 1, bots: 1 })).toBeNull();
  expect(householdAccess.limit("member", { members: 2, bots: 0 })).toBe("Both household accounts already exist.");
  expect(householdAccess.limit("bot", { members: 2, bots: 0 })).toBeNull();
  expect(householdAccess.limit("bot", { members: 1, bots: 1 })).toBe("The automation account already exists.");
 });
});