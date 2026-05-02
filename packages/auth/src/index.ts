export type ModelDockRole = "owner" | "admin" | "operator" | "user";

export const adminRoles = ["owner", "admin"] as const;

export function canAccessAdmin(role: ModelDockRole): boolean {
  return role === "owner" || role === "admin";
}
