/**
 * Cron route authentication helper.
 * Every cron API route must call this before executing any logic.
 * See docs/platform-owner.md § Cron CRON_SECRET validation pattern.
 */
export function validateCronSecret(req: Request): boolean {
  const authHeader = req.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret) return false;
  return authHeader === `Bearer ${secret}`;
}

export function unauthorizedCronResponse() {
  return new Response("Unauthorized", { status: 401 });
}
