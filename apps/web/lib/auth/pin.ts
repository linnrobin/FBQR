/**
 * PIN utilities for staff authentication.
 * PINs are 4–6 digit strings hashed with bcrypt (cost 10).
 * Used by: seed script (hash), staff management API (hash), PIN auth endpoint (verify).
 */
import bcrypt from "bcryptjs";
import { z } from "zod";

export const pinSchema = z
  .string()
  .regex(/^\d{4,6}$/, "PIN must be 4–6 digits");

/**
 * Hash a plain-text PIN. Use when creating or updating a staff PIN.
 */
export async function hashPin(pin: string): Promise<string> {
  pinSchema.parse(pin);
  return bcrypt.hash(pin, 10);
}

/**
 * Compare a plain-text PIN against a stored hash.
 * Returns true if they match, false otherwise.
 */
export async function verifyPin(pin: string, hash: string): Promise<boolean> {
  // Never throw — always return false on bad input
  if (!pin || !hash) return false;
  return bcrypt.compare(pin, hash);
}
