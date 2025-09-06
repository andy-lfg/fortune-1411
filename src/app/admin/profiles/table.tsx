// src/app/admin/profiles/table.tsx
"use client";

import { useMemo, useState } from "react";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

type Row = {
  id: string;
  email: string | null;
  first_name: string | null;
  last_name: string | null;
  nickname: string | null;
  wallet_btc: string | null;
  wallet_eth: string | null;
  wallet_usdt: string | null;
  referred_by: string | null;
  created_at: string | null;
  invest_balance: number;
  withdrawable_yield: number;
};

const USD = (n: number | string) => `$${Number(n || 0).toFixed(2)}`;

export default function ProfilesTable({ rows }: { rows: Row[] }) {
  const [data, setData] = useState<Row[]>(rows || []);
  const [editing, setEditing] = useState<Record<string, Partial<Row>>>({});
  const [filter, setFilter] = useState("");

  const filtered = useMemo(() => {
    const q = filter.trim().toLowerCase();
    if (!q) return data;
    return data.filter(r =>
      (r.email || "").toLowerCase().includes(q) ||
      (r.nickname || "").toLowerCase().includes(q) ||
      (r.first_name || "").toLowerCase().includes(q) ||
      (r.last_name || "").toLowerCase().includes(q) ||
      r.id.toLowerCase().includes(q)
    );
  }, [data, filter]);

  function startEdit(id: string) {
    setEditing(prev => ({ ...prev, [id]: { ...data.find(r => r.id === id)! } }));
  }
  function cancelEdit(id: string) {
    setEditing(prev => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }
  function setField(id: string, key: keyof Row, val: string) {
    setEditing(prev => ({ ...prev, [id]: { ...prev[id], [key]: val } }));
  }

  async function save(id: string) {
    try {
      const payload = editing[id];
      if (!payload) return;

      // parse & guard numbers for account fields
      const inv = payload.invest_balance;
      const wy  = payload.withdrawable_yield;
      const invNum = inv === undefined ? undefined : Number(inv);
      const wyNum  = wy  === undefined ? undefined : Number(wy);

      if (invNum !== undefined && (isNaN(invNum) || invNum < 0)) {
        throw new Error("Invest darf nicht negativ sein und muss eine Zahl sein.");
      }
      if (wyNum !== undefined && (isNaN(wyNum) || wyNum < 0)) {
        throw new Error("Auszahlbare Rendite darf nicht negativ sein und muss eine Zahl sein.");
      }

      // nur erlaubte Felder übertragen
      const body = {
        user_id: id,
        updates: {
          email: payload.email ?? undefined,
          first_name: payload.first_name ?? undefined,
          last_name: payload.last_name ?? undefined,
          nickname: payload.nickname ?? undefined,
          wallet_btc: payload.wallet_btc ?? undefined,
          wallet_eth: payload.wallet_eth ?? undefined,
          wallet_usdt: payload.wallet_usdt ?? undefined,
        },
        account_updates: {
          invest_balance: invNum !== undefined ? invNum : undefined,
          withdrawable_yield: wyNum !== undefined ? wyNum : undefined,
        },
      };

      const res = await fetch("/api/admin/update-profile", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        throw new Error(j.error || res.statusText);
      }

      const j = await res.json();

      // UI aktualisieren (Profile und Account-Werte)
      setData(prev =>
        prev.map(r =>
          r.id === id
            ? {
                ...r,
                ...(j.profile || {}),
                invest_balance: j.account?.invest_balance ?? r.invest_balance,
                withdrawable_yield: j.account?.withdrawable_yield ?? r.withdrawable_yield,
              }
            : r
        )
      );
      cancelEdit(id);

      await Swal.fire({
        title: "✅ Gespeichert",
        text: j.warning ? String(j.warning) : undefined,
        icon: "success",
        background: "#0d1117",
        color: "#fff",
        confirmButtonColor: "#6366f1",
      });
    } catch (e: any) {
      Swal.fire("Fehler", e?.message || "Speichern fehlgeschlagen", "error");
    }
  }

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Suchen: E-Mail / Nickname / Name / ID…"
          className="w-full md:w-80 rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm"
        />
        <div className="ml-auto text-sm text-white/70">
          {filtered.length} von {data.length} Einträgen
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-3 py-2 text-left">ID</th>
              <th className="px-3 py-2 text-left">E-Mail</th>
              <th className="px-3 py-2 text-left">Nickname</th>
              <th className="px-3 py-2 text-left">Vorname</th>
              <th className="px-3 py-2 text-left">Nachname</th>
              <th className="px-3 py-2 text-left">Wallet BTC</th>
              <th className="px-3 py-2 text-left">Wallet ETH</th>
              <th className="px-3 py-2 text-left">Wallet USDT</th>
              <th className="px-3 py-2 text-right">Invest</th>
              <th className="px-3 py-2 text-right">Auszahlbare Rendite</th>
              <th className="px-3 py-2 text-left">Aktionen</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((r) => {
              const ed = editing[r.id];
              return (
                <tr key={r.id} className="border-t border-white/10 align-top">
                  <td className="px-3 py-2 font-mono text-[11px]">{r.id}</td>

                  {/* E-Mail */}
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.email ?? "")}
                        onChange={(e) => setField(r.id, "email", e.target.value)}
                        className="w-56 rounded border border-white/10 bg-black/30 px-2 py-1"
                      />
                    ) : (
                      r.email || "—"
                    )}
                  </td>

                  {/* Nickname */}
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.nickname ?? "")}
                        onChange={(e) => setField(r.id, "nickname", e.target.value)}
                        className="w-40 rounded border border-white/10 bg-black/30 px-2 py-1"
                      />
                    ) : (
                      r.nickname || "—"
                    )}
                  </td>

                  {/* First / Last */}
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.first_name ?? "")}
                        onChange={(e) => setField(r.id, "first_name", e.target.value)}
                        className="w-36 rounded border border-white/10 bg-black/30 px-2 py-1"
                      />
                    ) : (
                      r.first_name || "—"
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.last_name ?? "")}
                        onChange={(e) => setField(r.id, "last_name", e.target.value)}
                        className="w-36 rounded border border-white/10 bg-black/30 px-2 py-1"
                      />
                    ) : (
                      r.last_name || "—"
                    )}
                  </td>

                  {/* Wallets */}
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.wallet_btc ?? "")}
                        onChange={(e) => setField(r.id, "wallet_btc", e.target.value)}
                        className="w-56 rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs"
                        placeholder="bc1q…"
                      />
                    ) : (
                      <span className="font-mono text-[11px]">{r.wallet_btc || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.wallet_eth ?? "")}
                        onChange={(e) => setField(r.id, "wallet_eth", e.target.value)}
                        className="w-44 rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs"
                        placeholder="0x…"
                      />
                    ) : (
                      <span className="font-mono text-[11px]">{r.wallet_eth || "—"}</span>
                    )}
                  </td>
                  <td className="px-3 py-2">
                    {ed ? (
                      <input
                        value={String(ed.wallet_usdt ?? "")}
                        onChange={(e) => setField(r.id, "wallet_usdt", e.target.value)}
                        className="w-44 rounded border border-white/10 bg-black/30 px-2 py-1 font-mono text-xs"
                        placeholder="0x…"
                      />
                    ) : (
                      <span className="font-mono text-[11px]">{r.wallet_usdt || "—"}</span>
                    )}
                  </td>

                  {/* Invest */}
                  <td className="px-3 py-2 text-right">
                    {ed ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ed.invest_balance ?? r.invest_balance}
                        onChange={(e) => setField(r.id, "invest_balance", e.target.value)}
                        className="w-32 text-right rounded border border-white/10 bg-black/30 px-2 py-1"
                      />
                    ) : (
                      USD(r.invest_balance)
                    )}
                  </td>

                  {/* Auszahlbare Rendite */}
                  <td className="px-3 py-2 text-right">
                    {ed ? (
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={ed.withdrawable_yield ?? r.withdrawable_yield}
                        onChange={(e) => setField(r.id, "withdrawable_yield", e.target.value)}
                        className="w-32 text-right rounded border border-white/10 bg-black/30 px-2 py-1"
                      />
                    ) : (
                      USD(r.withdrawable_yield)
                    )}
                  </td>

                  {/* Actions */}
                  <td className="px-3 py-2">
                    {ed ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          onClick={() => save(r.id)}
                          className="px-3 py-2 rounded bg-green-600 hover:bg-green-500"
                        >
                          Speichern
                        </button>
                        <button
                          onClick={() => cancelEdit(r.id)}
                          className="px-3 py-2 rounded bg-slate-700 hover:bg-slate-600"
                        >
                          Abbrechen
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEdit(r.id)}
                        className="px-3 py-2 rounded bg-white/10 hover:bg-white/20"
                      >
                        Bearbeiten
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}

            {filtered.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-white/70">
                  Keine Einträge gefunden.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
