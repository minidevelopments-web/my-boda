export type StaffRole = "COUPLE" | "PLANNER" | "SYSADMIN";
export type Area = "guests" | "content" | "users" | "system";
export const ROLE_RANK: Record<string, number> = { GUEST: 0, PLANNER: 1, COUPLE: 2, SYSADMIN: 3 };
export function canAccess(role: string, area: Area): boolean {
  if (role === "SYSADMIN") return true;
  if (area === "guests" || area === "content") return role === "COUPLE" || role === "PLANNER";
  if (area === "users") return false; // SYSADMIN-only; narrow COUPLE→create-PLANNER exception enforced in Task 3 planners endpoint, not here
  return false; // system: sysadmin only
}
