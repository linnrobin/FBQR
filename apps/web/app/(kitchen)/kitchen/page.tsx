/**
 * Kitchen display page — server component.
 * Route: /kitchen
 *
 * Auth: staff PIN session with kitchen:view permission.
 * Fetches initial orders + stations + branch info.
 * Passes to KitchenDisplay client component for real-time updates.
 *
 * Spec: docs/merchant.md § Screen 16 — Kitchen Display
 */
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { prisma } from "@repo/database";
import { getStaffSession, hasPermission } from "@/lib/auth/rbac";
import { KitchenDisplay } from "@/components/kitchen/kitchen-display";
import type { Metadata } from "next";
import type { KitchenOrderData } from "@/components/kitchen/kitchen-order-card";

export const metadata: Metadata = { title: "Kitchen Display" };

export default async function KitchenPage() {
  const cookieStore = await cookies();
  const staffSession = await getStaffSession(cookieStore);

  if (!staffSession) redirect("/kitchen/login");
  if (!hasPermission(staffSession.permissions, "kitchen:view")) {
    redirect("/kitchen/login?error=forbidden");
  }

  // Resolve staff → restaurant → branch
  const staff = await prisma.staff.findUnique({
    where: { id: staffSession.staffId },
    select: {
      restaurantId: true,
      restaurant: {
        select: {
          name: true,
          branches: {
            select: { id: true, name: true },
            orderBy: { createdAt: "asc" },
            take: 1,
          },
          settings: {
            select: {
              autoPrintKitchenTicket: true,
              printerConfig: true,
            },
          },
        },
      },
    },
  });

  if (!staff || !staff.restaurant) redirect("/kitchen/login");

  const restaurant = staff.restaurant;
  const branch = restaurant.branches[0];

  if (!branch) {
    // No branch configured — show empty state
    return (
      <div className="h-screen flex items-center justify-center bg-stone-950">
        <p className="text-stone-400">Tidak ada cabang yang dikonfigurasi.</p>
      </div>
    );
  }

  const [orders, stations] = await Promise.all([
    prisma.order.findMany({
      where: {
        branchId: branch.id,
        status: { in: ["CONFIRMED", "PREPARING", "READY"] },
      },
      select: {
        id: true,
        queueNumber: true,
        orderType: true,
        status: true,
        confirmedAt: true,
        createdAt: true,
        customerNote: true,
        table: { select: { name: true } },
        items: {
          select: {
            id: true,
            name: true,
            quantity: true,
            kitchenStationId: true,
            kitchenPriority: true,
            needsWeighing: true,
            weightValue: true,
            specialRequest: true,
            variantSnapshot: true,
            addonSnapshot: true,
          },
          orderBy: { kitchenPriority: "asc" },
        },
      },
      orderBy: { confirmedAt: "asc" },
    }),
    prisma.kitchenStation.findMany({
      where: { restaurantId: staff.restaurantId, isActive: true },
      select: { id: true, name: true, displayColor: true },
      orderBy: { name: "asc" },
    }),
  ]);

  // Serialize for client (Decimal → number, Date → string)
  const serializedOrders: KitchenOrderData[] = orders.map((order) => ({
    id: order.id,
    queueNumber: order.queueNumber,
    orderType: order.orderType,
    status: order.status,
    confirmedAt: order.confirmedAt?.toISOString() ?? null,
    createdAt: order.createdAt.toISOString(),
    customerNote: order.customerNote,
    table: order.table ? { name: order.table.name } : null,
    items: order.items.map((item) => ({
      id: item.id,
      name: item.name,
      quantity: item.quantity,
      kitchenStationId: item.kitchenStationId,
      kitchenPriority: item.kitchenPriority,
      needsWeighing: item.needsWeighing,
      weightValue: item.weightValue ? Number(item.weightValue) : null,
      specialRequest: item.specialRequest ?? null,
      variantSnapshot: item.variantSnapshot as { name: string } | null,
      addonSnapshot: item.addonSnapshot as
        | { name: string; quantity: number }[]
        | null,
    })),
  }));

  const autoPrint =
    restaurant.settings?.autoPrintKitchenTicket ?? true;

  return (
    <KitchenDisplay
      branchId={branch.id}
      restaurantName={restaurant.name}
      branchName={branch.name}
      initialOrders={serializedOrders}
      initialStations={stations}
      autoPrintKitchenTicket={autoPrint}
    />
  );
}
