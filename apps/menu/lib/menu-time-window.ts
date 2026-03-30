/**
 * Shared utilities for category time-window filtering (WIB, Asia/Jakarta).
 * Used by all menu layout components (Grid, List, Bundle, Spotlight).
 */
import { toZonedTime } from "date-fns-tz";

export interface TimeWindowCategory {
  availableFrom: string | null; // "HH:MM"
  availableTo: string | null;   // "HH:MM"
}

function nowWibMinutes(): number {
  const wib = toZonedTime(new Date(), "Asia/Jakarta");
  return wib.getHours() * 60 + wib.getMinutes();
}

function parseHHMM(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return (h ?? 0) * 60 + (m ?? 0);
}

/**
 * Returns true if a category is available at the current WIB time.
 * Handles overnight ranges (e.g. 22:00–02:00).
 * If no time window is set, category is always available.
 */
export function isCategoryAvailable(cat: TimeWindowCategory): boolean {
  if (!cat.availableFrom || !cat.availableTo) return true;
  const now = nowWibMinutes();
  const from = parseHHMM(cat.availableFrom);
  const to = parseHHMM(cat.availableTo);
  if (from <= to) {
    return now >= from && now < to;
  }
  // Overnight: available from `from` until midnight, then midnight until `to`
  return now >= from || now < to;
}
