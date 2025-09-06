// src/app/admin/deposits/widgets.tsx
"use client";

import { useState } from "react";

export default function ApproveButtons({ id }: { id: number }) {
  const [loading, setLoading] = useState<string | null>(null);

  const doAction = async (action: "confirm" | "reject") => {
    setLoading(action);
    try {
      const res = await fetch(`/api/admin/deposits/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transactionId: id }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        alert(`Fehler: ${j.error || res.statusText}`);
      } else {
        // Seite neu laden, damit die Liste aktualisiert wird
        location.reload();
      }
    } finally {
      setLoading(null);
    }
  };

  return (
    <div className="flex gap-2">
      <button
        disabled={loading !== null}
        onClick={() => doAction("confirm")}
        className="px-3 py-2 rounded bg-green-600 hover:bg-green-500 disabled:opacity-50"
      >
        {loading === "confirm" ? "Bestätige…" : "Bestätigen"}
      </button>
      <button
        disabled={loading !== null}
        onClick={() => doAction("reject")}
        className="px-3 py-2 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
      >
        {loading === "reject" ? "Lehne ab…" : "Ablehnen"}
      </button>
    </div>
  );
}
