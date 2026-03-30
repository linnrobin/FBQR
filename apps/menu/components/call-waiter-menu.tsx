"use client";

/**
 * CallWaiterMenu — 3-button action row for calling the waiter.
 *
 * Buttons: Panggil Pelayan (CALL), Butuh Bantuan (ASSISTANCE), Minta Struk (BILL)
 * ASSISTANCE button opens a bottom sheet with an optional text note.
 * Submits to POST /api/waiter.
 */

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Phone, LifeBuoy, Receipt, X, Send } from "lucide-react";

interface CallWaiterMenuProps {
  tableId: string;
  orderId?: string;
  sessionActive: boolean;
}

type WaiterRequestType = "CALL" | "ASSISTANCE" | "BILL";

interface RequestState {
  type: WaiterRequestType;
  loading: boolean;
  sent: boolean;
}

// ─── Assistance bottom sheet ──────────────────────────────────────────────────

function AssistanceSheet({
  isOpen,
  onClose,
  onSubmit,
  isLoading,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (message: string) => Promise<void>;
  isLoading: boolean;
}) {
  const [message, setMessage] = useState("");

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            className="fixed inset-0 z-50 bg-black/40"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="fixed bottom-0 left-0 right-0 z-50 bg-white rounded-t-2xl shadow-2xl"
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", damping: 30, stiffness: 300 }}
          >
            <div className="flex justify-center pt-3 pb-1">
              <div className="w-10 h-1 rounded-full bg-stone-300" />
            </div>
            <div className="flex items-center justify-between px-4 pb-3 border-b border-stone-100">
              <div className="flex items-center gap-2">
                <LifeBuoy className="h-5 w-5 text-[--color-primary]" />
                <h3 className="text-base font-semibold text-stone-900">Butuh Bantuan</h3>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="p-1 text-stone-400 hover:text-stone-700"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-4 py-4 space-y-4">
              <p className="text-sm text-stone-600">
                Kami akan segera membantu Anda. Isi keterangan tambahan (opsional):
              </p>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Misal: kursi rusak, perlu sendok tambahan..."
                rows={3}
                maxLength={200}
                className="w-full border border-stone-300 rounded-[--border-radius] px-3 py-2.5 text-sm resize-none focus:outline-none focus:border-[--color-primary]"
              />
              <button
                type="button"
                onClick={() => onSubmit(message)}
                disabled={isLoading}
                className="w-full h-12 bg-[--color-primary] text-white font-semibold rounded-[--border-radius] text-sm hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                <Send className="h-4 w-4" />
                {isLoading ? "Mengirim..." : "Kirim Permintaan"}
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export function CallWaiterMenu({ tableId, orderId, sessionActive }: CallWaiterMenuProps) {
  const [requests, setRequests] = useState<Partial<Record<WaiterRequestType, RequestState>>>({});
  const [assistanceOpen, setAssistanceOpen] = useState(false);
  const [assistanceLoading, setAssistanceLoading] = useState(false);

  if (!sessionActive) return null;

  async function sendRequest(type: WaiterRequestType, message?: string) {
    if (requests[type]?.loading || requests[type]?.sent) return;

    setRequests((prev) => ({
      ...prev,
      [type]: { type, loading: true, sent: false },
    }));

    try {
      const body: Record<string, unknown> = { tableId, type };
      if (orderId) body.orderId = orderId;
      if (message) body.message = message;

      const res = await fetch("/api/waiter", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        throw new Error("Request failed");
      }

      setRequests((prev) => ({
        ...prev,
        [type]: { type, loading: false, sent: true },
      }));

      // Auto-reset "sent" state after 30 seconds to allow re-sending
      setTimeout(() => {
        setRequests((prev) => {
          const updated = { ...prev };
          delete updated[type];
          return updated;
        });
      }, 30_000);
    } catch {
      setRequests((prev) => {
        const updated = { ...prev };
        delete updated[type];
        return updated;
      });
    }
  }

  async function handleAssistance(message: string) {
    setAssistanceLoading(true);
    await sendRequest("ASSISTANCE", message);
    setAssistanceLoading(false);
    setAssistanceOpen(false);
  }

  const buttons: {
    type: WaiterRequestType;
    label: string;
    icon: React.ReactNode;
    sentLabel: string;
  }[] = [
    {
      type: "CALL",
      label: "Panggil Pelayan",
      icon: <Phone className="h-4 w-4" />,
      sentLabel: "Pelayan dipanggil",
    },
    {
      type: "ASSISTANCE",
      label: "Butuh Bantuan",
      icon: <LifeBuoy className="h-4 w-4" />,
      sentLabel: "Bantuan diminta",
    },
    {
      type: "BILL",
      label: "Minta Struk",
      icon: <Receipt className="h-4 w-4" />,
      sentLabel: "Struk diminta",
    },
  ];

  return (
    <>
      <div className="bg-white rounded-xl border border-stone-100 px-4 py-3">
        <p className="text-xs font-semibold text-stone-400 uppercase tracking-wide mb-3">
          Bantuan
        </p>
        <div className="grid grid-cols-3 gap-2">
          {buttons.map(({ type, label, icon, sentLabel }) => {
            const state = requests[type];
            const isSent = state?.sent ?? false;
            const isLoading = state?.loading ?? false;

            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  if (type === "ASSISTANCE") {
                    setAssistanceOpen(true);
                  } else {
                    void sendRequest(type);
                  }
                }}
                disabled={isLoading || isSent}
                className={`flex flex-col items-center gap-1.5 py-3 px-2 rounded-[--border-radius] border text-xs font-medium transition-all ${
                  isSent
                    ? "border-green-300 bg-green-50 text-green-700"
                    : "border-[--color-primary] text-[--color-primary] hover:bg-[--color-primary]/5"
                } disabled:opacity-70`}
              >
                {isLoading ? (
                  <div className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
                ) : (
                  icon
                )}
                <span className="text-center leading-tight">
                  {isSent ? sentLabel : label}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <AssistanceSheet
        isOpen={assistanceOpen}
        onClose={() => setAssistanceOpen(false)}
        onSubmit={handleAssistance}
        isLoading={assistanceLoading}
      />
    </>
  );
}
