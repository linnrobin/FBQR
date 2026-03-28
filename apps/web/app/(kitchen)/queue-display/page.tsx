/**
 * /kitchen/queue-display — Public order queue display screen.
 *
 * Intended for a TV or large monitor facing the customer waiting area.
 * No authentication required (public URL).
 *
 * Usage: /kitchen/queue-display?branchId=<uuid>
 *
 * If branchId is missing, shows a setup prompt.
 */
import type { Metadata } from "next";
import { QueueDisplay } from "@/components/kitchen/queue-display";

export const metadata: Metadata = {
  title: "Antrian Pesanan",
};

export default async function QueueDisplayPage({
  searchParams,
}: {
  searchParams: Promise<{ branchId?: string }>;
}) {
  const { branchId } = await searchParams;

  if (!branchId) {
    return (
      <div className="min-h-screen bg-stone-950 flex items-center justify-center px-6">
        <div className="text-center">
          <p className="text-4xl font-black text-stone-600 mb-4">FBQR</p>
          <p className="text-stone-500 text-lg">
            Tambahkan{" "}
            <code className="text-amber-400 bg-stone-800 px-2 py-0.5 rounded">
              ?branchId=&lt;id&gt;
            </code>{" "}
            ke URL untuk menampilkan antrian cabang.
          </p>
        </div>
      </div>
    );
  }

  return <QueueDisplay branchId={branchId} />;
}
