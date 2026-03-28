/**
 * Shared auditLog() helper — wraps prisma.auditLog.create().
 *
 * All state-changing API routes MUST use this helper rather than
 * writing inline prisma.auditLog.create() calls. This ensures
 * consistent shape and non-fatal behavior (errors are logged, not thrown).
 *
 * actorName must be "System" (the literal string) for SYSTEM events.
 */
import { prisma } from "@repo/database";

export interface AuditParams {
  actorId?: string | null;
  actorType: "STAFF" | "MERCHANT" | "ADMIN" | "CUSTOMER" | "SYSTEM";
  actorRole?: string | null;
  actorName?: string | null;
  action: string;
  entity: string;
  entityId?: string | null;
  oldValue?: unknown;
  newValue?: unknown;
  ipAddress?: string | null;
  userAgent?: string | null;
  restaurantId?: string | null;
}

export async function auditLog(params: AuditParams): Promise<void> {
  try {
    await prisma.auditLog.create({
      data: {
        actorId: params.actorId ?? null,
        actorType: params.actorType,
        actorRole: params.actorRole ?? null,
        actorName: params.actorName ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId ?? null,
        oldValue: params.oldValue !== undefined ? (params.oldValue as object) : undefined,
        newValue: params.newValue !== undefined ? (params.newValue as object) : undefined,
        ipAddress: params.ipAddress ?? null,
        userAgent: params.userAgent ?? null,
        restaurantId: params.restaurantId ?? null,
      },
    });
  } catch (err) {
    // Non-fatal: audit log failures must never break the primary operation
    console.error("[auditLog] Failed to write audit entry:", err);
  }
}

/** Extract IP and User-Agent from a Next.js request. */
export function getRequestMeta(req: Request): {
  ipAddress: string | null;
  userAgent: string | null;
} {
  const ipAddress =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ??
    req.headers.get("x-real-ip") ??
    null;
  const userAgent = req.headers.get("user-agent") ?? null;
  return { ipAddress, userAgent };
}
