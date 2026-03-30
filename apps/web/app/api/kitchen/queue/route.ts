/**
 * GET /api/kitchen/queue?branchId=... — Fetch current queue state for the display screen.
 *
 * Public endpoint (no auth) — intended for TV/display devices in the customer waiting area.
 *
 * Returns orders in PREPARING and READY states for the given branch, today only (WIB date).
 * Orders are identified by their queue number for display purposes.
 *
 * Response:
 *   {
 *     branchId: string,
 *     restaurantName: string,
 *     logoUrl: string | null,
 *     branchName: string,
 *     preparing: number[],   // queue numbers currently being prepared
 *     ready: number[],       // queue numbers ready for pickup
 *   }
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { formatInTimeZone } from "date-fns-tz";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = req.nextUrl;
    const branchId = searchParams.get("branchId");

    if (!branchId) {
      return NextResponse.json(
        { error: "branchId is required" },
        { status: 400 }
      );
    }

    // Get today's date in WIB to scope the query to today's orders only
    const todayWIB = formatInTimeZone(new Date(), "Asia/Jakarta", "yyyy-MM-dd");
    const startOfTodayWIB = new Date(`${todayWIB}T00:00:00+07:00`);
    const endOfTodayWIB = new Date(`${todayWIB}T23:59:59+07:00`);

    // Fetch branch + restaurant info
    const branch = await prisma.branch.findUnique({
      where: { id: branchId },
      select: {
        name: true,
        restaurant: {
          select: {
            name: true,
            branding: { select: { logoUrl: true } },
          },
        },
      },
    });

    if (!branch) {
      return NextResponse.json({ error: "Branch not found" }, { status: 404 });
    }

    // Fetch PREPARING and READY orders for today
    const orders = await prisma.order.findMany({
      where: {
        branchId,
        status: { in: ["PREPARING", "READY"] },
        createdAt: { gte: startOfTodayWIB, lte: endOfTodayWIB },
      },
      select: {
        queueNumber: true,
        status: true,
      },
      orderBy: { queueNumber: "asc" },
    });

    const preparing = orders
      .filter((o) => o.status === "PREPARING")
      .map((o) => o.queueNumber);

    const ready = orders
      .filter((o) => o.status === "READY")
      .map((o) => o.queueNumber);

    return NextResponse.json(
      {
        branchId,
        restaurantName: branch.restaurant.name,
        logoUrl: branch.restaurant.branding?.logoUrl ?? null,
        branchName: branch.name,
        preparing,
        ready,
      },
      {
        headers: {
          // Short cache — display screen will poll as fallback
          "Cache-Control": "no-store",
        },
      }
    );
  } catch (err) {
    console.error("[GET /api/kitchen/queue]", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan. Silakan coba lagi." },
      { status: 500 }
    );
  }
}
