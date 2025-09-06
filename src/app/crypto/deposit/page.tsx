// src/app/crypto/deposit/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import QRCode from "react-qr-code";
import toast, { Toaster } from "react-hot-toast";
import { supabase } from "@/lib/supabaseClient";

type Coin = "BTC" | "ETH" | "USDT";
type Rates = { BTC?: number; ETH?: number; USDT?: number };

// Feste Firmen-Einzahlungsadressen
const COMPANY_WALLETS: Record<Coin, string> = {
  BTC: "bc1qneh3f8lev89hhlw44dlmz8kurjs5940fjunnje",
  ETH: "0x0A645192c4a3d48C88776E1CDE05bdd3dD9d214c",
  USDT: "0x0A645192c4a3d48C88776E1CDE05bdd3dD9d214c", // ERC-20
};

export default function DepositPage() {
  const [coin, setCoin] = useState<Coin>("USDT");
  const [amountStr, setAmountStr] = useState("");

  const [rates, setRates] = useState<Rates>({});
  const [rateLoading, setRateLoading] = useState(true);
  const [rateError, setRateError] = useState<string | null>(null);

  // Live-Kurse laden
  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        setRateLoading(true);
        setRateError(null);
        const res = await fetch(
          "https://api.coingecko.com/api/v3/simple/price?ids=bitcoin,ethereum,tether&vs_currencies=usd",
          { cache: "no-store" }
        );
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const j = await res.json();
        if (!mounted) return;
        setRates({
          BTC: j?.bitcoin?.usd ?? undefined,
          ETH: j?.ethereum?.usd ?? undefined,
          USDT: j?.tether?.usd ?? 1,
        });
      } catch {
        setRateError("Kurse konnten nicht geladen werden.");
      } finally {
        setRateLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const parseUSD = (s: string) => Number((s || "").replace(",", "."));
  const amountUSD = useMemo(() => parseUSD(amountStr), [amountStr]);

  const amountError = useMemo(() => {
    if (!amountStr.trim()) return "Bitte Betrag eingeben.";
    if (!Number.isFinite(amountUSD) || amountUSD <= 0) return "Ungültiger Betrag.";
    if (amountUSD < 50) return "Mindesteinzahlung beträgt 50 USD.";
    return null;
  }, [amountStr, amountUSD]);

  // Betrag in der gewählten Coin-Währung berechnen
  const cryptoAmount = useMemo(() => {
    const price = rates[coin];
    if (!price || !Number.isFinite(amountUSD) || amountUSD <= 0) return null;
    return amountUSD / price;
  }, [amountUSD, rates, coin]);

  const cryptoAmountPretty = useMemo(() => {
    if (cryptoAmount == null) return "—";
    if (coin === "BTC") return cryptoAmount.toFixed(8);
    if (coin === "ETH") return cryptoAmount.toFixed(6);
    return cryptoAmount.toFixed(2); // USDT ~1:1
  }, [cryptoAmount, coin]);

  const targetAddress = COMPANY_WALLETS[coin];

  // QR Wert
  const qrValue = useMemo(() => {
    if (!targetAddress) return "";
    if (!cryptoAmount || cryptoAmount <= 0) return targetAddress;

    if (coin === "BTC") {
      return `bitcoin:${targetAddress}?amount=${cryptoAmount.toFixed(8)}`;
    }
    if (coin === "ETH") {
      const wei = BigInt(Math.round(cryptoAmount * 1e18));
      return `ethereum:${targetAddress}?value=${wei.toString()}`;
    }
    return targetAddress;
  }, [coin, targetAddress, cryptoAmount]);

  async function submitDeposit() {
    if (amountUSD < 50) {
      toast.error("Mindesteinzahlung beträgt 50 USD.");
      return;
    }
    if (amountError) {
      toast.error(amountError);
      return;
    }
    try {
      const { error } = await supabase.rpc("user_request_deposit", {
        p_amount: amountUSD,
        p_wallet: targetAddress,
        p_coin: coin, // <- WICHTIG: Coin explizit mitschicken
      });
      if (error) {
        const msg = String(error.message || "");
        if (msg.includes("transactions_min_deposit")) {
          toast.error("Mindesteinzahlung beträgt 50 USD.");
        } else if (msg.includes("Not authenticated")) {
          toast.error("Nicht eingeloggt.");
        } else {
          toast.error(msg || "Einzahlungsanfrage konnte nicht erstellt werden.");
        }
        return;
      }
      toast.success("Einzahlungsanfrage erfasst. Bitte jetzt überweisen.");
    } catch (e: any) {
      toast.error(e?.message || "Unbekannter Fehler.");
    }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success("Kopiert!");
  };

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <Toaster position="top-right" />

      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Einzahlen</h1>
        <Link href="/account" className="text-sm text-white/70 hover:text-white">
          ← Zurück zum Konto
        </Link>
      </div>

      <div className="rounded-2xl border border-white/10 bg-white/5 p-6 space-y-6">
        {/* Auswahl & Betrag */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="text-sm">
            Coin
            <select
              value={coin}
              onChange={(e) => setCoin(e.target.value as Coin)}
              className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
            >
              <option value="USDT">USDT (ERC-20)</option>
              <option value="BTC">BTC (Bitcoin)</option>
              <option value="ETH">ETH (Ethereum)</option>
            </select>
          </label>

          <label className="text-sm md:col-span-2">
            Betrag (USD)
            <div
              className={`mt-1 flex items-stretch rounded-xl border ${
                amountError ? "border-red-500/60" : "border-white/10"
              } bg-black/30`}
            >
              <span className="px-3 inline-flex items-center text-white/60 text-sm">$</span>
              <input
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                onBlur={() => amountStr && setAmountStr(parseUSD(amountStr).toFixed(2))}
                placeholder="50.00"
                inputMode="decimal"
                className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
              />
            </div>
            {amountError && <p className="mt-1 text-[11px] text-red-400">{amountError}</p>}
          </label>
        </div>

        {/* Kurse */}
        <div className="text-xs text-white/70">
          {rateLoading ? (
            "Kurse laden…"
          ) : rateError ? (
            <span className="text-red-400">{rateError}</span>
          ) : (
            <>Aktuelle Kurse: BTC ${rates.BTC?.toFixed(2)} · ETH ${rates.ETH?.toFixed(2)} · USDT ${rates.USDT?.toFixed(2)}</>
          )}
        </div>

        {/* Zieladresse */}
        <div>
          <p className="text-sm text-white/70">Einzahlungsadresse ({coin}):</p>
          <div className="mt-1 flex items-stretch rounded-xl border border-white/10 bg-black/30">
            <input
              readOnly
              value={targetAddress}
              className="flex-1 bg-transparent px-3 py-2 text-sm font-mono"
            />
            <button
              type="button"
              className="px-3 text-sm border-l border-white/10 hover:bg-white/10"
              onClick={() => copy(targetAddress)}
              title="Adresse kopieren"
            >
              📋
            </button>
          </div>
          {coin === "USDT" && (
            <p className="text-[11px] text-white/60 mt-1">
              Hinweis: USDT <b>auf dem Ethereum-Netzwerk (ERC-20)</b> senden. Keine TRC-20/BEP-20.
            </p>
          )}
        </div>

        {/* QR + Nur Coin-Betrag */}
        {!amountError && (
          <div className="rounded-xl border border-white/10 bg-black/20 p-4">
            <h2 className="text-lg font-semibold mb-1">Zahlung per QR</h2>
            <p className="text-sm text-white/70 mb-4">
              Scanne den Code mit deiner Wallet. Bei BTC/ETH ist der Betrag eingebettet; bei USDT bitte manuell eingeben.
            </p>

            <div className="flex flex-col md:flex-row gap-6 md:items-center">
              <div className="p-4 bg-white rounded-xl inline-block self-start">
                <QRCode value={qrValue || targetAddress} size={168} />
              </div>

              <div className="flex-1">
                <p className="text-xs text-white/60 mb-1">Zu überweisender Betrag ({coin})</p>
                <div className="mt-1 flex items-stretch rounded-xl border border-white/10 bg-black/30">
                  <input
                    readOnly
                    value={cryptoAmount ? cryptoAmountPretty : "—"}
                    className="flex-1 bg-transparent px-3 py-2 text-sm font-mono"
                  />
                  {cryptoAmount && (
                    <button
                      type="button"
                      className="px-3 text-sm border-l border-white/10 hover:bg-white/10"
                      onClick={() => copy(cryptoAmountPretty)}
                      title={`${coin}-Betrag kopieren`}
                    >
                      📋
                    </button>
                  )}
                </div>

                <p className="text-[11px] text-white/60 mt-2">
                  ⚠️ Bitte exakt diesen Betrag überweisen. Bei Abweichungen oder Fehlern kann die automatische
                  Zuweisung nicht garantiert werden.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Aktion */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={submitDeposit}
            disabled={!!amountError || rateLoading}
            className="rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
          >
            Einzahlungsanfrage erstellen
          </button>
          <p className="text-xs text-white/60">
            Mindesteinzahlung: <span className="text-white">$50.00</span>
          </p>
        </div>
      </div>
    </section>
  );
}
