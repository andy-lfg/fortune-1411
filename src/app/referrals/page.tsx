// src/app/referrals/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type Profile = {
  id: string;
  nickname: string | null;
  referred_by?: string | null;
};

export default function ReferralsPage() {
  const [loading, setLoading] = useState(true);
  const [me, setMe] = useState<Profile | null>(null);
  const [upline, setUpline] = useState<Profile | null>(null);

  const [level1, setLevel1] = useState<Profile[]>([]);
  const [level2, setLevel2] = useState<Profile[]>([]);
  const [level3, setLevel3] = useState<Profile[]>([]);
  const [earnings, setEarnings] = useState<number>(0);

  // Referral-Link
  const referralLink = useMemo(() => {
    if (typeof window === "undefined" || !me?.id) return "";
    return `${window.location.origin}/register?ref=${me.id}`;
  }, [me?.id]);

  useEffect(() => {
    (async () => {
      setLoading(true);

      // 1) Auth + eigenes Profil (nur Basics; erlaubt durch RLS)
      const { data: auth } = await supabase.auth.getUser();
      const user = auth?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const { data: myProfile, error: meErr } = await supabase
        .from("profiles")
        .select("id, nickname, referred_by")
        .eq("id", user.id)
        .maybeSingle();

      if (meErr) console.warn("profiles(me):", meErr);
      if (!myProfile) {
        setLoading(false);
        return;
      }
      setMe(myProfile as Profile);

      // 2) Upline (via RPC)
      const { data: up } = await supabase.rpc("referral_upline", { p_user: user.id });
      setUpline(up && (up as any[])[0] ? (up as any[])[0] as Profile : null);

      // 3) L1/L2/L3 (via RPC, um RLS zu umgehen)
      const [l1Res, l2Res, l3Res] = await Promise.all([
        supabase.rpc("referral_l1", { p_user: user.id }),
        supabase.rpc("referral_l2", { p_user: user.id }),
        supabase.rpc("referral_l3", { p_user: user.id }),
      ]);

      setLevel1((l1Res.data as Profile[]) || []);
      setLevel2((l2Res.data as Profile[]) || []);
      setLevel3((l3Res.data as Profile[]) || []);

      // 4) Referral-Einnahmen (RPC; hat Zugriff auf yield_events)
      const { data: sumRes } = await supabase.rpc("referral_earnings_sum", {
        p_user: user.id,
      });
      setEarnings(Number(sumRes || 0));

      setLoading(false);
    })();
  }, []);

  // Statistiken
  const stats = useMemo(
    () => ({
      level1: level1.length,
      level2: level2.length,
      level3: level3.length,
      total: level1.length + level2.length + level3.length,
      earnings,
    }),
    [level1, level2, level3, earnings]
  );

  // Baum-Hilfsfunktionen
  const groupByParent = (arr: Profile[]) => {
    const m = new Map<string, Profile[]>();
    arr.forEach((c) => {
      const parent = c.referred_by || "";
      if (!m.has(parent)) m.set(parent, []);
      m.get(parent)!.push(c);
    });
    return m;
  };
  const l2ByParent = useMemo(() => groupByParent(level2), [level2]);
  const l3ByParent = useMemo(() => groupByParent(level3), [level3]);

  const nameOf = (p?: Profile | null) =>
    p?.nickname?.trim() ? p.nickname! : "(ohne Nickname)";

  const copyLink = async () => {
    if (!referralLink) return;
    await navigator.clipboard.writeText(referralLink);
    alert("Link kopiert!");
  };

  if (loading) return <p className="p-6">Lade…</p>;

  return (
    <section className="mx-auto max-w-5xl px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Deine Referrals</h1>

      {/* Upline-Kästchen (nur 1 Stufe) */}
      <div className="mb-6">
        <div className="inline-flex items-center gap-2 rounded-xl border border-white/10 bg-white/5 px-3 py-2">
          <span className="text-white/70 text-sm">Eingeladen von:</span>
          <span className="font-semibold">
            {upline ? nameOf(upline) : "—"}
          </span>
        </div>
      </div>

      {/* Einladungslink + Teilen */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white mb-8 shadow">
        <p className="font-semibold mb-2">Dein persönlicher Einladungslink</p>
        <div className="flex flex-col md:flex-row gap-2">
          <input
            value={referralLink}
            readOnly
            className="w-full px-3 py-2 rounded text-black"
          />
          <div className="flex gap-2">
            <button
              onClick={copyLink}
              className="px-3 py-2 bg-black/20 hover:bg-black/30 rounded flex items-center gap-2"
              title="Link kopieren"
            >
              <span>📋</span> <span>Kopieren</span>
            </button>

            {/* WhatsApp */}
            <a
              href={`https://wa.me/?text=${encodeURIComponent(
                `Komm zu Fortune 1411 – melde dich hier an: ${referralLink}`
              )}`}
              target="_blank"
              className="px-3 py-2 rounded flex items-center gap-2"
              style={{ backgroundColor: "#25D366" }}
              title="Über WhatsApp teilen"
            >
              <svg width="18" height="18" viewBox="0 0 32 32" aria-hidden="true">
                <path
                  d="M19.11 17.33c-.27-.14-1.58-.78-1.82-.87-.24-.09-.42-.14-.6.14-.18.27-.69.87-.85 1.05-.16.18-.31.2-.58.07-.27-.14-1.13-.42-2.15-1.34-.79-.71-1.32-1.59-1.48-1.86-.16-.27-.02-.41.12-.55.12-.12.27-.31.4-.47.14-.16.18-.27.27-.45.09-.18.05-.34-.02-.47-.07-.14-.6-1.45-.82-1.99-.22-.53-.44-.46-.6-.47-.16-.01-.34-.01-.52-.01-.18 0-.47.07-.72.34-.24.27-.94.92-.94 2.25 0 1.33.96 2.62 1.09 2.8.14.18 1.89 2.89 4.58 4.05.64.28 1.13.45 1.51.57.63.2 1.2.17 1.65.1.5-.08 1.58-.65 1.8-1.29.22-.64.22-1.19.16-1.29-.06-.1-.22-.16-.49-.3zM16.03 3C9.38 3 4 8.38 4 15.03c0 2.65.86 5.1 2.33 7.09L5 29l7.08-1.86c1.93 1.06 4.16 1.67 6.52 1.67 6.66 0 12.03-5.38 12.03-12.03C30.63 8.38 25.26 3 18.6 3h-2.57z"
                  fill="currentColor"
                />
              </svg>
              <span>WhatsApp</span>
            </a>

            {/* Telegram */}
            <a
              href={`https://t.me/share/url?url=${encodeURIComponent(
                referralLink
              )}&text=${encodeURIComponent(
                "Komm zu Fortune 1411 – sichere dir deinen Platz!"
              )}`}
              target="_blank"
              className="px-3 py-2 rounded flex items-center gap-2"
              style={{ backgroundColor: "#29A9EA" }}
              title="Über Telegram teilen"
            >
              <svg width="18" height="18" viewBox="0 0 240 240" aria-hidden="true">
                <path
                  d="M120 0C53.73 0 0 53.73 0 120s53.73 120 120 120 120-53.73 120-120S186.27 0 120 0zm58.3 78.2c-2.2 30-11.7 102.8-14.8 121.9-1.4 8.7-5.1 11.6-8.3 11.9-7.1.7-12.5-4.7-19.3-9.2-10.7-7-16.8-11.4-27.1-18.2-12-7.9-4.2-12.3 2.6-19.4 1.8-1.9 32.4-29.7 33.1-32.3.1-.3.1-1.6-.6-2.3-.7-.7-1.7-.5-2.5-.3-1.1.3-18.7 11.9-52.8 34.6-5 3.4-9.6 5-13.7 4.9-4.5-.1-13-2.5-19.4-4.6-7.8-2.5-14-3.8-13.5-8 .3-2.4 3.6-4.9 9.9-7.6 38.9-16.9 64.8-28.1 77.7-33.6 37.1-15.5 44.8-18.3 49.8-18.4 1.1 0 3.6.3 5.2 1.7 1.3 1.1 1.7 2.6 1.8 3.7 0 .8.2 2.7 0 4.3z"
                  fill="currentColor"
                />
              </svg>
              <span>Telegram</span>
            </a>
          </div>
        </div>
      </div>

      {/* Statistiken */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-10">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-lg font-bold">{stats.total}</p>
          <p className="text-sm text-white/70">Gesamt</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-lg font-bold">{stats.level1}</p>
          <p className="text-sm text-white/70">Level 1</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-lg font-bold">{stats.level2}</p>
          <p className="text-sm text-white/70">Level 2</p>
        </div>
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-lg font-bold">{stats.level3}</p>
          <p className="text-sm text-white/70">Level 3</p>
        </div>
        <div className="p-4 rounded-xl bg-green-600 border border-white/10 md:col-span-1 col-span-2">
          <p className="text-lg font-bold">${stats.earnings.toFixed(2)}</p>
          <p className="text-sm text-white/80">Referral-Einnahmen</p>
        </div>
      </div>

      {/* Stammbaum */}
      <div className="p-6 rounded-2xl bg-white/5 border border-white/10">
        <h2 className="text-xl font-bold mb-4">Dein Referral-Baum (3 Ebenen)</h2>

        {/* Root */}
        <div>
          <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/10 px-3 py-1 text-sm mb-2">
            <span className="inline-block h-2 w-2 rounded-full bg-purple-400" />
            <span>{nameOf(me as any)}</span>
            <span className="text-white/60">(Du)</span>
          </div>

          {/* L1 */}
          {level1.length === 0 ? (
            <p className="text-white/70 mt-2">Noch keine direkten Referrals.</p>
          ) : (
            <ul className="ml-4 border-l border-white/10 pl-4 space-y-3">
              {level1.map((l1) => (
                <li key={l1.id}>
                  <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm">
                    <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                    <span>{nameOf(l1)}</span>
                    <span className="text-white/60">Level 1</span>
                  </div>

                  {/* L2 (Kinder von L1) */}
                  <ul className="ml-4 mt-2 border-l border-white/10 pl-4 space-y-2">
                    {(l2ByParent.get(l1.id) || []).map((l2) => (
                      <li key={l2.id}>
                        <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm">
                          <span className="inline-block h-2 w-2 rounded-full bg-blue-400" />
                          <span>{nameOf(l2)}</span>
                          <span className="text-white/60">Level 2</span>
                        </div>

                        {/* L3 (Kinder von L2) */}
                        <ul className="ml-4 mt-2 border-l border-white/10 pl-4 space-y-2">
                          {(l3ByParent.get(l2.id) || []).map((l3) => (
                            <li key={l3.id}>
                              <div className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-3 py-1 text-sm">
                                <span className="inline-block h-2 w-2 rounded-full bg-teal-400" />
                                <span>{nameOf(l3)}</span>
                                <span className="text-white/60">Level 3</span>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </li>
                    ))}
                  </ul>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </section>
  );
}
