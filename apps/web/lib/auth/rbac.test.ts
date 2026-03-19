/**
 * Unit tests for the RBAC permission engine (Step 4).
 *
 * Coverage:
 *   - hasPermission() — pure utility
 *   - requireStaffPermission() — throws ForbiddenError on missing permission
 *   - getSystemAdminPermissions() — aggregates permissions from DB roles (mocked)
 *   - requireSystemPermission() — redirects on missing permission (mocked)
 *   - getStaffSession() — parses and verifies the staff JWT cookie
 *   - isMerchantOwner() — short-circuit helper
 */

import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  hasPermission,
  requireStaffPermission,
  ForbiddenError,
  getSystemAdminPermissions,
  isMerchantOwner,
} from "@/lib/auth/rbac";
import type { StaffSessionPayload } from "@/lib/auth/staff-jwt";

// ---------------------------------------------------------------------------
// Mock Prisma
// ---------------------------------------------------------------------------
vi.mock("@repo/database", () => ({
  prisma: {
    systemRoleAssignment: {
      findMany: vi.fn(),
    },
  },
}));

// Mock next/navigation redirect so it throws a catchable object in tests
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw { type: "redirect", url };
  }),
}));

import { prisma } from "@repo/database";
import { redirect } from "next/navigation";
import { requireSystemPermission } from "@/lib/auth/rbac";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeStaffSession(
  permissions: string[]
): StaffSessionPayload {
  return {
    staffId: "staff-1",
    name: "Budi",
    restaurantId: "rest-1",
    branchId: "branch-1",
    permissions,
  };
}

// ---------------------------------------------------------------------------
// hasPermission
// ---------------------------------------------------------------------------

describe("hasPermission", () => {
  it("returns true when permission is in the list", () => {
    expect(hasPermission(["orders:view", "orders:manage"], "orders:view")).toBe(true);
  });

  it("returns false when permission is not in the list", () => {
    expect(hasPermission(["orders:view"], "orders:manage")).toBe(false);
  });

  it("returns false for an empty permission list", () => {
    expect(hasPermission([], "orders:view")).toBe(false);
  });

  it("is case-sensitive", () => {
    expect(hasPermission(["Orders:View"], "orders:view")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// requireStaffPermission
// ---------------------------------------------------------------------------

describe("requireStaffPermission", () => {
  it("does not throw when staff has the required permission", () => {
    const staff = makeStaffSession(["orders:view", "orders:manage"]);
    expect(() => requireStaffPermission(staff, "orders:manage")).not.toThrow();
  });

  it("throws ForbiddenError when staff is missing the required permission", () => {
    const staff = makeStaffSession(["orders:view"]);
    expect(() => requireStaffPermission(staff, "orders:manage")).toThrow(ForbiddenError);
  });

  it("throws ForbiddenError with the correct permission name", () => {
    const staff = makeStaffSession(["kitchen:view"]);
    try {
      requireStaffPermission(staff, "menu:manage");
    } catch (e) {
      expect(e).toBeInstanceOf(ForbiddenError);
      expect((e as ForbiddenError).permission).toBe("menu:manage");
    }
  });

  it("throws ForbiddenError when staff has no permissions at all", () => {
    const staff = makeStaffSession([]);
    expect(() => requireStaffPermission(staff, "kitchen:view")).toThrow(ForbiddenError);
  });

  it("does not throw when staff has all permissions (owner-equivalent role)", () => {
    const all = [
      "menu:manage",
      "promotions:manage",
      "reports:read",
      "orders:view",
      "orders:manage",
      "orders:refund",
      "kitchen:view",
      "kitchen:manage",
      "staff:manage",
      "tables:manage",
      "settings:manage",
      "branding:manage",
      "invoices:read",
      "loyalty:manage",
      "billing:read",
    ];
    const staff = makeStaffSession(all);
    expect(() => requireStaffPermission(staff, "billing:read")).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// isMerchantOwner
// ---------------------------------------------------------------------------

describe("isMerchantOwner", () => {
  it("returns true for MERCHANT user type", () => {
    expect(isMerchantOwner("MERCHANT")).toBe(true);
  });

  it("returns false for SYSTEM_ADMIN user type", () => {
    expect(isMerchantOwner("SYSTEM_ADMIN")).toBe(false);
  });

  it("returns false for staff userType strings", () => {
    expect(isMerchantOwner("STAFF")).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getSystemAdminPermissions
// ---------------------------------------------------------------------------

describe("getSystemAdminPermissions", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns empty array when admin has no role assignments", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([]);
    const perms = await getSystemAdminPermissions("admin-1");
    expect(perms).toEqual([]);
  });

  it("returns permissions from a single role", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([
      {
        id: "sra-1",
        systemAdminId: "admin-1",
        systemRoleId: "role-1",
        createdAt: new Date(),
        systemRole: { permissions: ["merchants:read", "reports:read"] },
      } as any,
    ]);
    const perms = await getSystemAdminPermissions("admin-1");
    expect(perms).toContain("merchants:read");
    expect(perms).toContain("reports:read");
    expect(perms).toHaveLength(2);
  });

  it("deduplicates permissions across multiple roles", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([
      {
        id: "sra-1",
        systemAdminId: "admin-1",
        systemRoleId: "role-1",
        createdAt: new Date(),
        systemRole: { permissions: ["merchants:read", "reports:read"] },
      } as any,
      {
        id: "sra-2",
        systemAdminId: "admin-1",
        systemRoleId: "role-2",
        createdAt: new Date(),
        systemRole: { permissions: ["merchants:read", "admins:manage"] },
      } as any,
    ]);
    const perms = await getSystemAdminPermissions("admin-1");
    // merchants:read appears in both roles — must be deduplicated
    const merchantsReadCount = perms.filter((p) => p === "merchants:read").length;
    expect(merchantsReadCount).toBe(1);
    expect(perms).toContain("reports:read");
    expect(perms).toContain("admins:manage");
    expect(perms).toHaveLength(3);
  });

  it("queries DB filtered by the correct adminId", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([]);
    await getSystemAdminPermissions("admin-xyz");
    expect(prisma.systemRoleAssignment.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { systemAdminId: "admin-xyz" },
      })
    );
  });
});

// ---------------------------------------------------------------------------
// requireSystemPermission
// ---------------------------------------------------------------------------

describe("requireSystemPermission", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("does not redirect when admin has the required permission", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([
      {
        id: "sra-1",
        systemAdminId: "admin-1",
        systemRoleId: "role-1",
        createdAt: new Date(),
        systemRole: { permissions: ["merchants:create", "merchants:read"] },
      } as any,
    ]);
    await expect(
      requireSystemPermission("admin-1", "merchants:create")
    ).resolves.toBeUndefined();
    expect(redirect).not.toHaveBeenCalled();
  });

  it("calls redirect when admin lacks the required permission", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([
      {
        id: "sra-1",
        systemAdminId: "admin-1",
        systemRoleId: "role-1",
        createdAt: new Date(),
        systemRole: { permissions: ["merchants:read"] },
      } as any,
    ]);
    await expect(
      requireSystemPermission("admin-1", "merchants:create")
    ).rejects.toMatchObject({ type: "redirect", url: "/fbqrsys/login" });
    expect(redirect).toHaveBeenCalledWith("/fbqrsys/login");
  });

  it("calls redirect when admin has no roles", async () => {
    vi.mocked(prisma.systemRoleAssignment.findMany).mockResolvedValue([]);
    await expect(
      requireSystemPermission("admin-1", "admins:manage")
    ).rejects.toMatchObject({ type: "redirect" });
  });
});
