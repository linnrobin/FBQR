"use client";

/**
 * PromotionsClient — thin shell for /merchant/promotions.
 * Mounts PromotionsList. No state of its own.
 */

import { PromotionsList, type PromotionRow } from "./promotions-list";

interface PromotionsClientProps {
  initialPromotions: PromotionRow[];
}

export function PromotionsClient({ initialPromotions }: PromotionsClientProps) {
  return <PromotionsList initialPromotions={initialPromotions} />;
}
