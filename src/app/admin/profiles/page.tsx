// src/app/admin/profiles/page.tsx
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import ProfilesTable from "./table";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminProfilesPage() {
  // Admin-Check (RLS-konform, cookie-basiert)
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  const { data: { user } } = await supabase.auth.getUser();
  const adminMail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const curMail = (user?.email ?? "").trim().toLowerCase();
  if (!adminMail || curMail !== adminMail) {
    return <section className="p-6 text-red-400">Kein Zugriff (Admin erforderlich).</section>;
  }

  // Service-Role: ALLE Profile & Accounts laden
  const { data: profiles, error: pErr } = await supabaseAdmin
    .from("profiles")
    .select("id, email, first_name, last_name, nickname, wallet_btc, wallet_eth, wallet_usdt, referred_by, created_at")
    .order("created_at", { ascending: false });

  if (pErr) {
    return <section className="p-6 text-red-400">Fehler beim Laden der Profile: {pErr.message}</section>;
  }

  const { data: accounts, error: aErr } = await supabaseAdmin
    .from("investment_accounts")
    .select("user_id, invest_balance, withdrawable_yield");

  if (aErr) {
    return <section className="p-6 text-red-400">Fehler beim Laden der Konten: {aErr.message}</section>;
  }

  // Map für schnelle Zuordnung
  const accMap: Record<string, { invest_balance: number; withdrawable_yield: number }> = {};
  (accounts || []).forEach(a => {
    accMap[a.user_id] = {
      invest_balance: Number(a.invest_balance || 0),
      withdrawable_yield: Number(a.withdrawable_yield || 0),
    };
  });

  // Zeilen vorbereiten
  const rows = (profiles || []).map(p => ({
    ...p,
    invest_balance: accMap[p.id]?.invest_balance ?? 0,
    withdrawable_yield: accMap[p.id]?.withdrawable_yield ?? 0,
  }));

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Admin – Alle Profile</h1>
        <a href="/admin" className="rounded-lg border border-white/15 bg-white/5 px-4 py-2 text-sm hover:bg-white/10">Zu Transaktionen</a>
      </div>

      <ProfilesTable rows={rows} />
    </section>
  );
}
