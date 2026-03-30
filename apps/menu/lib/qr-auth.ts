/**
 * QR URL signing and verification utilities (ADR-015).
 *
 * The static QR code encodes: https://menu.fbqr.app/r/{tableToken}
 * The redirect handler generates a 24h signed URL:
 *   https://menu.fbqr.app/{restaurantId}/{tableId}?token={tableToken}&sig={sig}&exp={expUnix}
 *
 * sig = HMAC-SHA256(tableToken + ":" + expUnix, QR_SIGNING_SECRET) — hex-encoded.
 * The path params (restaurantId, tableId) are NOT signed — the menu page must
 * verify them against the DB record returned by looking up tableToken. See ADR-015.
 */
import crypto from "crypto";

const SECRET = (() => {
  const s = process.env.QR_SIGNING_SECRET;
  if (!s && process.env.NODE_ENV === "production") {
    // Crash loudly in production — QR codes are unverifiable without a secret.
    throw new Error("QR_SIGNING_SECRET environment variable is required in production");
  }
  return s ?? "";
})();

/** Sign: HMAC-SHA256(tableToken:expUnix) → hex string */
export function signQrUrl(tableToken: string, expUnix: number): string {
  return crypto
    .createHmac("sha256", SECRET)
    .update(`${tableToken}:${expUnix}`)
    .digest("hex");
}

/** Verify signature with timing-safe compare. Returns false if secret is unset. */
export function verifyQrSig(
  tableToken: string,
  expUnix: number,
  sig: string
): boolean {
  if (!SECRET || !sig) return false;
  const expected = signQrUrl(tableToken, expUnix);
  try {
    // Both must be 64-char hex; reject wrong-length inputs before compare
    if (sig.length !== 64 || expected.length !== 64) return false;
    return crypto.timingSafeEqual(
      Buffer.from(expected, "hex"),
      Buffer.from(sig, "hex")
    );
  } catch {
    return false;
  }
}

/** True if the Unix-second timestamp is in the past. */
export function isQrExpired(expUnix: number): boolean {
  return Math.floor(Date.now() / 1000) > expUnix;
}

/** Build a 24h signed redirect URL for the menu app. */
export function buildSignedMenuUrl(
  restaurantId: string,
  tableId: string,
  tableToken: string
): string {
  const base =
    process.env.NEXT_PUBLIC_MENU_APP_URL ?? "http://localhost:3001";
  const exp = Math.floor(Date.now() / 1000) + 24 * 60 * 60;
  const sig = signQrUrl(tableToken, exp);
  const url = new URL(`/${restaurantId}/${tableId}`, base);
  url.searchParams.set("token", tableToken);
  url.searchParams.set("sig", sig);
  url.searchParams.set("exp", String(exp));
  return url.toString();
}
