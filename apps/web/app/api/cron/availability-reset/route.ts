import { validateCronSecret, unauthorizedCronResponse } from "@/lib/cron";

/** Implemented in Step 2 (schema) and the relevant platform step. */
export async function GET(req: Request) {
  if (!validateCronSecret(req)) return unauthorizedCronResponse();
  return Response.json({ ok: true, affectedRows: 0, durationMs: 0 });
}
