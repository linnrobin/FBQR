/**
 * GET /api/patungan/lookup?code=ABC123 — Look up a PatunganSession by shareCode.
 * Returns { patunganId } or 404.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code")?.toUpperCase().trim();

  if (!code || code.length !== 6) {
    return NextResponse.json({ error: "Invalid code" }, { status: 400 });
  }

  const patungan = await prisma.patunganSession.findUnique({
    where: { shareCode: code },
    select: { id: true, status: true, expiresAt: true },
  });

  if (!patungan) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (patungan.expiresAt < new Date() || patungan.status === "CANCELLED") {
    return NextResponse.json(
      { error: "This Patungan session has expired or was cancelled." },
      { status: 410 }
    );
  }

  return NextResponse.json({ patunganId: patungan.id });
}
