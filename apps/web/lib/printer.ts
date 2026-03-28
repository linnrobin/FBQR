/**
 * Kitchen printer integration via node-thermal-printer (ESC/POS).
 *
 * Supports:
 *   - NETWORK (TCP/IP) — printer at a known IP address (e.g. 192.168.1.100)
 *   - USB — requires a local proxy bridge (Phase 2)
 *   - BLUETOOTH — requires a local proxy bridge (Phase 2)
 *
 * Usage:
 *   printKitchenTicket(settings, order)   — prints on order CONFIRMED
 *   printCustomerReceipt(settings, order) — prints on payment confirmed
 *
 * Failures are non-fatal — the order/payment flow is never rolled back.
 * On failure: logs error and returns { ok: false, error: string }.
 */

// node-thermal-printer types
interface PrinterConfig {
  type: "USB" | "NETWORK" | "BLUETOOTH";
  address: string;  // IP for NETWORK, path for USB
  paperWidth: 58 | 80;
}

export interface KitchenTicketData {
  queueNumber: number | null;
  orderType: string;   // "DINE_IN" | "TAKEAWAY" | "DELIVERY"
  tableName: string | null;
  items: {
    name: string;
    quantity: number;
    variantName?: string | null;
    addons?: { name: string; quantity: number }[];
    specialRequest?: string | null;
  }[];
  customerNote: string | null;
  createdAt: Date;
}

export interface ReceiptData {
  invoiceNumber: string;
  restaurantName: string;
  restaurantAddress: string | null;
  branchName: string;
  items: { name: string; quantity: number; lineTotal: number }[];
  subtotal: number;
  serviceChargeAmount: number;
  taxAmount: number;
  grandTotal: number;
  paymentMethod: string;
  createdAt: Date;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function padRight(str: string, width: number): string {
  return str.padEnd(width, " ").slice(0, width);
}

function padLeft(str: string, width: number): string {
  return str.padStart(width, " ").slice(-width);
}

function fmtIDR(n: number): string {
  return `Rp ${n.toLocaleString("id-ID")}`;
}

function fmtTime(d: Date): string {
  return d.toLocaleTimeString("id-ID", {
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Asia/Jakarta",
  });
}

const ORDER_TYPE_LABEL: Record<string, string> = {
  DINE_IN: "DINE-IN",
  TAKEAWAY: "TAKEAWAY",
  DELIVERY: "DELIVERY",
};

// ─── Kitchen ticket text ──────────────────────────────────────────────────────

function buildKitchenTicketLines(data: KitchenTicketData, cols: number): string[] {
  const lines: string[] = [];
  const sep = "=".repeat(cols);
  const dash = "-".repeat(cols);

  lines.push(sep);
  lines.push("FBQR Kitchen Ticket".padStart(Math.floor((cols + 19) / 2)));
  lines.push(sep);

  // Header line: queue number + type + table + time
  const qNum = data.queueNumber ? `#Q${String(data.queueNumber).padStart(3, "0")}` : "";
  const typeLabel = `[${ORDER_TYPE_LABEL[data.orderType] ?? data.orderType}]`;
  const tableLabel = data.tableName ? `Meja ${data.tableName}` : "";
  const timeLabel = fmtTime(data.createdAt);
  lines.push(`${qNum}  ${typeLabel}  ${tableLabel}  ${timeLabel}`);
  lines.push(dash);

  // Items
  for (const item of data.items) {
    lines.push(`${item.quantity}x ${item.name}`);
    if (item.variantName) {
      lines.push(`   + ${item.variantName}`);
    }
    if (item.addons) {
      for (const addon of item.addons) {
        lines.push(`   + ${addon.quantity > 1 ? `${addon.quantity}x ` : ""}${addon.name}`);
      }
    }
    if (item.specialRequest) {
      lines.push(`   NOTE: ${item.specialRequest}`);
    }
  }

  if (data.customerNote) {
    lines.push(dash);
    lines.push(`Catatan: "${data.customerNote}"`);
  }

  lines.push(sep);
  return lines;
}

// ─── Receipt text ─────────────────────────────────────────────────────────────

function buildReceiptLines(data: ReceiptData, cols: number): string[] {
  const lines: string[] = [];
  const sep = "=".repeat(cols);
  const dash = "-".repeat(cols);

  lines.push(sep);
  lines.push(data.restaurantName.padStart(Math.floor((cols + data.restaurantName.length) / 2)));
  if (data.restaurantAddress) {
    lines.push(data.restaurantAddress.slice(0, cols));
  }
  lines.push(data.branchName.slice(0, cols));
  lines.push(sep);
  lines.push(`Invoice: ${data.invoiceNumber}`);
  lines.push(`Waktu: ${fmtTime(data.createdAt)}`);
  lines.push(dash);

  // Items
  for (const item of data.items) {
    const nameCol = cols - 10;
    const name = item.name.slice(0, nameCol);
    const amount = fmtIDR(item.lineTotal).slice(0, 10);
    lines.push(`${item.quantity}x ${padRight(name, nameCol - 3)} ${padLeft(amount, 9)}`);
  }

  lines.push(dash);

  const totalsWidth = Math.min(cols, 30);
  const printTotalRow = (label: string, val: number) => {
    const valStr = fmtIDR(val);
    lines.push(`${padRight(label, totalsWidth - valStr.length)}${valStr}`);
  };
  printTotalRow("Subtotal", data.subtotal);
  if (data.serviceChargeAmount > 0) {
    printTotalRow("Service", data.serviceChargeAmount);
  }
  if (data.taxAmount > 0) {
    printTotalRow("PPN", data.taxAmount);
  }
  lines.push(sep);
  printTotalRow("TOTAL", data.grandTotal);
  lines.push(sep);
  lines.push(`Pembayaran: ${data.paymentMethod}`);
  lines.push("");
  lines.push("Terima kasih! / Thank you!".padStart(Math.floor((cols + 25) / 2)));
  lines.push(sep);
  return lines;
}

// ─── Print via node-thermal-printer ──────────────────────────────────────────

async function printLines(
  config: PrinterConfig,
  lines: string[],
  bold: boolean = false
): Promise<{ ok: boolean; error?: string }> {
  if (config.type !== "NETWORK") {
    return {
      ok: false,
      error: `Printer type ${config.type} requires a local bridge (Phase 2)`,
    };
  }

  try {
    // Dynamic import — avoids bundler issues in Next.js edge runtime
    const { ThermalPrinter, PrinterTypes, CharacterSet } = await import(
      "node-thermal-printer"
    );

    const [host, portStr] = config.address.split(":");
    const port = portStr ? parseInt(portStr, 10) : 9100;

    const printer = new ThermalPrinter({
      type: PrinterTypes.EPSON,
      interface: `tcp://${host}:${port}`,
      characterSet: CharacterSet.PC437_USA,
      removeSpecialCharacters: false,
      lineCharacter: "-",
      options: { timeout: 3000 },
    });

    const isConnected = await printer.isPrinterConnected();
    if (!isConnected) {
      return { ok: false, error: `Printer not reachable at ${config.address}` };
    }

    printer.alignCenter();
    for (const line of lines) {
      if (bold) printer.bold(true);
      printer.println(line);
      if (bold) printer.bold(false);
    }
    printer.cut();
    await printer.execute();

    return { ok: true };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { ok: false, error: msg };
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export async function printKitchenTicket(
  config: PrinterConfig,
  data: KitchenTicketData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cols = config.paperWidth === 80 ? 48 : 32;
    const lines = buildKitchenTicketLines(data, cols);
    return await printLines(config, lines);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[printer] printKitchenTicket failed:", msg);
    return { ok: false, error: msg };
  }
}

export async function printCustomerReceipt(
  config: PrinterConfig,
  data: ReceiptData
): Promise<{ ok: boolean; error?: string }> {
  try {
    const cols = config.paperWidth === 80 ? 48 : 32;
    const lines = buildReceiptLines(data, cols);
    return await printLines(config, lines);
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    console.error("[printer] printCustomerReceipt failed:", msg);
    return { ok: false, error: msg };
  }
}
