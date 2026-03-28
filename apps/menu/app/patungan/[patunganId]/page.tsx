/**
 * Patungan participant page.
 * Route: /patungan/[patunganId]
 *
 * Used by participants to view and pay their share of a split bill.
 * Also used for post-payment redirect from Midtrans.
 */

import { PatunganParticipantScreen } from "@/components/patungan-participant-screen";

export default async function PatunganParticipantPage({
  params,
}: {
  params: Promise<{ patunganId: string }>;
}) {
  const { patunganId } = await params;

  return <PatunganParticipantScreen patunganId={patunganId} />;
}
