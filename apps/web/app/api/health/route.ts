import { NextResponse } from "next/server";

/**
 * GET /api/health
 * Basic health check endpoint — returns 200 if the app is running.
 * Extended in later steps to check DB connectivity and cron run logs.
 */
export async function GET() {
  return NextResponse.json({
    ok: true,
    ts: new Date().toISOString(),
    version: process.env.npm_package_version ?? "0.1.0",
  });
}
