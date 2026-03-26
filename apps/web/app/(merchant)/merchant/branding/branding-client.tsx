"use client";

/**
 * Branding settings client component.
 * Handles color pickers, font/radius/layout selectors, live preview, and
 * WCAG contrast warnings.
 */
import { useState, useTransition } from "react";
import Link from "next/link";
import { ArrowLeft, AlertTriangle, CheckCircle2, Loader2 } from "lucide-react";

// ── Types ─────────────────────────────────────────────────────────────────────

type BorderRadius = "sharp" | "rounded" | "pill";
type MenuLayout = "GRID" | "LIST" | "BUNDLE" | "SPOTLIGHT";

interface BrandingValues {
  logoUrl: string;
  bannerUrl: string;
  primaryColor: string;
  secondaryColor: string;
  fontFamily: string;
  borderRadius: BorderRadius;
  menuLayout: MenuLayout;
}

interface Props {
  initialBranding: BrandingValues;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const FONT_OPTIONS = [
  "Inter",
  "Poppins",
  "Lato",
  "Playfair Display",
  "Montserrat",
  "Nunito",
  "Raleway",
  "Source Sans Pro",
];

const BORDER_RADIUS_OPTIONS: { value: BorderRadius; label: string }[] = [
  { value: "sharp", label: "Kotak (Tajam)" },
  { value: "rounded", label: "Bulat Sedang" },
  { value: "pill", label: "Pil (Sangat Bulat)" },
];

const LAYOUT_OPTIONS: { value: MenuLayout; label: string; desc: string }[] = [
  { value: "GRID", label: "Grid", desc: "Kartu gambar 2 kolom" },
  { value: "LIST", label: "List", desc: "Baris horizontal dengan gambar kecil" },
  { value: "BUNDLE", label: "Bundle", desc: "Paket dan kombo ditonjolkan" },
  { value: "SPOTLIGHT", label: "Spotlight", desc: "Hero item besar di atas" },
];

// ── WCAG Contrast helpers ─────────────────────────────────────────────────────

function hexToLinear(hex: string): number {
  const n = parseInt(hex, 16) / 255;
  return n <= 0.03928 ? n / 12.92 : Math.pow((n + 0.055) / 1.055, 2.4);
}

function relativeLuminance(color: string): number {
  const clean = color.replace("#", "");
  if (clean.length !== 6) return 0;
  const r = hexToLinear(clean.slice(0, 2));
  const g = hexToLinear(clean.slice(2, 4));
  const b = hexToLinear(clean.slice(4, 6));
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

function contrastRatio(c1: string, c2: string): number {
  const l1 = relativeLuminance(c1);
  const l2 = relativeLuminance(c2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

function getClientWcagWarnings(primary: string, secondary: string): string[] {
  const warnings: string[] = [];
  const WHITE = "#FFFFFF";
  const SURFACE = "#FAFAF9";
  const MIN = 4.5;

  if (primary.length === 7) {
    const r1 = contrastRatio(primary, SURFACE);
    if (r1 < MIN)
      warnings.push(
        `Warna utama pada latar putih: ${r1.toFixed(1)}:1 (min ${MIN}:1)`
      );
    const r2 = contrastRatio(WHITE, primary);
    if (r2 < MIN)
      warnings.push(
        `Teks putih pada tombol: ${r2.toFixed(1)}:1 (min ${MIN}:1)`
      );
  }
  if (secondary.length === 7) {
    const r3 = contrastRatio(secondary, SURFACE);
    if (r3 < MIN)
      warnings.push(
        `Warna sekunder pada latar putih: ${r3.toFixed(1)}:1 (min ${MIN}:1)`
      );
  }
  return warnings;
}

// ── Border radius mapping for preview ────────────────────────────────────────

function borderRadiusCss(br: BorderRadius): string {
  if (br === "sharp") return "4px";
  if (br === "pill") return "9999px";
  return "12px";
}

// ── Component ─────────────────────────────────────────────────────────────────

export function BrandingClient({ initialBranding }: Props) {
  const [values, setValues] = useState<BrandingValues>(initialBranding);
  const [isPending, startTransition] = useTransition();
  const [saveStatus, setSaveStatus] = useState<
    "idle" | "success" | "error"
  >("idle");
  const [serverWarnings, setServerWarnings] = useState<string[]>([]);
  const [errorMsg, setErrorMsg] = useState<string>("");

  const clientWarnings = getClientWcagWarnings(
    values.primaryColor,
    values.secondaryColor
  );

  function update<K extends keyof BrandingValues>(
    key: K,
    val: BrandingValues[K]
  ) {
    setValues((prev) => ({ ...prev, [key]: val }));
    setSaveStatus("idle");
  }

  function handleSave() {
    startTransition(async () => {
      setSaveStatus("idle");
      setServerWarnings([]);
      setErrorMsg("");

      try {
        const res = await fetch("/api/merchant/branding", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            logoUrl: values.logoUrl || null,
            bannerUrl: values.bannerUrl || null,
            primaryColor: values.primaryColor,
            secondaryColor: values.secondaryColor,
            fontFamily: values.fontFamily,
            borderRadius: values.borderRadius,
            menuLayout: values.menuLayout,
          }),
        });

        const json = await res.json();

        if (!res.ok) {
          setErrorMsg(json.error ?? "Gagal menyimpan branding.");
          setSaveStatus("error");
          return;
        }

        if (json.wcagWarnings?.length) {
          setServerWarnings(json.wcagWarnings);
        }
        setSaveStatus("success");
      } catch {
        setErrorMsg("Terjadi kesalahan jaringan.");
        setSaveStatus("error");
      }
    });
  }

  const br = borderRadiusCss(values.borderRadius);

  return (
    <div className="min-h-screen bg-stone-50">
      {/* Header */}
      <header className="bg-white border-b border-stone-200 px-6 py-4 flex items-center gap-4">
        <Link
          href="/merchant/dashboard"
          className="text-stone-400 hover:text-stone-600 transition-colors"
        >
          <ArrowLeft size={20} />
        </Link>
        <div>
          <h1 className="text-lg font-bold text-stone-900">
            Branding &amp; Tampilan
          </h1>
          <p className="text-xs text-stone-500">
            Kustomisasi tampilan menu pelanggan Anda
          </p>
        </div>
      </header>

      <div className="max-w-6xl mx-auto px-6 py-8 grid grid-cols-1 lg:grid-cols-5 gap-8">
        {/* ── Left: Form ── */}
        <div className="lg:col-span-3 space-y-6">
          {/* Images */}
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900">
              Logo &amp; Banner
            </h2>

            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700">
                URL Logo Restoran
              </label>
              <input
                type="url"
                value={values.logoUrl}
                onChange={(e) => update("logoUrl", e.target.value)}
                placeholder="https://..."
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-stone-400">
                Gambar persegi, WebP/PNG/JPG, maks 800×800px
              </p>
            </div>

            <div className="space-y-1">
              <label className="text-sm font-medium text-stone-700">
                URL Banner (opsional)
              </label>
              <input
                type="url"
                value={values.bannerUrl}
                onChange={(e) => update("bannerUrl", e.target.value)}
                placeholder="https://..."
                className="w-full border border-stone-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-500"
              />
              <p className="text-xs text-stone-400">
                Gambar horizontal, WebP/PNG/JPG, rasio 16:5
              </p>
            </div>
          </section>

          {/* Colors */}
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Warna</h2>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">
                  Warna Utama
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={values.primaryColor}
                    onChange={(e) => update("primaryColor", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-stone-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={values.primaryColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) update("primaryColor", v);
                    }}
                    maxLength={7}
                    className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-sm font-medium text-stone-700">
                  Warna Sekunder
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={values.secondaryColor}
                    onChange={(e) => update("secondaryColor", e.target.value)}
                    className="h-9 w-14 cursor-pointer rounded border border-stone-300 p-0.5"
                  />
                  <input
                    type="text"
                    value={values.secondaryColor}
                    onChange={(e) => {
                      const v = e.target.value;
                      if (/^#[0-9A-Fa-f]{0,6}$/.test(v)) update("secondaryColor", v);
                    }}
                    maxLength={7}
                    className="flex-1 border border-stone-300 rounded-md px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-orange-500"
                  />
                </div>
              </div>
            </div>

            {/* WCAG warnings — live, warn-only */}
            {clientWarnings.length > 0 && (
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 space-y-1">
                <div className="flex items-center gap-1.5 text-amber-700 font-medium text-sm">
                  <AlertTriangle size={14} />
                  Peringatan Kontras Warna (WCAG 2.1 AA)
                </div>
                <ul className="space-y-0.5">
                  {clientWarnings.map((w, i) => (
                    <li key={i} className="text-xs text-amber-700">
                      • {w}
                    </li>
                  ))}
                </ul>
                <p className="text-xs text-amber-600 mt-1">
                  Kontras kurang — pelanggan mungkin kesulitan membaca. Anda tetap
                  bisa menyimpan, namun sebaiknya pilih warna yang lebih gelap/terang.
                </p>
              </div>
            )}
          </section>

          {/* Typography */}
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900">Font</h2>
            <div className="grid grid-cols-2 gap-2">
              {FONT_OPTIONS.map((font) => (
                <button
                  key={font}
                  type="button"
                  onClick={() => update("fontFamily", font)}
                  style={{ fontFamily: font }}
                  className={`px-3 py-2.5 rounded-lg border text-sm text-left transition-all ${
                    values.fontFamily === font
                      ? "border-orange-500 bg-orange-50 text-orange-700 font-medium"
                      : "border-stone-200 text-stone-700 hover:border-stone-400"
                  }`}
                >
                  {font}
                </button>
              ))}
            </div>
          </section>

          {/* Border Radius */}
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900">
              Gaya Sudut (Border Radius)
            </h2>
            <div className="flex gap-3">
              {BORDER_RADIUS_OPTIONS.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("borderRadius", value)}
                  className={`flex-1 px-3 py-2 border text-sm font-medium transition-all ${
                    values.borderRadius === value
                      ? "border-orange-500 bg-orange-50 text-orange-700"
                      : "border-stone-200 text-stone-700 hover:border-stone-400"
                  }`}
                  style={{
                    borderRadius: borderRadiusCss(value),
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </section>

          {/* Menu Layout */}
          <section className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
            <h2 className="text-base font-semibold text-stone-900">
              Layout Menu Default
            </h2>
            <div className="grid grid-cols-2 gap-3">
              {LAYOUT_OPTIONS.map(({ value, label, desc }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => update("menuLayout", value)}
                  className={`px-4 py-3 border rounded-lg text-left transition-all ${
                    values.menuLayout === value
                      ? "border-orange-500 bg-orange-50"
                      : "border-stone-200 hover:border-stone-400"
                  }`}
                >
                  <p
                    className={`text-sm font-semibold ${
                      values.menuLayout === value
                        ? "text-orange-700"
                        : "text-stone-800"
                    }`}
                  >
                    {label}
                  </p>
                  <p className="text-xs text-stone-500 mt-0.5">{desc}</p>
                </button>
              ))}
            </div>
          </section>

          {/* Save button */}
          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={handleSave}
              disabled={isPending}
              className="flex items-center gap-2 bg-orange-600 hover:bg-orange-700 disabled:opacity-50 text-white font-medium text-sm px-6 py-2.5 rounded-lg transition-colors"
            >
              {isPending && <Loader2 size={14} className="animate-spin" />}
              Simpan Branding
            </button>

            {saveStatus === "success" && (
              <div className="flex items-center gap-1.5 text-green-600 text-sm font-medium">
                <CheckCircle2 size={16} />
                Berhasil disimpan!
              </div>
            )}

            {saveStatus === "error" && (
              <p className="text-red-600 text-sm">{errorMsg}</p>
            )}
          </div>

          {/* Server WCAG warnings (after save) */}
          {serverWarnings.length > 0 && saveStatus === "success" && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-center gap-1.5 text-amber-700 font-medium text-sm mb-1">
                <AlertTriangle size={14} />
                Peringatan kontras dari server:
              </div>
              <ul className="space-y-0.5">
                {serverWarnings.map((w, i) => (
                  <li key={i} className="text-xs text-amber-700">• {w}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* ── Right: Live Preview ── */}
        <div className="lg:col-span-2">
          <div className="sticky top-6">
            <p className="text-xs font-semibold text-stone-500 uppercase tracking-wide mb-3">
              Pratinjau Menu
            </p>

            {/* Phone frame */}
            <div className="border-4 border-stone-800 rounded-3xl overflow-hidden shadow-xl mx-auto max-w-xs">
              {/* Menu header preview */}
              <div
                style={{ backgroundColor: values.primaryColor }}
                className="px-4 py-5"
              >
                <div className="flex items-center gap-3 mb-4">
                  {values.logoUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={values.logoUrl}
                      alt="Logo"
                      className="w-10 h-10 object-cover"
                      style={{ borderRadius: br }}
                    />
                  ) : (
                    <div
                      className="w-10 h-10 bg-white/30"
                      style={{ borderRadius: br }}
                    />
                  )}
                  <div>
                    <p
                      className="font-bold text-sm text-white leading-tight"
                      style={{ fontFamily: values.fontFamily }}
                    >
                      Nama Restoran
                    </p>
                    <p className="text-xs text-white/70">Meja 5</p>
                  </div>
                </div>

                {/* Example CTA button */}
                <button
                  type="button"
                  style={{
                    backgroundColor: "white",
                    color: values.primaryColor,
                    borderRadius: br,
                    fontFamily: values.fontFamily,
                  }}
                  className="w-full py-2 text-sm font-semibold"
                >
                  Lihat Keranjang (2)
                </button>
              </div>

              {/* Menu body preview */}
              <div
                style={{ backgroundColor: values.secondaryColor }}
                className="px-4 py-4 space-y-3 min-h-48"
              >
                {/* Category chip */}
                <div className="flex gap-2 overflow-hidden">
                  {["Semua", "Makanan", "Minuman"].map((cat, idx) => (
                    <div
                      key={cat}
                      style={{
                        backgroundColor: idx === 0 ? values.primaryColor : "white",
                        color: idx === 0 ? "white" : values.primaryColor,
                        borderRadius: values.borderRadius === "pill" ? "9999px" : "6px",
                        fontFamily: values.fontFamily,
                        border: `1px solid ${values.primaryColor}`,
                      }}
                      className="px-3 py-1 text-xs font-medium whitespace-nowrap"
                    >
                      {cat}
                    </div>
                  ))}
                </div>

                {/* Menu item cards */}
                {["Nasi Goreng", "Es Teh Manis"].map((item) => (
                  <div
                    key={item}
                    className="bg-white flex items-center gap-3 p-3 shadow-sm"
                    style={{ borderRadius: br }}
                  >
                    <div
                      className="w-14 h-14 bg-stone-100 flex-shrink-0"
                      style={{ borderRadius: br }}
                    />
                    <div className="flex-1 min-w-0">
                      <p
                        className="text-sm font-semibold text-stone-900 truncate"
                        style={{ fontFamily: values.fontFamily }}
                      >
                        {item}
                      </p>
                      <p className="text-xs text-stone-500">Rp 25.000</p>
                    </div>
                    <button
                      type="button"
                      style={{
                        backgroundColor: values.primaryColor,
                        borderRadius: values.borderRadius === "pill" ? "9999px" : "6px",
                        fontFamily: values.fontFamily,
                      }}
                      className="px-2 py-1 text-xs text-white font-semibold whitespace-nowrap"
                    >
                      + Tambah
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <p className="text-xs text-stone-400 text-center mt-3">
              Pratinjau langsung — perubahan tercermin saat Anda mengedit
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
