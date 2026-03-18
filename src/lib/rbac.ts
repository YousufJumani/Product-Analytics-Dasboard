/**
 * RBAC Helper Utilities
 *
 * CONCEPT — Role hierarchy:
 *   ORG_ADMIN  > ANALYST > VIEWER
 *
 * These helpers are used in API routes to enforce permissions after
 * the session has been read. They are pure functions — easy to unit test.
 *
 * SECURITY: We intentionally re-fetch the role from the DB (not only from
 * the JWT) in sensitive mutation endpoints, because JWT tokens can be up to
 * 30 days old. For read endpoints the JWT role is fine (performance > accuracy).
 */
import type { OrgRole } from "@prisma/client";

const ROLE_WEIGHT: Record<OrgRole, number> = {
  ORG_ADMIN: 30,
  ANALYST: 20,
  VIEWER: 10,
};

export function hasRole(userRole: OrgRole | null | undefined, required: OrgRole): boolean {
  if (!userRole) return false;
  return ROLE_WEIGHT[userRole] >= ROLE_WEIGHT[required];
}

export function requireAdmin(role: OrgRole | null | undefined): void {
  if (!hasRole(role, "ORG_ADMIN")) {
    throw new Error("FORBIDDEN: requires ORG_ADMIN role");
  }
}

export function requireAnalyst(role: OrgRole | null | undefined): void {
  if (!hasRole(role, "ANALYST")) {
    throw new Error("FORBIDDEN: requires ANALYST or higher role");
  }
}

export function canUseCopilot(role: OrgRole | null | undefined): boolean {
  return hasRole(role, "ANALYST");
}

export function canManageIntegrations(role: OrgRole | null | undefined): boolean {
  return hasRole(role, "ORG_ADMIN");
}
