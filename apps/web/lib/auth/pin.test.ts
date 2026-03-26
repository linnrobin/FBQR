/**
 * Tests for PIN utilities (lib/auth/pin.ts)
 * Required by architecture.md: Step 3 — PIN hash/compare
 */
import { describe, it, expect } from "vitest";
import { hashPin, verifyPin, pinSchema } from "./pin";

describe("pinSchema", () => {
  it("accepts 4-digit PIN", () => {
    expect(() => pinSchema.parse("1234")).not.toThrow();
  });

  it("accepts 6-digit PIN", () => {
    expect(() => pinSchema.parse("123456")).not.toThrow();
  });

  it("accepts 5-digit PIN", () => {
    expect(() => pinSchema.parse("12345")).not.toThrow();
  });

  it("rejects 3-digit PIN", () => {
    expect(() => pinSchema.parse("123")).toThrow();
  });

  it("rejects 7-digit PIN", () => {
    expect(() => pinSchema.parse("1234567")).toThrow();
  });

  it("rejects non-numeric PIN", () => {
    expect(() => pinSchema.parse("12ab")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => pinSchema.parse("")).toThrow();
  });
});

describe("hashPin", () => {
  it("returns a bcrypt hash string", async () => {
    const hash = await hashPin("1234");
    expect(hash).toMatch(/^\$2[aby]\$\d+\$/);
  });

  it("returns different hash for same PIN (random salt)", async () => {
    const hash1 = await hashPin("1234");
    const hash2 = await hashPin("1234");
    expect(hash1).not.toBe(hash2);
  });

  it("rejects invalid PIN", async () => {
    await expect(hashPin("abc")).rejects.toThrow();
  });
});

describe("verifyPin", () => {
  it("returns true for correct PIN", async () => {
    const hash = await hashPin("5678");
    expect(await verifyPin("5678", hash)).toBe(true);
  });

  it("returns false for wrong PIN", async () => {
    const hash = await hashPin("5678");
    expect(await verifyPin("9999", hash)).toBe(false);
  });

  it("returns false for empty pin", async () => {
    const hash = await hashPin("1234");
    expect(await verifyPin("", hash)).toBe(false);
  });

  it("returns false for empty hash", async () => {
    expect(await verifyPin("1234", "")).toBe(false);
  });
});
