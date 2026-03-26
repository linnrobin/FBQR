/**
 * CSV menu import.
 * Route: POST /api/merchant/menu/items/import
 *
 * Expects multipart/form-data with a "file" field (CSV).
 * CSV format: category,name,description,price,isHalal,isVegetarian,spiceLevel,variants,addons
 *
 * - Creates missing categories automatically.
 * - Returns { imported, errors } summary.
 */
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@repo/database";
import { requireMerchant } from "@/lib/auth/session";

interface CsvRow {
  category: string;
  name: string;
  description: string;
  price: string;
  isHalal: string;
  isVegetarian: string;
  spiceLevel: string;
  variants: string;
  addons: string;
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}

function parseCsv(text: string): CsvRow[] {
  const lines = text.split(/\r?\n/).filter((l) => l.trim());
  if (lines.length < 2) return [];

  const firstLine = lines[0];
  if (!firstLine) return [];

  const headers = parseCsvLine(firstLine).map((h) => h.toLowerCase());
  return lines.slice(1).map((line) => {
    const values = parseCsvLine(line);
    const row: Record<string, string> = {};
    headers.forEach((h, i) => {
      row[h] = values[i] ?? "";
    });
    return row as unknown as CsvRow;
  });
}

export async function POST(req: NextRequest) {
  const session = await requireMerchant();
  const restaurantId = session.user.restaurantId;
  if (!restaurantId) {
    return NextResponse.json({ error: "No restaurant found" }, { status: 404 });
  }

  const formData = await req.formData();
  const file = formData.get("file");
  if (!file || typeof file === "string") {
    return NextResponse.json({ error: "No CSV file provided" }, { status: 400 });
  }

  const text = await (file as Blob).text();
  const rows = parseCsv(text);

  if (rows.length === 0) {
    return NextResponse.json({ error: "CSV is empty or has no data rows" }, { status: 400 });
  }

  const imported: string[] = [];
  const errors: { row: number; error: string }[] = [];

  // Cache categories to avoid repeated DB hits
  const categoryCache = new Map<string, string>(); // name → id

  // Pre-load existing categories
  const existingCategories = await prisma.menuCategory.findMany({
    where: { restaurantId, deletedAt: null },
    select: { id: true, name: true },
  });
  for (const cat of existingCategories) {
    categoryCache.set(cat.name.toLowerCase(), cat.id);
  }

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const rowNum = i + 2; // 1-indexed, +1 for header

    if (!row) continue;

    try {
      // Validate required fields
      if (!row.category?.trim()) {
        errors.push({ row: rowNum, error: "category is required" });
        continue;
      }
      if (!row.name?.trim()) {
        errors.push({ row: rowNum, error: "name is required" });
        continue;
      }
      const price = parseInt(row.price, 10);
      if (isNaN(price) || price < 0) {
        errors.push({ row: rowNum, error: `Invalid price: "${row.price}"` });
        continue;
      }

      // Get or create category
      const catKey = row.category.trim().toLowerCase();
      let categoryId = categoryCache.get(catKey);
      if (!categoryId) {
        const maxOrder = await prisma.menuCategory.aggregate({
          where: { restaurantId, deletedAt: null },
          _max: { displayOrder: true },
        });
        const newCat = await prisma.menuCategory.create({
          data: {
            restaurantId,
            name: row.category.trim(),
            displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
          },
        });
        categoryId = newCat.id;
        categoryCache.set(catKey, categoryId);
      }

      // Parse optional fields
      const isHalal = row.isHalal?.toLowerCase() === "true";
      const isVegetarian = row.isVegetarian?.toLowerCase() === "true";
      const spiceLevel = row.spiceLevel ? parseInt(row.spiceLevel, 10) : null;

      // Parse variants: "Name:Delta,Name2:Delta2"
      const variants = row.variants
        ? row.variants.split(",").filter(Boolean).map((v, idx) => {
            const parts = v.trim().split(":");
            const vName = parts[0] ?? "";
            const delta = parts[1];
            return {
              name: vName.trim(),
              priceDelta: delta ? parseInt(delta.trim(), 10) || 0 : 0,
              sortOrder: idx,
            };
          })
        : [];

      // Parse addons: "Name:Delta,Name2:Delta2"
      const addons = row.addons
        ? row.addons.split(",").filter(Boolean).map((a, idx) => {
            const parts = a.trim().split(":");
            const aName = parts[0] ?? "";
            const delta = parts[1];
            return {
              name: aName.trim(),
              priceDelta: delta ? parseInt(delta.trim(), 10) || 0 : 0,
              sortOrder: idx,
            };
          })
        : [];

      const maxOrder = await prisma.menuItem.aggregate({
        where: { categoryId, deletedAt: null },
        _max: { displayOrder: true },
      });

      await prisma.menuItem.create({
        data: {
          restaurantId,
          categoryId,
          name: row.name.trim(),
          description: row.description?.trim() || null,
          price,
          isHalal,
          isVegetarian,
          spiceLevel: spiceLevel != null && !isNaN(spiceLevel) ? Math.min(3, Math.max(0, spiceLevel)) : null,
          displayOrder: (maxOrder._max.displayOrder ?? 0) + 1,
          variants: { create: variants },
          addons: { create: addons },
        },
      });

      imported.push(row.name.trim());
    } catch (err) {
      errors.push({
        row: rowNum,
        error: err instanceof Error ? err.message : "Unknown error",
      });
    }
  }

  return NextResponse.json({ imported: imported.length, errors });
}
