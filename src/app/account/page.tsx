// src/app/account/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";
import { FaEye, FaEyeSlash, FaSave } from "react-icons/fa";

type PendingProfileLS = {
  first_name?: string;
  last_name?: string;
  nickname?: string;
  referred_by?: string | null;
};

export default function AccountPage() {
  const [loading, setLoading] = useState(true);

  // Auth + Profile
  const [userId, setUserId] = useState<string>("");
  const [email, setEmail] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName]   = useState("");
  const [nickname, setNickname]   = useState("");

  // inviter
  const [inviterId, setInviterId] = useState<string | null>(null);
  const [inviterNickname, setInviterNickname] = useState<string>("");

  // Wallets
  const [walletBTC, setWalletBTC] = useState("");
  const [walletETH, setWalletETH] = useState("");
  const [walletUSDT, setWalletUSDT] = useState("");

  // pw form
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Investment-Konto
  const [acct, setAcct] = useState<any>(null);
  const [loadingAcct, setLoadingAcct] = useState(true);

  // Rendite verwenden
  const [reinvestAmt, setReinvestAmt] = useState("");
  const [withdrawAmt, setWithdrawAmt] = useState("");

  // Inline-Validierung
  const [reinvestErr, setReinvestErr] = useState<string | null>(null);
  const [withdrawErr, setWithdrawErr] = useState<string | null>(null);

  const wy = useMemo(() => Number(acct?.withdrawable_yield || 0), [acct]);
  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  useEffect(() => {
    let mounted = true;

    (async () => {
      setLoading(true);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) {
        if (mounted) setLoading(false);
        toast.error("Bitte einloggen.");
        return;
      }
      if (mounted) {
        setUserId(user.id);
        setEmail(user.email || "");
      }

      // Profile
      const { data: prof } = await supabase
        .from("profiles")
        .select("first_name, last_name, nickname, referred_by, wallet_btc, wallet_eth, wallet_usdt")
        .eq("id", user.id)
        .maybeSingle();

      if (prof && mounted) {
        setFirstName(prof.first_name || "");
        setLastName(prof.last_name || "");
        setNickname(prof.nickname || "");
        setWalletBTC(prof.wallet_btc || "");
        setWalletETH(prof.wallet_eth || "");
        setWalletUSDT(prof.wallet_usdt || "");
        setInviterId(prof.referred_by || null);
      }

      if (mounted) setLoading(false);

      if (prof?.referred_by) {
        const { data: inviter } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", prof.referred_by)
          .maybeSingle();
        setInviterNickname(inviter?.nickname || "");
      }

      // Investment account
      setLoadingAcct(true);
      const { data: ia } = await supabase
        .from("investment_accounts")
        .select("invest_balance, withdrawable_yield, auto_compound_own, auto_compound_ref, auto_cycle_renew, cycle_day, cycle_started_at")
        .eq("user_id", user?.id)
        .maybeSingle();
      if (mounted) {
        setAcct(ia || null);
        setLoadingAcct(false);
      }
    })();

    return () => { mounted = false; };
  }, []);

  // ---------- Helpers ----------
  const parseAmt = (s: string) => Number((s || "").toString().replace(",", "."));
  const clamp2 = (n: number) => Number.isFinite(n) ? Math.max(0, Math.floor(n * 100) / 100) : 0;

  function validate(amountStr: string): string | null {
    const amt = parseAmt(amountStr);
    if (!isFinite(amt) || amountStr.trim() === "") return "Bitte Betrag eingeben.";
    if (amt <= 0) return "Betrag muss größer als 0 sein.";
    if (amt > wy) return `Maximal ${fmt(wy)} verfügbar.`;
    return null;
  }

  // live-validate
  useEffect(() => {
    setReinvestErr(validate(reinvestAmt));
  }, [reinvestAmt, wy]);
  useEffect(() => {
    setWithdrawErr(validate(withdrawAmt));
  }, [withdrawAmt, wy]);

  const setQuick = (frac: number) => {
    const v = clamp2(wy * frac).toFixed(2);
    setReinvestAmt(v);
    setWithdrawAmt(v);
  };

  // ---------- Save/Profile ----------
  async function saveNickname() {
    if (!userId) return;
    const { error } = await supabase.from("profiles").update({ nickname }).eq("id", userId);
    if (error) toast.error(error.message);
    else toast.success("Nickname gespeichert.");
  }

  async function saveWallets() {
    if (!userId) return;

    const btcOk = walletBTC.trim() === "" || /^((bc1|[13])[a-zA-HJ-NP-Z0-9]{25,62})$/.test(walletBTC.trim());
    const evmOk = walletETH.trim() === "" || /^0x[a-fA-F0-9]{40}$/.test(walletETH.trim());
    const usdtOk = walletUSDT.trim() === "" || /^0x[a-fA-F0-9]{40}$/.test(walletUSDT.trim());
    if (!btcOk) return toast.error("BTC-Adresse sieht nicht valide aus.");
    if (!evmOk) return toast.error("ETH-Adresse muss 0x… (42 Zeichen) sein.");
    if (!usdtOk) return toast.error("USDT (ERC-20): 0x… (42 Zeichen) erwartet.");

    const { error } = await supabase
      .from("profiles")
      .update({
        wallet_btc: walletBTC.trim() || null,
        wallet_eth: walletETH.trim() || null,
        wallet_usdt: walletUSDT.trim() || null,
      })
      .eq("id", userId);
    if (error) toast.error(error.message);
    else toast.success("Auszahl-Adressen gespeichert.");
  }

  async function saveEmail() {
    if (!email) return toast.error("Bitte eine gültige E-Mail eingeben.");
    const { error } = await supabase.auth.updateUser({ email });
    if (error) toast.error(error.message);
    else toast.success("E-Mail geändert. Bitte Posteingang bestätigen.");
  }

  async function savePassword() {
    if (newPassword.length < 8) return toast.error("Passwort min. 8 Zeichen.");
    if (newPassword !== confirmPassword) return toast.error("Passwörter stimmen nicht überein.");
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) toast.error(error.message);
    else {
      toast.success("Passwort geändert.");
      setNewPassword(""); setConfirmPassword(""); setShowNew(false); setShowConfirm(false);
    }
  }

  async function toggleFlag(key: "auto_compound_own" | "auto_compound_ref" | "auto_cycle_renew") {
    if (!acct || !userId) return;
    if (key === "auto_cycle_renew" && acct.auto_cycle_renew === true) {
      const proceed = confirm(
        "Achtung: Wenn Auto-Renew AUS ist, wird nach Ablauf des 100-Tage-Zyklus dein Investment-Konto geschlossen und das Kapital an die hinterlegte Auszahl-Adresse gesendet. Fortfahren?"
      );
      if (!proceed) return;
    }
    const next = !acct[key];
    const { error } = await supabase.from("investment_accounts").update({ [key]: next }).eq("user_id", userId);
    if (error) return toast.error("Konnte Einstellung nicht speichern.");
    setAcct({ ...acct, [key]: next });
    toast.success(`${key.replaceAll("_", " ")} ${next ? "aktiviert" : "deaktiviert"}`);
  }

  // ---------- RPCs ----------
  async function doReinvest() {
    const err = validate(reinvestAmt);
    if (err) return setReinvestErr(err), toast.error(err);
    const amt = clamp2(parseAmt(reinvestAmt));
    const { error } = await supabase.rpc("user_reinvest_withdrawable", { p_amount: amt });
    if (error) return toast.error(error.message || "Reinvest fehlgeschlagen.");
    // lokal spiegeln
    setAcct((a: any) => ({
      ...a,
      withdrawable_yield: Number(a.withdrawable_yield) - amt,
      invest_balance: Number(a.invest_balance) + amt,
    }));
    setReinvestAmt("");
    setReinvestErr(null);
    toast.success("Reinvest erfolgreich.");
  }

  async function doWithdrawRequest() {
    const err = validate(withdrawAmt);
    if (err) return setWithdrawErr(err), toast.error(err);
    const amt = clamp2(parseAmt(withdrawAmt));
    const { error } = await supabase.rpc("user_request_withdrawal", { p_amount: amt });
    if (error) return toast.error(error.message || "Auszahlungsanfrage fehlgeschlagen.");
    setWithdrawAmt("");
    setWithdrawErr(null);
    toast.success("Auszahlungsanfrage erstellt. Status: pending.");
  }

  return (
    <section className="mx-auto max-w-3xl px-4 py-16">
      <Toaster position="top-right" />

      {/* Header + Button */}
      <div className="mb-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-3xl font-bold">Mein Konto</h1>
        <Link
          href="/account/transactions"
          className="inline-flex items-center rounded-lg border border-white/10 px-4 py-2 text-sm hover:bg-white/10"
        >
          Zu Transaktionen →
        </Link>
      </div>

      {inviterNickname && (
        <p className="text-sm text-white/60 mb-6">
          Eingeladen von: <span className="text-white/90 font-medium">{inviterNickname}</span>
        </p>
      )}

      {loading ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/70">Lade Konto…</p>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Profil */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Profil</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                Vorname
                <input
                  value={firstName}
                  disabled
                  className="mt-1 w-full rounded-xl border border-white/10 bg-gray-800/40 px-3 py-2 text-sm text-white/70 cursor-not-allowed"
                />
              </label>
              <label className="text-sm">
                Nachname
                <input
                  value={lastName}
                  disabled
                  className="mt-1 w-full rounded-xl border border-white/10 bg-gray-800/40 px-3 py-2 text-sm text-white/70 cursor-not-allowed"
                />
              </label>
            </div>

            {/* Nickname */}
            <div className="mt-4">
              <label className="text-sm">
                Nickname
                <input
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  placeholder="Dein Nickname"
                />
              </label>
              <button
                onClick={saveNickname}
                className="mt-3 inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2 text-sm font-medium hover:bg-purple-500"
              >
                <FaSave /> Speichern
              </button>
            </div>
          </div>

          {/* Auszahl-Adressen */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Auszahl-Adressen</h2>
            <p className="text-xs text-white/60 mb-4">
              Wichtig: Die Adresse wird für automatische Auszahlungen und das Schließen des Investments (wenn Auto-Renew
              deaktiviert ist) verwendet. Für USDT aktuell ERC-20 (Ethereum).
            </p>

            <div className="space-y-4">
              <label className="text-sm block">
                BTC-Adresse
                <input
                  value={walletBTC}
                  onChange={(e) => setWalletBTC(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  placeholder="z. B. bc1q…"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="text-sm block">
                ETH-Adresse
                <input
                  value={walletETH}
                  onChange={(e) => setWalletETH(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  placeholder="0x… (42 Zeichen)"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <label className="text-sm block">
                USDT-Adresse (ERC-20)
                <input
                  value={walletUSDT}
                  onChange={(e) => setWalletUSDT(e.target.value)}
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                  placeholder="0x… (42 Zeichen)"
                  autoComplete="off"
                  spellCheck={false}
                />
              </label>

              <button
                onClick={saveWallets}
                className="mt-2 inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500"
              >
                <FaSave /> Adressen speichern
              </button>
            </div>
          </div>

          {/* E-Mail ändern */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">E-Mail</h2>
            <div className="flex flex-col md:flex-row gap-3">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                placeholder="neue.email@domain.com"
              />
              <button
                onClick={saveEmail}
                className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-medium hover:bg-indigo-500"
              >
                <FaSave /> E-Mail ändern
              </button>
            </div>
            <p className="text-xs text-white/60 mt-2">
              Du erhältst eine Bestätigungs-E-Mail. Bis zur Bestätigung bleibt die alte Adresse aktiv.
            </p>
          </div>

          {/* Passwort ändern */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Passwort ändern</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <label className="text-sm">
                Neues Passwort
                <div className="mt-1 flex items-stretch gap-2">
                  <input
                    type={showNew ? "text" : "password"}
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                    placeholder="mind. 8 Zeichen"
                  />
                  <button
                    type="button"
                    onClick={() => setShowNew((v) => !v)}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    aria-label={showNew ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showNew ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>

              <label className="text-sm">
                Passwort bestätigen
                <div className="mt-1 flex items-stretch gap-2">
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="flex-1 rounded-xl border border-white/10 bg-black/30 px-3 py-2 text-sm"
                    placeholder="wiederholen"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((v) => !v)}
                    className="px-3 py-2 rounded-xl border border-white/10 bg-white/5 hover:bg-white/10 text-sm"
                    aria-label={showConfirm ? "Passwort verbergen" : "Passwort anzeigen"}
                  >
                    {showConfirm ? <FaEyeSlash /> : <FaEye />}
                  </button>
                </div>
              </label>
            </div>

            <div className="mt-4">
              <button
                onClick={savePassword}
                className="inline-flex items-center gap-2 rounded-xl bg-green-600 px-4 py-2 text-sm font-medium hover:bg-green-500"
              >
                <FaSave /> Passwort ändern
              </button>
            </div>
          </div>

          {/* Investment-Einstellungen */}
          <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
            <h2 className="text-xl font-semibold mb-4">Investment-Einstellungen</h2>

            {loadingAcct ? (
              <p className="text-white/70">Lade Investment…</p>
            ) : !acct ? (
              <p className="text-red-400">
                Kein Investment-Konto gefunden. (Wird beim ersten Deposit automatisch erstellt.)
              </p>
            ) : (
              <>
                {/* Zahlen */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                  <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                    <p className="text-sm text-white/70">Investiertes Kapital</p>
                    <p className="text-2xl font-bold mt-1">{fmt(acct.invest_balance)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                    <p className="text-sm text-white/70">Auszahlbare Rendite</p>
                    <p className="text-2xl font-bold mt-1">{fmt(acct.withdrawable_yield)}</p>
                  </div>
                  <div className="rounded-xl border border-white/10 bg-white/10 p-4">
                    <p className="text-sm text-white/70">Zyklus-Tag</p>
                    <p className="text-2xl font-bold mt-1">{Number(acct.cycle_day ?? 0)}/100</p>
                  </div>
                </div>

                {/* Progressbar */}
                <div className="mb-6">
                  <p className="text-sm text-white/70 mb-2">100-Tage-Zyklus</p>
                  <div className="h-3 w-full bg-white/10 rounded-lg overflow-hidden">
                    <div
                      className="h-full bg-purple-600"
                      style={{ width: `${Math.min(100, Number(acct.cycle_day || 0))}%` }}
                    />
                  </div>
                  <p className="text-xs text-white/60 mt-2">
                    Start: {acct.cycle_started_at
                      ? new Date(acct.cycle_started_at).toLocaleDateString("de-DE", {
                          year: "numeric",
                          month: "2-digit",
                          day: "2-digit",
                        })
                      : "—"}
                  </p>
                </div>

                {/* Toggles */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-6">
                  <button
                    onClick={() => toggleFlag("auto_compound_own")}
                    className={`px-4 py-3 rounded-lg border border-white/10 hover:bg-white/10 ${
                      acct.auto_compound_own ? "bg-green-600" : "bg-slate-700"
                    }`}
                  >
                    Auto-Compound (Rendite): {acct.auto_compound_own ? "AN" : "AUS"}
                  </button>
                  <button
                    onClick={() => toggleFlag("auto_compound_ref")}
                    className={`px-4 py-3 rounded-lg border border-white/10 hover:bg-white/10 ${
                      acct.auto_compound_ref ? "bg-green-600" : "bg-slate-700"
                    }`}
                  >
                    Auto-Compound (Ref-Boni): {acct.auto_compound_ref ? "AN" : "AUS"}
                  </button>
                  <button
                    onClick={() => toggleFlag("auto_cycle_renew")}
                    className={`px-4 py-3 rounded-lg border border-white/10 hover:bg-white/10 ${
                      acct.auto_cycle_renew ? "bg-green-600" : "bg-slate-700"
                    }`}
                  >
                    Auto-Renew Zyklus: {acct.auto_cycle_renew ? "AN" : "AUS"}
                  </button>
                </div>

                {/* Rendite verwenden – überarbeitet mit Validierung */}
                <div className="rounded-2xl border border-white/10 bg-gradient-to-b from-white/[0.07] to-white/[0.03] p-5">
                  <div className="flex items-center justify-between gap-3 mb-2">
                    <h3 className="text-xl font-semibold tracking-tight">Rendite verwenden</h3>
                    <span className="text-sm text-white/70">
                      Verfügbar:&nbsp;<span className="font-semibold text-white">{fmt(wy)}</span>
                    </span>
                  </div>

                  {/* Quick-Amount Chips */}
                  <div className="flex flex-wrap gap-2 mb-5">
                    {[{l:"25%",f:.25},{l:"50%",f:.5},{l:"75%",f:.75},{l:"Max",f:1}].map(x=>(
                      <button
                        key={x.l}
                        onClick={()=>setQuick(x.f)}
                        className="px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.06] hover:bg-white/[0.12] text-xs"
                      >
                        {x.l}
                      </button>
                    ))}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                    {/* Reinvest */}
                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-emerald-600/20 border border-emerald-500/30 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M7 17l5-5 5 5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                            <path d="M12 12V3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold">Reinvestieren</h4>
                      </div>

                      <label className="text-xs text-white/70">Betrag (USD)</label>
                      <div className={`mt-1 flex items-stretch rounded-lg border ${reinvestErr ? "border-red-500/60" : "border-white/10"} bg-black/40`}>
                        <span className="px-3 inline-flex items-center text-white/60 text-sm">$</span>
                        <input
                          value={reinvestAmt}
                          onChange={(e) => setReinvestAmt(e.target.value)}
                          onBlur={() => !reinvestErr && reinvestAmt && setReinvestAmt(clamp2(parseAmt(reinvestAmt)).toFixed(2))}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                        />
                        <button
                          onClick={() => setReinvestAmt(wy.toFixed(2))}
                          className="px-3 text-xs border-l border-white/10 hover:bg-white/10"
                          title="Max"
                          type="button"
                        >
                          Max
                        </button>
                      </div>
                      {reinvestErr && <p className="mt-1 text-[11px] text-red-400">{reinvestErr}</p>}

                      <button
                        onClick={doReinvest}
                        disabled={!!reinvestErr || wy <= 0}
                        className="mt-3 w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
                      >
                        Reinvestieren
                      </button>

                      <p className="text-[11px] text-white/60 mt-2">
                        Wird deinem <span className="text-white/80 font-medium">Investierten Kapital</span> gutgeschrieben.
                      </p>
                    </div>

                    {/* Withdraw */}
                    <div className="rounded-xl border border-white/10 bg-black/30 p-4">
                      <div className="flex items-center gap-2 mb-2">
                        <div className="h-8 w-8 rounded-lg bg-indigo-600/20 border border-indigo-500/30 flex items-center justify-center">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                            <path d="M3 7h13a3 3 0 0 1 3 3v4a3 3 0 0 1-3 3H3V7Z" stroke="currentColor" strokeWidth="2" />
                            <path d="M16 10h4v6h-4a2 2 0 0 1-2-2v-2a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" />
                          </svg>
                        </div>
                        <h4 className="text-base font-semibold">Auszahlung anfragen</h4>
                      </div>

                      <label className="text-xs text-white/70">Betrag (USD)</label>
                      <div className={`mt-1 flex items-stretch rounded-lg border ${withdrawErr ? "border-red-500/60" : "border-white/10"} bg-black/40`}>
                        <span className="px-3 inline-flex items-center text-white/60 text-sm">$</span>
                        <input
                          value={withdrawAmt}
                          onChange={(e) => setWithdrawAmt(e.target.value)}
                          onBlur={() => !withdrawErr && withdrawAmt && setWithdrawAmt(clamp2(parseAmt(withdrawAmt)).toFixed(2))}
                          placeholder="0.00"
                          inputMode="decimal"
                          className="flex-1 bg-transparent px-2 py-2 text-sm outline-none"
                        />
                        <button
                          onClick={() => setWithdrawAmt(wy.toFixed(2))}
                          className="px-3 text-xs border-l border-white/10 hover:bg-white/10"
                          title="Max"
                          type="button"
                        >
                          Max
                        </button>
                      </div>
                      {withdrawErr && <p className="mt-1 text-[11px] text-red-400">{withdrawErr}</p>}

                      <button
                        onClick={doWithdrawRequest}
                        disabled={!!withdrawErr || wy <= 0}
                        className="mt-3 w-full rounded-lg bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 px-4 py-2 text-sm font-medium"
                      >
                        Auszahlung anfragen
                      </button>

                      <p className="text-[11px] text-white/60 mt-2">
                        Admin prüft die Anfrage. Bei Bestätigung reduziert sich dein
                        <span className="text-white/80 font-medium"> Auszahlbare Rendite</span>-Saldo automatisch.
                      </p>
                    </div>
                  </div>

                  <div className="mt-5 border-t border-white/10 pt-3 text-[11px] text-white/60">
                    Betrag muss &gt; 0 und ≤ verfügbarer Rendite sein. Währung: USD.
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
