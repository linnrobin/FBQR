/**
 * Cron route authentication helper.
 * Every cron API route must call this before executing any logic.
 * See docs/platform-owner.md § Cron CRON_SECRET validation pattern.
 */
import crypto from "crypto";

export function validateCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || !authHeader?.startsWith("Bearer ")) return false;
  const token = authHeader.slice(7);
  // Constant-time comparison to prevent timing attacks that could reveal the secret
  if (token.length !== secret.length) return false;
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(secret));
}

export function unauthorizedCronResponse() {
  return new Response("Unauthorized", { status: 401 });
}
