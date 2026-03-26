/**
 * QR redirect handler — generates a fresh 24h signed URL from a static tableToken.
 * Static QR codes always point here; this route handles the HMAC signing.
 * See docs/customer.md § 1. QR Code Scanning + ADR-015.
 *
 * Implemented in Step 10 (table management + QR generation).
 */
import { NextResponse } from "next/server";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ tableToken: string }> }
) {
  const { tableToken } = await params;
  void tableToken; // Used in Step 10

  // Step 10: lookup table → validate restaurant → generate HMAC-signed URL → redirect
  return NextResponse.json(
    { error: "QR redirect not yet implemented — Step 10" },
    { status: 501 }
  );
}
