// src/app/admin/table.tsx
"use client";

import { useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";
import { supabase } from "@/lib/supabaseClient";

type Tx = {
  id: string;
  user_id: string;
  type: string;           // 'deposit' | 'withdraw' | 'withdrawal'
  status: string;         // 'pending' | 'approved' | 'rejected'
  amount: number | string;
  currency?: string | null;
  wallet_address?: string | null;
  created_at: string;
  user_email?: string | null;

  // vom Server gemergt (admin/page.tsx mappt diese Felder rein)
  profile_first_name?: string | null;
  profile_last_name?: string | null;
  profile_nickname?: string | null;
  profile_email?: string | null;
};

const USD = (n: any) => `$${Number(n || 0).toFixed(2)}`;
const normType = (t: string) => {
  const s = String(t || "").trim().toLowerCase();
  return s === "withdrawal" ? "withdraw" : s;
};

export default function AdminTable({ transactions }: { transactions: Tx[] }) {
  const [rows, setRows] = useState<Tx[]>(transactions || []);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const fullName = (t: Tx) =>
    `${t.profile_first_name || ""} ${t.profile_last_name || ""}`.trim() || "—";
  const nickName = (t: Tx) => t.profile_nickname || "—";
  const emailOf  = (t: Tx) => t.profile_email || t.user_email || "—";

  async function confirmBox(title: string, okLabel = "Ja") {
    const { isConfirmed } = await Swal.fire({
      title,
      icon: "warning",
      background: "#0d1117",
      color: "#fff",
      showCancelButton: true,
      confirmButtonText: okLabel,
      cancelButtonText: "Abbrechen",
      confirmButtonColor: "#6366f1",
      cancelButtonColor: "#374151",
    });
    return isConfirmed;
  }

  // ---- API / RPC Calls ----
  async function approveDepositViaAPI(id: string) {
    const res = await fetch("/api/admin/update-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "approve" }),
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || res.statusText);
  }
  async function rejectDepositViaAPI(id: string) {
    const res = await fetch("/api/admin/update-transaction", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action: "reject" }),
    });
    if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || res.statusText);
  }

  async function approveWithdrawalRPC(id: string) {
    const { error } = await supabase.rpc("admin_approve_withdrawal", { p_tx: id });
    if (error) throw error;
  }
  async function rejectWithdrawalRPC(id: string) {
    const { error } = await supabase.rpc("admin_reject_withdrawal", { p_tx: id, p_reason: null });
    if (error) throw error;
  }
  async function undoWithdrawalRPC(id: string) {
    const { error } = await supabase.rpc("admin_undo_withdrawal", { p_tx: id });
    if (error) throw error;
  }
  async function undoDepositRPC(id: string) {
    const { error } = await supabase.rpc("admin_undo_deposit", { p_tx: id });
    if (error) throw error;
  }

  async function handleAction(t: Tx, action: "approve" | "reject" | "undo") {
    const kind = normType(t.type);
    try {
      setLoadingId(t.id);

      if (kind === "deposit") {
        if (action === "approve") {
          if (!(await confirmBox(`Einzahlung von ${USD(t.amount)} bestätigen?`))) return;
          await approveDepositViaAPI(t.id);
          setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: "approved" } : r));
        } else if (action === "reject") {
          if (!(await confirmBox(`Einzahlung von ${USD(t.amount)} ablehnen?`, "Ja, ablehnen"))) return;
          await rejectDepositViaAPI(t.id);
          setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: "rejected" } : r));
        } else {
          if (!(await confirmBox(`Genehmigte Einzahlung von ${USD(t.amount)} rückgängig machen?`))) return;
          await undoDepositRPC(t.id);
          setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: "pending" } : r));
        }
      } else if (kind === "withdraw") {
        if (action === "approve") {
          if (!(await confirmBox(`Auszahlung von ${USD(t.amount)} bestätigen?`))) return;
          await approveWithdrawalRPC(t.id);
          setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: "approved" } : r));
        } else if (action === "reject") {
          if (!(await confirmBox(`Auszahlung von ${USD(t.amount)} ablehnen?`, "Ja, ablehnen"))) return;
          await rejectWithdrawalRPC(t.id);
          setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: "rejected" } : r));
        } else {
          if (!(await confirmBox(`Genehmigte Auszahlung von ${USD(t.amount)} rückgängig machen?`))) return;
          await undoWithdrawalRPC(t.id);
          setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: "pending" } : r));
        }
      } else {
        // Unbekannter Typ -> nur approve/reject via API (kein Undo)
        if (!(await confirmBox(`Transaktion ${action === "approve" ? "bestätigen" : "ablehnen"}?`))) return;
        const res = await fetch("/api/admin/update-transaction", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ id: t.id, action }),
        });
        if (!res.ok) throw new Error((await res.json().catch(()=>({}))).error || res.statusText);
        setRows(prev => prev.map(r => r.id === t.id ? { ...r, status: action === "approve" ? "approved" : "rejected" } : r));
      }

      await Swal.fire({ title: "✅ Erfolgreich", icon: "success", background: "#0d1117", color: "#fff", confirmButtonColor: "#6366f1" });
    } catch (e: any) {
      Swal.fire("Fehler", e?.message || "Aktion fehlgeschlagen", "error");
    } finally {
      setLoadingId(null);
    }
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="min-w-full text-sm">
        <thead className="bg-white/5">
          <tr>
            <th className="px-4 py-2 text-left">ID</th>
            <th className="px-4 py-2 text-left">Name</th>
            <th className="px-4 py-2 text-left">Nickname</th>
            <th className="px-4 py-2 text-left">E-Mail</th>
            <th className="px-4 py-2">Typ</th>
            <th className="px-4 py-2">Betrag (USD)</th>
            <th className="px-4 py-2">Adresse</th>
            <th className="px-4 py-2">Status</th>
            <th className="px-4 py-2">Datum</th>
            <th className="px-4 py-2">Aktionen</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((t) => {
            const kind = normType(t.type);
            const isPending = t.status === "pending";
            const isApproved = t.status === "approved";

            return (
              <tr key={t.id} className="border-t border-white/10">
                <td className="px-4 py-2 font-mono text-xs">{t.id}</td>
                <td className="px-4 py-2">{fullName(t)}</td>
                <td className="px-4 py-2">{nickName(t)}</td>
                <td className="px-4 py-2">{emailOf(t)}</td>
                <td className="px-4 py-2">{kind}</td>
                <td className="px-4 py-2">{USD(t.amount)}</td>
                <td className="px-4 py-2 truncate max-w-[220px]">{t.wallet_address || "—"}</td>
                <td className="px-4 py-2">
                  <span className={`px-2 py-1 rounded text-xs font-medium ${
                    t.status === "approved" ? "bg-green-600" :
                    t.status === "rejected" ? "bg-red-600" : "bg-yellow-500 text-black"
                  }`}>
                    {t.status}
                  </span>
                </td>
                <td className="px-4 py-2">{new Date(t.created_at).toLocaleString("de-DE")}</td>
                <td className="px-4 py-2 flex flex-wrap gap-2">
                  {isPending && (
                    <>
                      <button
                        onClick={() => handleAction(t, "approve")}
                        disabled={loadingId === t.id}
                        className="px-3 py-2 rounded bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50"
                      >
                        Bestätigen
                      </button>
                      <button
                        onClick={() => handleAction(t, "reject")}
                        disabled={loadingId === t.id}
                        className="px-3 py-2 rounded bg-red-600 hover:bg-red-500 disabled:opacity-50"
                      >
                        Ablehnen
                      </button>
                    </>
                  )}
                  {isApproved && (
                    <button
                      onClick={() => handleAction(t, "undo")}
                      disabled={loadingId === t.id}
                      className="px-3 py-2 rounded bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50"
                      title={kind === "deposit"
                        ? "Genehmigte Einzahlung rückgängig machen"
                        : "Genehmigte Auszahlung rückgängig machen"}
                    >
                      Rückgängig
                    </button>
                  )}
                </td>
              </tr>
            );
          })}

          {rows.length === 0 && (
            <tr>
              <td colSpan={10} className="px-4 py-6 text-center text-white/70">
                Keine Transaktionen gefunden.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}
