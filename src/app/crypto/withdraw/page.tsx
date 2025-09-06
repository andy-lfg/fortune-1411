"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Coin = "BTC" | "ETH" | "USDT";

export default function WithdrawPage() {
  // Auth
  const [checking, setChecking] = useState(true);
  const [isAuthed, setIsAuthed] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [userEmail, setUserEmail] = useState<string | null>(null);

  // UI
  const [currency, setCurrency] = useState<Coin>("USDT");
  const [amount, setAmount] = useState("");
  const [dest, setDest] = useState(""); // Ziel-Wallet des Users
  const [status, setStatus] = useState("");

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data, error } = await supabase.auth.getUser();
      if (!alive) return;
      if (error || !data.user) {
        setIsAuthed(false);
        setUserId(null);
        setUserEmail(null);
      } else {
        setIsAuthed(true);
        setUserId(data.user.id);
        setUserEmail(data.user.email ?? null);
      }
      setChecking(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  const submitWithdraw = async () => {
    setStatus("Lade…");

    if (!isAuthed || !userId || !userEmail) {
      setStatus("Bitte zuerst einloggen.");
      return;
    }
    if (!dest) {
      setStatus("Bitte deine Ziel-Wallet-Adresse eingeben.");
      return;
    }
    if (!amount || isNaN(Number(amount))) {
      setStatus("Bitte gültigen Betrag eingeben.");
      return;
    }

    const { error } = await supabase.from("transactions").insert({
      user_id: userId,
      user_email: userEmail, // <-- NEU: E-Mail mit abspeichern
      type: "withdrawal",
      amount: Number(amount),
      currency,
      wallet_address: dest, // Zieladresse des Users
      status: "pending",
    });

    if (error) {
      setStatus("Fehler: " + error.message);
      return;
    }
    setStatus("Auszahlung angefragt. Geld wird nach erfolgreicher überprüfung auf ihr Konto überwiesen.");
    setAmount("");
    setDest("");
  };

  if (checking) {
    return (
      <section className="mx-auto max-w-2xl px-4 py-16">
        <p className="text-white/80">Lade…</p>
      </section>
    );
  }

  return (
    <section className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-3xl font-bold">Auszahlen (Krypto)</h1>

      {!isAuthed ? (
        <p className="text-white/70 mt-2">
          Bitte <a href="/login" className="text-purple-300 underline">einloggen</a>, um eine Auszahlung zu beantragen.
        </p>
      ) : (
        <>
          <p className="text-white/70 mt-2">BTC · ETH · USDT </p>

          <div className="mt-8 space-y-6 rounded-2xl border border-white/10 bg-white/5 p-6">
            <div>
              <label className="text-sm">Währung</label>
              <div className="mt-2 flex gap-2">
                {(["BTC", "ETH", "USDT"] as const).map((c) => (
                  <button
                    key={c}
                    onClick={() => setCurrency(c)}
                    className={`rounded-xl px-3 py-2 border text-sm ${
                      currency === c
                        ? "bg-purple-600 border-purple-500"
                        : "border-white/10 bg-black/20 hover:bg-white/5"
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-sm">Betrag</label>
              <input
                type="number"
                min="0"
                step="0.00000001"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                placeholder="z. B. 50"
              />
            </div>

            <div>
              <label className="text-sm">Deine Zieladresse</label>
              <input
                type="text"
                value={dest}
                onChange={(e) => setDest(e.target.value)}
                className="mt-2 w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
                placeholder="z. B. bc1… (BTC) oder 0x… (ETH/USDT)"
              />
            </div>

            <button
              onClick={submitWithdraw}
              className="w-full rounded-xl bg-purple-600 px-4 py-3 font-medium hover:bg-purple-500"
            >
              Auszahlung anfragen
            </button>

            {status && <p className="text-sm text-white/80">{status}</p>}
          </div>
        </>
      )}
    </section>
  );
}
