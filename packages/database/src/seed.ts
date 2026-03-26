/**
 * FBQR Database Seed Script
 * See docs/data-models.md § Seed Script Specification for the full spec.
 *
 * Creates (idempotently):
 * 1. PlatformSettings singleton (id = 1)
 * 2. Default SubscriptionPlan rows (Starter, Pro, Enterprise)
 * 3. First FBQRSYS SystemAdmin (from env vars FBQRSYS_ADMIN_EMAIL / FBQRSYS_ADMIN_PASSWORD)
 * 4. Demo merchant with restaurant, branch, menu, staff, tables (dev only — skipped in production)
 *
 * Run with: npm run db:seed (from packages/database or repo root)
 */

import bcrypt from "bcryptjs";
import { randomUUID } from "crypto";
import { prisma } from "./index";

async function main() {
  console.log("🌱 Starting FBQR seed...");

  await seedPlatformSettings();
  await seedSubscriptionPlans();
  await seedSystemAdmin();

  if (process.env.NODE_ENV !== "production") {
    await seedDemoMerchant();
  } else {
    console.log("⏭  Production mode — skipping demo merchant seed.");
  }

  console.log("✅ Seed complete.");
}

// ─────────────────────────────────────────────────────────────────────────────
// 1. PlatformSettings singleton
// ─────────────────────────────────────────────────────────────────────────────

async function seedPlatformSettings() {
  await prisma.platformSettings.upsert({
    where: { id: 1 },
    create: {},
    update: {},
  });
  console.log("  ✓ PlatformSettings singleton ready");
}

// ─────────────────────────────────────────────────────────────────────────────
// 2. Default SubscriptionPlan rows
// ─────────────────────────────────────────────────────────────────────────────

async function seedSubscriptionPlans() {
  const plans = [
    {
      name: "Starter",
      description: "Perfect for small cafes just getting started.",
      priceMonthly: 149000,
      priceAnnual: 1490000,
      features: JSON.stringify([
        "Up to 20 menu items",
        "1 branch",
        "10 tables",
        "Basic analytics",
        "Email support",
      ]),
      tableLimitCount: 10,
      menuItemLimitCount: 20,
      branchLimitCount: 1,
      layoutAllowed: ["GRID", "LIST"],
    },
    {
      name: "Pro",
      description: "For growing restaurants ready to scale.",
      priceMonthly: 349000,
      priceAnnual: 3490000,
      features: JSON.stringify([
        "Unlimited menu items",
        "Up to 3 branches",
        "50 tables per branch",
        "Advanced analytics",
        "All layouts (Grid, List, Bundle, Spotlight)",
        "Priority support",
        "Kitchen display system",
      ]),
      tableLimitCount: 50,
      menuItemLimitCount: null,
      branchLimitCount: 3,
      layoutAllowed: [],
    },
    {
      name: "Enterprise",
      description: "Full power for restaurant chains and franchises.",
      priceMonthly: 799000,
      priceAnnual: 7990000,
      features: JSON.stringify([
        "Unlimited everything",
        "Unlimited branches",
        "Dedicated account manager",
        "Custom integrations",
        "SLA guarantee",
        "WhatsApp Business integration",
        "AI recommendations",
      ]),
      tableLimitCount: null,
      menuItemLimitCount: null,
      branchLimitCount: null,
      layoutAllowed: [],
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: {
        // Use name as upsert key since we don't have a stable ID across runs
        // This works because plan names are unique in our seed
        id: await getOrCreatePlanId(plan.name),
      },
      create: plan,
      update: {
        priceMonthly: plan.priceMonthly,
        priceAnnual: plan.priceAnnual,
        features: plan.features,
        tableLimitCount: plan.tableLimitCount,
        menuItemLimitCount: plan.menuItemLimitCount,
        branchLimitCount: plan.branchLimitCount,
        layoutAllowed: plan.layoutAllowed,
      },
    });
  }
  console.log("  ✓ SubscriptionPlan rows ready (Starter, Pro, Enterprise)");
}

async function getOrCreatePlanId(name: string): Promise<string> {
  const existing = await prisma.subscriptionPlan.findFirst({ where: { name } });
  return existing?.id ?? randomUUID();
}

// ─────────────────────────────────────────────────────────────────────────────
// 3. First FBQRSYS SystemAdmin
// ─────────────────────────────────────────────────────────────────────────────

async function seedSystemAdmin() {
  const email = process.env.FBQRSYS_ADMIN_EMAIL;
  const password = process.env.FBQRSYS_ADMIN_PASSWORD;

  if (!email || !password) {
    console.warn(
      "  ⚠  FBQRSYS_ADMIN_EMAIL or FBQRSYS_ADMIN_PASSWORD not set — skipping SystemAdmin seed."
    );
    return;
  }

  const existing = await prisma.systemAdmin.findUnique({ where: { email } });

  if (existing) {
    console.log(`  ✓ SystemAdmin already exists: ${email}`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  // Create a "Platform Owner" SystemRole with all FBQRSYS permissions
  const role = await prisma.systemRole.create({
    data: {
      name: "Platform Owner",
      permissions: [
        "merchants:manage",
        "merchants:view",
        "subscriptions:manage",
        "billing:manage",
        "billing:view",
        "settings:manage",
        "admins:manage",
        "audit:view",
        "analytics:view",
      ],
    },
  });

  const admin = await prisma.systemAdmin.create({
    data: {
      email,
      passwordHash,
      mustChangePassword: true,
      roleAssignments: {
        create: { systemRoleId: role.id },
      },
    },
  });

  console.log(
    `  ✓ SystemAdmin created: ${admin.email} (mustChangePassword = true)`
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// 4. Demo merchant (dev only)
// ─────────────────────────────────────────────────────────────────────────────

async function seedDemoMerchant() {
  const DEMO_EMAIL = "demo@fbqr.app";

  const existing = await prisma.merchant.findUnique({
    where: { email: DEMO_EMAIL },
  });

  if (existing) {
    console.log("  ✓ Demo merchant already exists — skipping.");
    return;
  }

  const passwordHash = await bcrypt.hash("demo123456", 12);
  const trialEndsAt = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000);

  // Get Pro plan for the demo subscription
  const proPlan = await prisma.subscriptionPlan.findFirst({
    where: { name: "Pro" },
  });
  if (!proPlan) throw new Error("Pro plan not found — run plan seed first");

  // ── Merchant + Restaurant + Settings + Branding ──────────────────────────
  const merchant = await prisma.merchant.create({
    data: {
      email: DEMO_EMAIL,
      passwordHash,
      status: "TRIAL",
      trialEndsAt,
      emailVerifiedAt: new Date(),
      privacyConsentAt: new Date(),
      referralCode: "DEMO2026",

      restaurant: {
        create: {
          name: "Demo Warung FBQR",
          slug: "demo-warung-fbqr",
          description:
            "A demo restaurant to explore all FBQR features. Silakan mencoba!",
          address: "Jl. Demo No. 1, Jakarta Selatan",
          city: "Jakarta",
          country: "ID",
          phone: "+6281234567890",
          email: "warung@demo.fbqr.app",
          cuisineType: "Indonesian",
          whatsappNumber: "+6281234567890",

          branding: {
            create: {
              primaryColor: "#FF6B35",
              secondaryColor: "#2D3748",
              accentColor: "#48BB78",
              fontFamily: "Inter",
              menuLayout: "GRID",
            },
          },

          settings: {
            create: {
              paymentMode: "PAY_FIRST",
              paymentTimeoutMinutes: 15,
              tableSessionTimeoutMinutes: 120,
              enableDirtyState: false,
              aiShowBestsellers: true,
            },
          },
        },
      },
    },
    include: {
      restaurant: true,
    },
  });

  const restaurant = merchant.restaurant!;

  // ── Subscription ─────────────────────────────────────────────────────────
  await prisma.merchantSubscription.create({
    data: {
      merchantId: merchant.id,
      planId: proPlan.id,
      cycle: "MONTHLY",
      currentPeriodStart: new Date(),
      currentPeriodEnd: trialEndsAt,
      autoRenew: true,
    },
  });

  // ── Kitchen Stations ─────────────────────────────────────────────────────
  const kitchenStation = await prisma.kitchenStation.create({
    data: {
      restaurantId: restaurant.id,
      name: "Kitchen",
      displayColor: "#8B5CF6",
      isActive: true,
    },
  });

  const barStation = await prisma.kitchenStation.create({
    data: {
      restaurantId: restaurant.id,
      name: "Bar",
      displayColor: "#F59E0B",
      isActive: true,
    },
  });

  // Set defaultStationId on restaurant
  await prisma.restaurant.update({
    where: { id: restaurant.id },
    data: { defaultStationId: kitchenStation.id },
  });

  // ── Branch ────────────────────────────────────────────────────────────────
  const branch = await prisma.branch.create({
    data: {
      restaurantId: restaurant.id,
      name: "Main Branch",
      address: "Jl. Demo No. 1, Jakarta Selatan",
      city: "Jakarta",
      branchCode: "DEMO",
    },
  });

  // ── Staff (PIN: 1234) ─────────────────────────────────────────────────────
  const staffPinHash = await bcrypt.hash("1234", 12);

  const staffRole = await prisma.merchantRole.create({
    data: {
      restaurantId: restaurant.id,
      name: "Kitchen Staff",
      permissions: ["orders:view", "orders:update", "kitchen:view"],
    },
  });

  const staff = await prisma.staff.create({
    data: {
      restaurantId: restaurant.id,
      branchId: branch.id,
      name: "Demo Staff",
      pinHash: staffPinHash,
      isActive: true,
      roleAssignments: {
        create: { merchantRoleId: staffRole.id },
      },
    },
  });

  console.log(
    `  ✓ Demo Staff created: "${staff.name}" (PIN: 1234, role: Kitchen Staff)`
  );

  // ── Tables with pre-generated QR tokens ──────────────────────────────────
  const tableNames = ["Meja 1", "Meja 2", "Meja 3", "Meja 4", "Meja 5"];
  const tables = await Promise.all(
    tableNames.map((name) =>
      prisma.table.create({
        data: {
          branchId: branch.id,
          name,
          qrToken: randomUUID(),
          status: "AVAILABLE",
          capacity: 4,
        },
      })
    )
  );

  console.log(`  ✓ ${tables.length} tables created for demo branch`);

  // ── Menu: Makanan category ─────────────────────────────────────────────────
  const foodCategory = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      kitchenStationId: kitchenStation.id,
      name: "Makanan",
      description: "Hidangan utama pilihan chef kami",
      displayOrder: 1,
    },
  });

  const drinkCategory = await prisma.menuCategory.create({
    data: {
      restaurantId: restaurant.id,
      kitchenStationId: barStation.id,
      name: "Minuman",
      description: "Minuman segar dan hangat",
      displayOrder: 2,
    },
  });

  // ── Menu Items ────────────────────────────────────────────────────────────
  const foodItems = [
    {
      name: "Nasi Goreng Spesial",
      description:
        "Nasi goreng dengan telur mata sapi, ayam suwir, dan kerupuk",
      price: 35000,
      estimatedPrepTime: 10,
      isHalal: true,
      displayOrder: 1,
    },
    {
      name: "Mie Goreng Jawa",
      description: "Mie goreng khas Jawa dengan kecap manis dan sayuran segar",
      price: 30000,
      estimatedPrepTime: 8,
      isHalal: true,
      displayOrder: 2,
    },
    {
      name: "Ayam Bakar Madu",
      description: "Ayam kampung bakar dengan bumbu madu dan rempah pilihan",
      price: 55000,
      estimatedPrepTime: 20,
      isHalal: true,
      displayOrder: 3,
    },
    {
      name: "Gado-Gado Jakarta",
      description:
        "Sayuran rebus segar dengan saus kacang dan kerupuk udang",
      price: 28000,
      estimatedPrepTime: 5,
      isHalal: true,
      isVegetarian: true,
      displayOrder: 4,
    },
  ];

  for (const item of foodItems) {
    const menuItem = await prisma.menuItem.create({
      data: {
        categoryId: foodCategory.id,
        restaurantId: restaurant.id,
        priceType: "FIXED",
        isAvailable: true,
        isVegetarian: item.isVegetarian ?? false,
        ...item,
      },
    });

    // Add size variants to Nasi Goreng
    if (item.name === "Nasi Goreng Spesial") {
      await prisma.menuItemVariant.createMany({
        data: [
          { menuItemId: menuItem.id, name: "Porsi Biasa", priceDelta: 0 },
          { menuItemId: menuItem.id, name: "Porsi Jumbo (+50%)", priceDelta: 17500 },
        ],
      });
      await prisma.menuItemAddon.createMany({
        data: [
          { menuItemId: menuItem.id, name: "Extra Telur", price: 5000 },
          { menuItemId: menuItem.id, name: "Extra Ayam", price: 10000 },
          { menuItemId: menuItem.id, name: "Pedas Ekstra", price: 0 },
        ],
      });
    }
  }

  const drinkItems = [
    {
      name: "Es Teh Manis",
      description: "Teh manis dingin, minuman favorit semua kalangan",
      price: 8000,
      estimatedPrepTime: 2,
      isHalal: true,
      isVegetarian: true,
      displayOrder: 1,
    },
    {
      name: "Es Jeruk Peras",
      description: "Jeruk segar diperas langsung, manis asam menyegarkan",
      price: 12000,
      estimatedPrepTime: 3,
      isHalal: true,
      isVegetarian: true,
      displayOrder: 2,
    },
    {
      name: "Kopi Susu Gula Aren",
      description: "Kopi robusta dengan susu segar dan gula aren asli",
      price: 18000,
      estimatedPrepTime: 5,
      isHalal: true,
      displayOrder: 3,
    },
    {
      name: "Jus Alpukat",
      description: "Alpukat segar blender dengan susu dan sedikit madu",
      price: 22000,
      estimatedPrepTime: 5,
      isHalal: true,
      isVegetarian: true,
      displayOrder: 4,
    },
  ];

  for (const item of drinkItems) {
    await prisma.menuItem.create({
      data: {
        categoryId: drinkCategory.id,
        restaurantId: restaurant.id,
        priceType: "FIXED",
        isAvailable: true,
        ...item,
      },
    });
  }

  console.log(
    `  ✓ Demo menu created: ${foodItems.length} food items, ${drinkItems.length} drink items`
  );
  console.log(`  ✓ Demo merchant ready:`);
  console.log(`      Email:    ${DEMO_EMAIL}`);
  console.log(`      Password: demo123456`);
  console.log(`      Status:   TRIAL (expires ${trialEndsAt.toISOString().split("T")[0]})`);
  console.log(`      Tables:   ${tables.length} (scan qrToken from DB to test)`);
}

// ─────────────────────────────────────────────────────────────────────────────

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
