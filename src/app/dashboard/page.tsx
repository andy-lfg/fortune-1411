// src/app/dashboard/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import Link from "next/link";
import { useRouter } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

type Milestone = {
  key: string;
  minInvest: number;
  minRefs: number;        // Nur L1-Referrals
  bonusRateBps: number;
  icon: "bronze" | "silver" | "gold" | "platinum" | "diamond" | "elite";
};

const MILESTONES: Milestone[] = [
  { key: "Bronze",   minInvest:    500,  minRefs:   5, bonusRateBps:  5, icon: "bronze"   },
  { key: "Silver",   minInvest:   2500,  minRefs:  15, bonusRateBps: 10, icon: "silver"   },
  { key: "Gold",     minInvest:   7000,  minRefs:  25, bonusRateBps: 15, icon: "gold"     },
  { key: "Platinum", minInvest:  20000,  minRefs:  50, bonusRateBps: 20, icon: "platinum" },
  { key: "Diamond",  minInvest:  50000,  minRefs:  80, bonusRateBps: 25, icon: "diamond"  },
  { key: "Elite",    minInvest: 100000,  minRefs: 120, bonusRateBps: 30, icon: "elite"    },
];

type Profile = { first_name: string | null; last_name: string | null; nickname: string | null };
type InvestmentAccount = {
  invest_balance: number | null;
  withdrawable_yield: number | null;
  total_earned: number | null;
  cycle_day: number | null;
  cycle_started_at: string | null;
  last_withdraw_at: string | null;
  pool_balance: number | null;
};

type RefCountsRow = { l1: number; l2: number; l3: number };
type DashRPC = { pool_total?: number | null };

function MedalIcon({ type, achieved }: { type: Milestone["icon"]; achieved: boolean }) {
  const map = {
    bronze: "🥉",
    silver: "🥈",
    gold: "🥇",
    platinum: "💿",
    diamond: "💎",
    elite: "👑",
  } as const;
  return (
    <span className={`text-2xl leading-none ${achieved ? "" : "opacity-40"}`} aria-label={type} title={type}>
      {map[type]}
    </span>
  );
}

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [acct, setAcct] = useState<InvestmentAccount | null>(null);

  const [refL1, setRefL1] = useState(0);
  const [refL2, setRefL2] = useState(0);
  const [refL3, setRefL3] = useState(0);

  const [poolTotalSinceSignup, setPoolTotalSinceSignup] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string>("");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setLoadError("");

        // Auth
        const { data: auth } = await supabase.auth.getUser();
        const u = auth?.user || null;
        if (!alive) return;
        if (!u) {
          setUser(null);
          return;
        }
        setUser(u);

        // Profil
        const { data: prof } = await supabase
          .from("profiles")
          .select("first_name, last_name, nickname")
          .eq("id", u.id)
          .maybeSingle();
        if (!alive) return;
        setProfile((prof as Profile) || { first_name: null, last_name: null, nickname: null });

        // Investment
        const { data: ia } = await supabase
          .from("investment_accounts")
          .select("invest_balance, withdrawable_yield, total_earned, cycle_day, cycle_started_at, last_withdraw_at, pool_balance")
          .eq("user_id", u.id)
          .maybeSingle();
        if (!alive) return;
        setAcct((ia as InvestmentAccount) || {
          invest_balance: 0, withdrawable_yield: 0, total_earned: 0,
          cycle_day: 0, cycle_started_at: null, last_withdraw_at: null, pool_balance: 0,
        });

        // Referrals (L1/L2/L3) – **serverseitig via RPC**
        const { data: counts, error: cErr } = await supabase.rpc("ref_counts_l123", { p_user: u.id });
        if (cErr) console.warn("ref_counts_l123 error:", cErr.message);
        const row: RefCountsRow | null =
          Array.isArray(counts) ? (counts[0] as RefCountsRow) : (counts as RefCountsRow | null);

        if (row) {
          setRefL1(Number(row.l1 || 0));
          setRefL2(Number(row.l2 || 0));
          setRefL3(Number(row.l3 || 0));
        } else {
          setRefL1(0); setRefL2(0); setRefL3(0);
        }

        // Globaler Pool seit Signup (falls Funktion vorhanden)
        try {
          const { data: stats } = await supabase.rpc("dashboard_stats", { p_user: u.id });
          const srow = (Array.isArray(stats) ? stats[0] : stats) as DashRPC | null;
          setPoolTotalSinceSignup(Number(srow?.pool_total ?? 0));
        } catch {
          setPoolTotalSinceSignup(0);
        }
      } catch (e: any) {
        if (alive) setLoadError(e?.message || "Unbekannter Fehler");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, [router]);

  const referralLink = useMemo(() => {
    if (!user || typeof window === "undefined") return "";
    return `${window.location.origin}/register?ref=${user.id}`;
  }, [user?.id]);

  const invest = Number(acct?.invest_balance || 0);

  // Basisrate (werktags)
  const baseRate = useMemo(() => {
    if (invest >= 100000) return 0.0050;
    if (invest >= 50000)  return 0.0040;
    if (invest >= 5000)   return 0.0035;
    if (invest >= 2500)   return 0.0030;
    if (invest >= 500)    return 0.0025;
    if (invest >= 100)    return 0.0020;
    return 0;
  }, [invest]);

  // Meilensteine: **nur L1** zählt
  const msCalc = useMemo(() => {
    const l1 = refL1;
    let reachedIndex = -1;
    MILESTONES.forEach((m, idx) => {
      if (invest >= m.minInvest && l1 >= m.minRefs) reachedIndex = idx;
    });
    const current = reachedIndex >= 0 ? MILESTONES[reachedIndex] : null;
    const next = reachedIndex + 1 < MILESTONES.length ? MILESTONES[reachedIndex + 1] : null;
    const bonusRate = current ? current.bonusRateBps / 10000 : 0;
    return {
      currentTitle: current ? current.key : "—",
      currentBonusBps: current ? current.bonusRateBps : 0,
      effectiveRate: baseRate + bonusRate,
      nextTitle: next?.key ?? null,
      needInvest: next ? Math.max(0, next.minInvest - invest) : 0,
      needRefs: next ? Math.max(0, next.minRefs - l1) : 0,
      investProgress: next ? Math.min(1, invest / next.minInvest) : 1,
      refProgress: next ? (next.minRefs > 0 ? Math.min(1, l1 / next.minRefs) : 1) : 1,
    };
  }, [invest, refL1, baseRate]);

  const emailName = user?.email?.split("@")?.[0] || "";
  const displayName =
    (profile?.first_name && profile?.last_name)
      ? `${profile.first_name} ${profile.last_name}`
      : (profile?.nickname || emailName || "Benutzer");

  const fmt = (n: any) => `$${Number(n || 0).toFixed(2)}`;

  async function reloadAccount() {
    if (!user) return;
    const { data: ia } = await supabase
      .from("investment_accounts")
      .select("invest_balance, withdrawable_yield, total_earned, cycle_day, cycle_started_at, last_withdraw_at, pool_balance")
      .eq("user_id", user.id)
      .maybeSingle();
    setAcct((ia as any) || null);

    // auch Referrals nachladen
    const { data: counts } = await supabase.rpc("ref_counts_l123", { p_user: user.id });
    const row = (Array.isArray(counts) ? counts[0] : counts) as RefCountsRow | null;
    setRefL1(Number(row?.l1 || 0));
    setRefL2(Number(row?.l2 || 0));
    setRefL3(Number(row?.l3 || 0));
  }

  async function handleReinvestFromPool() {
    const { data, error } = await supabase.rpc("reinvest_pool", { p_user: user?.id });
    if (error) return toast.error(error.message);
    if (data === "ok") { toast.success("Pool ins Investment reinvestiert."); reloadAccount(); }
    else if (data === "not_allowed_yet") toast.error("Pool erst ab Beginn des 2. Zyklus verfügbar.");
    else if (data === "insufficient_pool_balance") toast.error("Keine Pool-Balance vorhanden.");
    else toast.error("Aktion fehlgeschlagen.");
  }

  async function handleWithdrawFromPool() {
    const { data, error } = await supabase.rpc("withdraw_pool", { p_user: user?.id });
    if (error) return toast.error(error.message);
    if (data === "ok") { toast.success("Pool auf Auszahl-Balance verschoben."); reloadAccount(); }
    else if (data === "not_allowed_yet") toast.error("Pool erst ab Beginn des 2. Zyklus verfügbar.");
    else if (data === "insufficient_pool_balance") toast.error("Keine Pool-Balance vorhanden.");
    else toast.error("Aktion fehlgeschlagen.");
  }

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <Toaster position="top-right" />

      {!user ? (
        <div className="rounded-xl border border-white/10 bg-white/5 p-6">
          <h1 className="text-2xl font-bold mb-2">Bitte einloggen</h1>
          <p className="text-white/60">Du musst angemeldet sein, um dein Dashboard zu sehen.</p>
          <div className="mt-4">
            <Link href="/login" className="px-4 py-2 rounded bg-purple-600 hover:bg-purple-500 inline-block">Zum Login</Link>
          </div>
        </div>
      ) : (
        <>
          <h1 className="text-3xl font-bold mb-2">Willkommen, {displayName} 👋</h1>
          <p className="text-white/60 mb-8">Schön, dass du wieder da bist.</p>

          {/* Stat-Kacheln */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-6 mb-10">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Investiertes Kapital</h3>
              <p className="text-2xl font-bold mt-2">{fmt(acct?.invest_balance)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Auszahlbare Rendite</h3>
              <p className="text-2xl font-bold mt-2">{fmt(acct?.withdrawable_yield)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Gesamt verdient</h3>
              <p className="text-2xl font-bold mt-2">{fmt(acct?.total_earned)}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Direkte Referrals (L1)</h3>
              <p className="text-2xl font-bold mt-2">{refL1}</p>
              <p className="text-xs text-white/50 mt-1">L2: {refL2} · L3: {refL3}</p>
            </div>
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Globaler Pool seit deinem Einstieg</h3>
              <p className="text-2xl font-bold mt-2">{fmt(poolTotalSinceSignup)}</p>
            </div>
          </div>

          {/* 100-Tage-Zyklus */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-10">
            <h3 className="text-sm text-white/70 mb-2">100-Tage-Zyklus</h3>
            <div className="h-3 w-full bg-white/10 rounded-lg overflow-hidden">
              <div className="h-full bg-purple-600" style={{ width: `${Math.min(100, Number(acct?.cycle_day || 0))}%` }} />
            </div>
            <p className="text-xs text-white/60 mt-2">
              Tag {Number(acct?.cycle_day || 0)}/100 · Start: {acct?.cycle_started_at ? String(acct.cycle_started_at).slice(0,10) : "—"}
            </p>
          </div>

          {/* Rendite & Nächster Meilenstein */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Deine aktuelle tägliche Rendite</h3>
              <p className="text-3xl font-bold mt-2">
                {(baseRate * 100).toFixed(2)}% <span className="text-white/60 text-base">Basis (werktags)</span>
              </p>
              <div className="mt-4 text-sm text-white/70 space-y-1">
                <p>+ Meilenstein-Bonus: {msCalc.currentBonusBps} bps</p>
                <p className="text-white">
                  = Effektiv: <span className="font-semibold">{(msCalc.effectiveRate * 100).toFixed(2)}% pro Werktag</span>
                </p>
              </div>
            </div>

            <div className="rounded-xl border border-white/10 bg-white/5 p-6">
              <h3 className="text-sm text-white/70">Dein Rang & Nächster Meilenstein</h3>
              <p className="text-2xl font-bold mt-2">Rang: {msCalc.currentTitle}</p>
              <p className="text-sm text-white/70 mt-2">
                Aktuelle Referrals (nur L1):{" "}
                <span className="text-white font-semibold">{refL1}</span>
              </p>
              {msCalc.nextTitle ? (
                <div className="mt-4">
                  <p className="text-sm text-white/70">Nächster Rang: <span className="text-white">{msCalc.nextTitle}</span></p>
                  <div className="mt-3">
                    <p className="text-xs text-white/60 mb-1">Invest: noch {fmt(msCalc.needInvest)}</p>
                    <div className="h-2 w-full bg-white/10 rounded">
                      <div className="h-full bg-green-600 rounded" style={{ width: `${msCalc.investProgress * 100}%` }} />
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-xs text-white/60 mb-1">Referrals (nur L1): noch {Math.max(0, msCalc.needRefs)} Stück</p>
                    <div className="h-2 w-full bg-white/10 rounded">
                      <div className="h-full bg-blue-600 rounded" style={{ width: `${msCalc.refProgress * 100}%` }} />
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-white/60 mt-2">Du hast bereits den höchsten Rang erreicht. 🔥</p>
              )}
            </div>
          </div>

          {/* Alle Meilensteine (mit Emojis) */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-10">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold">Alle Meilensteine</h2>
              <span className="text-xs text-white/60">Erreicht = farbig · Gesperrt = ausgegraut</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 xl:grid-cols-6 gap-4">
              {MILESTONES.map((m) => {
                const achieved = invest >= m.minInvest && refL1 >= m.minRefs;
                const investProgress = m.minInvest > 0 ? Math.min(1, invest / m.minInvest) : 1;
                const refProgress = m.minRefs > 0 ? Math.min(1, refL1 / m.minRefs) : 1;
                return (
                  <div key={m.key} className={`rounded-lg border p-4 transition ${achieved ? "border-green-500/40 bg-green-500/10" : "border-white/10 bg-white/5"}`}>
                    <div className="flex items-center gap-2 mb-2">
                      <MedalIcon type={m.icon} achieved={achieved} />
                      <p className="font-semibold">{m.key}</p>
                    </div>
                    <p className="text-xs text-white/60">Anforderung</p>
                    <ul className="text-sm mt-1 space-y-1">
                      <li>Invest ≥ <span className="font-medium">${m.minInvest.toLocaleString()}</span></li>
                      <li>Referrals (nur L1) ≥ <span className="font-medium">{m.minRefs}</span></li>
                      <li>Bonus: <span className="font-medium">{m.bonusRateBps} bps</span></li>
                    </ul>
                    <div className="mt-3 space-y-2">
                      <div>
                        <p className="text-xs text-white/60 mb-1">Invest-Fortschritt</p>
                        <div className="h-2 w-full bg-white/10 rounded">
                          <div className={`h-full rounded ${achieved ? "bg-green-500" : "bg-purple-600"}`} style={{ width: `${investProgress * 100}%` }} />
                        </div>
                      </div>
                      <div>
                        <p className="text-xs text-white/60 mb-1">Referrals-Fortschritt</p>
                        <div className="h-2 w-full bg-white/10 rounded">
                          <div className={`h-full rounded ${achieved ? "bg-green-500" : "bg-blue-600"}`} style={{ width: `${refProgress * 100}%` }} />
                        </div>
                      </div>
                    </div>
                    <div className="mt-3 text-xs">
                      <span className="inline-block px-2 py-1 rounded bg-white/10 text-white/70 border border-white/10">
                        Aktuell: {refL1} / {m.minRefs} direkte Referrals
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Pool Balance (individuell) */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-10">
            <h2 className="text-xl font-semibold mb-2">Pool Balance</h2>
            <p className="text-2xl font-bold mb-2">{fmt(acct?.pool_balance)}</p>
            <p className="text-xs text-white/60 mb-4">
              Monatliche Gutschrift (z. B. am 25.). Verfügbar ab Beginn des 2. Zyklus.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleReinvestFromPool}
                disabled={!acct || Number(acct.pool_balance || 0) <= 0}
                className="px-4 py-2 rounded-lg bg-purple-600 hover:bg-purple-500 disabled:opacity-50"
              >
                ➕ Zum Investment (alles)
              </button>
              <button
                onClick={handleWithdrawFromPool}
                disabled={!acct || Number(acct.pool_balance || 0) <= 0}
                className="px-4 py-2 rounded-lg bg-green-600 hover:bg-green-500 disabled:opacity-50"
              >
                💸 Auf Auszahl-Balance (alles)
              </button>
            </div>
          </div>

          {/* Referral-Link */}
          <div className="rounded-xl border border-white/10 bg-white/5 p-6 mb-10">
            <h3 className="text-sm text-white/70 mb-2">Dein Referral-Link</h3>
            <div className="flex gap-2">
              <input type="text" value={referralLink} readOnly className="flex-1 rounded-lg bg-black/30 border border-white/10 px-3 py-2 text-sm" />
              <button
                onClick={async () => {
                  if (!referralLink) return;
                  await navigator.clipboard.writeText(referralLink);
                  toast.success("Referral-Link kopiert.");
                }}
                className="px-4 py-2 bg-green-600 rounded-lg hover:bg-green-500"
              >
                Kopieren
              </button>
              <a
                href={`https://wa.me/?text=${encodeURIComponent(`Komm zu Fortune 1411 – melde dich hier an: ${referralLink}`)}`}
                target="_blank"
                className="px-4 py-2 bg-white/10 rounded-lg border border-white/10 hover:bg-white/20"
              >
                WhatsApp
              </a>
              <a
                href={`https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent("Komm zu Fortune 1411 – sichere dir deinen Platz!")}`}
                target="_blank"
                className="px-4 py-2 bg-white/10 rounded-lg border border-white/10 hover:bg-white/20"
              >
                Telegram
              </a>
            </div>
          </div>

          {/* Shortcuts */}
          <div className="flex flex-wrap gap-4">
            <Link href="/crypto/deposit" className="px-5 py-3 bg-purple-600 rounded-xl hover:bg-purple-500">Einzahlung</Link>
            <Link href="/crypto/withdraw" className="px-5 py-3 bg-indigo-600 rounded-xl hover:bg-indigo-500">Auszahlung</Link>
            <Link href="/referrals" className="px-5 py-3 bg-green-600 rounded-xl hover:bg-green-500">Referrals anzeigen</Link>
            <Link href="/account" className="px-5 py-3 bg-white/10 border border-white/10 rounded-xl hover:bg-white/20">Mein Konto</Link>
          </div>
        </>
      )}
    </section>
  );
}
