/**
 * GET /api/fbqrsys/audit-log
 *
 * Returns a paginated list of audit log entries for FBQRSYS admins.
 * Requires: reports:read
 *
 * Query params:
 *   search        — full-text search on actorName, entity, entityId
 *   actorType     — filter by ActorType (STAFF|MERCHANT|ADMIN|CUSTOMER|SYSTEM)
 *   action        — filter by action verb (CREATE|UPDATE|DELETE|LOGIN|...)
 *   entity        — filter by entity name (Order|MenuItem|Staff|...)
 *   restaurantId  — filter by restaurant
 *   dateFrom      — ISO date string (inclusive)
 *   dateTo        — ISO date string (inclusive, end-of-day)
 *   page          — page number (default 1)
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireSystemAdmin } from "@/lib/auth/session";
import {
  getSystemAdminPermissions,
  hasPermission,
  forbiddenResponse,
} from "@/lib/auth/rbac";

const PAGE_SIZE = 50;

export async function GET(req: NextRequest) {
  const session = await requireSystemAdmin();
  const permissions = await getSystemAdminPermissions(session.user.id);
  if (!hasPermission(permissions, "reports:read")) {
    return NextResponse.json(forbiddenResponse("reports:read"), { status: 403 });
  }

  const { searchParams } = req.nextUrl;
  const search = searchParams.get("search")?.trim() ?? "";
  const actorType = searchParams.get("actorType") ?? "";
  const action = searchParams.get("action") ?? "";
  const entity = searchParams.get("entity") ?? "";
  const restaurantId = searchParams.get("restaurantId") ?? "";
  const dateFrom = searchParams.get("dateFrom") ?? "";
  const dateTo = searchParams.get("dateTo") ?? "";
  const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10));

  // Build where clause
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const where: Record<string, any> = {};

  if (actorType && actorType !== "ALL") {
    where.actorType = actorType;
  }
  if (action && action !== "ALL") {
    where.action = action;
  }
  if (entity && entity !== "ALL") {
    where.entity = entity;
  }
  if (restaurantId && restaurantId !== "ALL") {
    where.restaurantId = restaurantId;
  }
  if (dateFrom || dateTo) {
    where.createdAt = {};
    if (dateFrom) {
      where.createdAt.gte = new Date(dateFrom);
    }
    if (dateTo) {
      // End of day
      const end = new Date(dateTo);
      end.setHours(23, 59, 59, 999);
      where.createdAt.lte = end;
    }
  }
  if (search) {
    where.OR = [
      { actorName: { contains: search, mode: "insensitive" } },
      { entity: { contains: search, mode: "insensitive" } },
      { entityId: { contains: search, mode: "insensitive" } },
    ];
  }

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
      select: {
        id: true,
        actorId: true,
        actorType: true,
        actorRole: true,
        actorName: true,
        action: true,
        entity: true,
        entityId: true,
        oldValue: true,
        newValue: true,
        ipAddress: true,
        userAgent: true,
        restaurantId: true,
        createdAt: true,
        restaurant: { select: { name: true } },
      },
    }),
    prisma.auditLog.count({ where }),
  ]);

  return NextResponse.json({
    logs,
    total,
    page,
    pageSize: PAGE_SIZE,
    totalPages: Math.ceil(total / PAGE_SIZE),
  });
}
