/**
 * Tests for staff JWT utilities (lib/auth/staff-jwt.ts)
 * Required by architecture.md: Step 3 — JWT sign/verify; session expiry
 */
import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { signStaffJwt, verifyStaffJwt, STAFF_SESSION_TTL_SECONDS } from "./staff-jwt";

// Set required env var for tests
const ORIGINAL_SECRET = process.env.NEXTAUTH_SECRET;
beforeAll(() => {
  process.env.NEXTAUTH_SECRET = "test-secret-minimum-32-chars-long!!";
});
afterAll(() => {
  process.env.NEXTAUTH_SECRET = ORIGINAL_SECRET;
});

const samplePayload = {
  staffId: "staff-uuid-123",
  name: "Budi Santoso",
  restaurantId: "restaurant-uuid-456",
  branchId: null,
  permissions: ["orders:view", "orders:manage"],
};

describe("signStaffJwt", () => {
  it("returns a JWT string", async () => {
    const token = await signStaffJwt(samplePayload);
    expect(typeof token).toBe("string");
    // JWTs have 3 base64url segments separated by dots
    expect(token.split(".")).toHaveLength(3);
  });

  it("throws when NEXTAUTH_SECRET is not set", async () => {
    const saved = process.env.NEXTAUTH_SECRET;
    delete process.env.NEXTAUTH_SECRET;
    await expect(signStaffJwt(samplePayload)).rejects.toThrow(
      "NEXTAUTH_SECRET is not set"
    );
    process.env.NEXTAUTH_SECRET = saved;
  });
});

describe("verifyStaffJwt", () => {
  it("returns the payload for a valid token", async () => {
    const token = await signStaffJwt(samplePayload);
    const payload = await verifyStaffJwt(token);

    expect(payload).not.toBeNull();
    expect(payload?.staffId).toBe(samplePayload.staffId);
    expect(payload?.name).toBe(samplePayload.name);
    expect(payload?.restaurantId).toBe(samplePayload.restaurantId);
    expect(payload?.branchId).toBeNull();
    expect(payload?.permissions).toEqual(samplePayload.permissions);
  });

  it("returns null for a tampered token", async () => {
    const token = await signStaffJwt(samplePayload);
    const tampered = token.slice(0, -5) + "XXXXX";
    expect(await verifyStaffJwt(tampered)).toBeNull();
  });

  it("returns null for an empty string", async () => {
    expect(await verifyStaffJwt("")).toBeNull();
  });

  it("returns null for a garbage string", async () => {
    expect(await verifyStaffJwt("not.a.jwt")).toBeNull();
  });

  it("token has correct TTL (4 hours)", async () => {
    const before = Math.floor(Date.now() / 1000);
    const token = await signStaffJwt(samplePayload);
    const payload = await verifyStaffJwt(token);

    expect(payload?.exp).toBeDefined();
    const expectedExp = before + STAFF_SESSION_TTL_SECONDS;
    // Allow 5-second tolerance for test execution time
    expect(payload!.exp!).toBeGreaterThanOrEqual(expectedExp - 5);
    expect(payload!.exp!).toBeLessThanOrEqual(expectedExp + 5);
  });

  it("rejects a token signed with a different secret", async () => {
    // Sign with current secret
    const token = await signStaffJwt(samplePayload);

    // Temporarily change secret
    process.env.NEXTAUTH_SECRET = "different-secret-also-32-chars-long!";
    const result = await verifyStaffJwt(token);
    expect(result).toBeNull();

    // Restore
    process.env.NEXTAUTH_SECRET = "test-secret-minimum-32-chars-long!!";
  });
});
