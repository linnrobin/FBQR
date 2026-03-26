/**
 * PATCH /api/merchant/onboarding/step/[step] — save wizard step data
 *
 * Each step saves its data and advances Merchant.onboardingStep if the submitted
 * step number >= the current stored step.
 *
 * Step 1: Restaurant details (name, cuisineType, logoUrl, branchAddress)
 * Step 2: First menu — creates MenuCategory + up to 5 MenuItems
 * Step 3: First table — creates Table, generates qrToken, returns QR data URL
 * Step 4: Payment setup — sets MerchantSettings.paymentMode
 * Step 5: First staff — creates Staff (+ default role if none exists)
 *
 * Requires: active MERCHANT NextAuth session.
 */
import { NextRequest, NextResponse } from "next/server";
import { requireMerchant } from "@/lib/auth/session";
import { prisma } from "@repo/database";
import { z } from "zod";
import bcrypt from "bcryptjs";
import QRCode from "qrcode";

// =============================================================================
// Per-step schemas
// =============================================================================

const step1Schema = z.object({
  restaurantName: z.string().min(1, "Nama restoran wajib diisi").max(100),
  cuisineType: z.string().max(100).optional(),
  logoUrl: z.string().url().optional().or(z.literal("")),
  branchAddress: z.string().max(255).optional(),
});

const step2Schema = z.object({
  categoryName: z.string().min(1, "Nama kategori wajib diisi").max(100),
  items: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        price: z.number().int().min(0),
      })
    )
    .min(1, "Tambahkan minimal 1 item")
    .max(5, "Maksimal 5 item"),
});

const step3Schema = z.object({
  tableName: z.string().min(1, "Nama meja wajib diisi").max(50),
});

const step4Schema = z.object({
  paymentMode: z.enum(["PAY_FIRST", "PAY_AT_CASHIER", "BOTH"]),
});

const step5Schema = z.object({
  staff: z
    .array(
      z.object({
        name: z.string().min(1).max(100),
        pin: z.string().min(4).max(6).regex(/^\d+$/, "PIN hanya boleh angka"),
        roleName: z.string().max(50).optional(),
      })
    )
    .min(1)
    .max(10),
});

// =============================================================================
// Route handler
// =============================================================================

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ step: string }> }
) {
  const session = await requireMerchant();
  const merchantId = session.user.id;
  const { step } = await params;
  const stepNum = parseInt(step, 10);

  if (isNaN(stepNum) || stepNum < 1 || stepNum > 5) {
    return NextResponse.json({ error: "Invalid step" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);

  // Fetch merchant with restaurant + first branch
  const merchant = await prisma.merchant.findUnique({
    where: { id: merchantId },
    include: {
      restaurant: {
        include: {
          branches: { take: 1, orderBy: { createdAt: "asc" } },
          settings: true,
          branding: true,
        },
      },
    },
  });

  if (!merchant || !merchant.restaurant) {
    return NextResponse.json({ error: "Merchant not found" }, { status: 404 });
  }

  const restaurantId = merchant.restaurant.id;
  const branchId = merchant.restaurant.branches[0]?.id;

  // ==========================================================================
  // Step 1 — Restaurant details
  // ==========================================================================
  if (stepNum === 1) {
    const parsed = step1Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "invalid_input" },
        { status: 400 }
      );
    }

    const { restaurantName, cuisineType, logoUrl, branchAddress } = parsed.data;

    await prisma.$transaction([
      prisma.restaurant.update({
        where: { id: restaurantId },
        data: {
          name: restaurantName,
          cuisineType: cuisineType ?? null,
        },
      }),
      // Upsert branding record
      prisma.restaurantBranding.upsert({
        where: { restaurantId },
        create: {
          restaurantId,
          logoUrl: logoUrl || null,
        },
        update: {
          logoUrl: logoUrl || null,
        },
      }),
      // Update first branch address if provided
      ...(branchId && branchAddress
        ? [
            prisma.branch.update({
              where: { id: branchId },
              data: { address: branchAddress },
            }),
          ]
        : []),
      // Advance onboardingStep to at least 1
      prisma.merchant.update({
        where: { id: merchantId },
        data: {
          onboardingStep: Math.max(merchant.onboardingStep, 1),
        },
      }),
    ]);

    return NextResponse.json({ success: true, step: 1 });
  }

  // ==========================================================================
  // Step 2 — First menu
  // ==========================================================================
  if (stepNum === 2) {
    const parsed = step2Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "invalid_input" },
        { status: 400 }
      );
    }

    const { categoryName, items } = parsed.data;

    const category = await prisma.menuCategory.create({
      data: {
        restaurantId,
        name: categoryName,
        displayOrder: 0,
        items: {
          create: items.map((item, idx) => ({
            restaurantId,
            name: item.name,
            price: item.price,
            displayOrder: idx,
          })),
        },
      },
      select: { id: true },
    });

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        onboardingStep: Math.max(merchant.onboardingStep, 2),
      },
    });

    return NextResponse.json({ success: true, step: 2, categoryId: category.id });
  }

  // ==========================================================================
  // Step 3 — First table + QR code
  // ==========================================================================
  if (stepNum === 3) {
    if (!branchId) {
      return NextResponse.json(
        { error: "Branch not found. Complete step 1 first." },
        { status: 400 }
      );
    }

    const parsed = step3Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "invalid_input" },
        { status: 400 }
      );
    }

    const { tableName } = parsed.data;

    // Generate QR token (UUID via crypto)
    const qrToken = crypto.randomUUID();

    const table = await prisma.table.create({
      data: {
        branchId,
        name: tableName,
        qrToken,
        status: "AVAILABLE",
      },
      select: { id: true, name: true, qrToken: true },
    });

    // Generate QR code data URL encoding the customer menu URL
    const menuUrl = process.env.NEXT_PUBLIC_MENU_APP_URL ?? "http://localhost:3001";
    const qrUrl = `${menuUrl}/${restaurantId}/${qrToken}`;
    const qrDataUrl = await QRCode.toDataURL(qrUrl, {
      width: 240,
      margin: 2,
      color: { dark: "#1C1917", light: "#FFFFFF" },
    });

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        onboardingStep: Math.max(merchant.onboardingStep, 3),
      },
    });

    return NextResponse.json({
      success: true,
      step: 3,
      table: { id: table.id, name: table.name, qrToken: table.qrToken },
      qrDataUrl,
      qrUrl,
    });
  }

  // ==========================================================================
  // Step 4 — Payment setup
  // ==========================================================================
  if (stepNum === 4) {
    const parsed = step4Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "invalid_input" },
        { status: 400 }
      );
    }

    const { paymentMode } = parsed.data;
    const dbPaymentMode = paymentMode === "BOTH" ? "PAY_AT_CASHIER" : paymentMode;

    if (merchant.restaurant.settings) {
      await prisma.merchantSettings.update({
        where: { restaurantId },
        data: { paymentMode: dbPaymentMode },
      });
    } else {
      await prisma.merchantSettings.create({
        data: { restaurantId, paymentMode: dbPaymentMode },
      });
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        onboardingStep: Math.max(merchant.onboardingStep, 4),
      },
    });

    return NextResponse.json({ success: true, step: 4 });
  }

  // ==========================================================================
  // Step 5 — First staff
  // ==========================================================================
  if (stepNum === 5) {
    const parsed = step5Schema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.errors[0]?.message ?? "invalid_input" },
        { status: 400 }
      );
    }

    const { staff } = parsed.data;

    // Create all staff members (each may have a different role name)
    for (const member of staff) {
      const pinHash = await bcrypt.hash(member.pin, 10);

      // Find or create a role for this staff member
      let roleId: string | undefined;
      if (member.roleName) {
        // Look for an existing role with this name
        let role = await prisma.merchantRole.findFirst({
          where: { restaurantId, name: member.roleName },
        });
        if (!role) {
          role = await prisma.merchantRole.create({
            data: {
              restaurantId,
              name: member.roleName,
              permissions: ["orders:view", "kitchen:view"],
            },
          });
        }
        roleId = role.id;
      }

      const newStaff = await prisma.staff.create({
        data: {
          restaurantId,
          branchId: branchId ?? null,
          name: member.name,
          pinHash,
        },
        select: { id: true },
      });

      if (roleId) {
        await prisma.merchantRoleAssignment.create({
          data: { staffId: newStaff.id, merchantRoleId: roleId },
        });
      }
    }

    await prisma.merchant.update({
      where: { id: merchantId },
      data: {
        onboardingStep: Math.max(merchant.onboardingStep, 5),
      },
    });

    return NextResponse.json({ success: true, step: 5 });
  }

  return NextResponse.json({ error: "Invalid step" }, { status: 400 });
}
