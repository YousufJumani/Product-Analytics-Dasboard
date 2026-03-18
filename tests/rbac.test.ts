import { describe, it, expect } from "vitest";
import { hasRole, canUseCopilot, canManageIntegrations } from "@/lib/rbac";

describe("RBAC helpers", () => {
  it("should enforce role hierarchy correctly", () => {
    expect(hasRole("ORG_ADMIN", "VIEWER")).toBe(true);
    expect(hasRole("ORG_ADMIN", "ANALYST")).toBe(true);
    expect(hasRole("ORG_ADMIN", "ORG_ADMIN")).toBe(true);

    expect(hasRole("ANALYST", "VIEWER")).toBe(true);
    expect(hasRole("ANALYST", "ANALYST")).toBe(true);
    expect(hasRole("ANALYST", "ORG_ADMIN")).toBe(false);

    expect(hasRole("VIEWER", "VIEWER")).toBe(true);
    expect(hasRole("VIEWER", "ANALYST")).toBe(false);
    expect(hasRole("VIEWER", "ORG_ADMIN")).toBe(false);
  });

  it("should deny null/undefined roles", () => {
    expect(hasRole(null, "VIEWER")).toBe(false);
    expect(hasRole(undefined, "VIEWER")).toBe(false);
  });

  it("should gate copilot to analyst+", () => {
    expect(canUseCopilot("ORG_ADMIN")).toBe(true);
    expect(canUseCopilot("ANALYST")).toBe(true);
    expect(canUseCopilot("VIEWER")).toBe(false);
    expect(canUseCopilot(null)).toBe(false);
  });

  it("should gate integration management to admin only", () => {
    expect(canManageIntegrations("ORG_ADMIN")).toBe(true);
    expect(canManageIntegrations("ANALYST")).toBe(false);
    expect(canManageIntegrations("VIEWER")).toBe(false);
  });
});
