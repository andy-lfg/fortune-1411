// src/app/admin/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminTable from "./table";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // Service-Role Client (Server-only!)

export const dynamic = "force-dynamic";
export const revalidate = 0;

type SearchParams = {
  type?: "all" | "deposit" | "withdraw" | "withdrawal";
  range?: "today" | "7d" | "30d" | "custom";
  from?: string;
  to?: string;
};

function buildURL(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

/**
 * Lockere Typisierung, damit Next 15 (searchParams teils Promise) nicht kollidiert.
 */
export default async function AdminPage(props: any) {
  const spRaw = await (props?.searchParams ?? {});
  const sp: SearchParams = (spRaw ?? {}) as SearchParams;

  // 1) Admin-Check (RLS-konform)
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });
  const { data: { user } } = await supabase.auth.getUser();

  const adminMail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").trim().toLowerCase();
  const curMail = (user?.email ?? "").trim().toLowerCase();

  if (!adminMail || curMail !== adminMail) {
    return (
      <section className="p-6 space-y-2">
        <h1 className="text-xl font-bold text-red-500">Zugriff verweigert – Admin erforderlich</h1>
      </section>
    );
  }

  // 2) Filter lesen
  const typeParam = sp.type || "all";
  const range = sp.range || "30d";
  const fromParam = sp.from ? new Date(sp.from) : undefined;
  const toParam = sp.to ? new Date(sp.to) : undefined;

  const now = new Date();
  let startDate = new Date(now);
  let endDate = new Date(now);
  if (range === "today") startDate.setHours(0, 0, 0, 0);
  else if (range === "7d") startDate.setDate(startDate.getDate() - 7);
  else if (range === "30d") startDate.setDate(startDate.getDate() - 30);
  else if (range === "custom") {
    if (fromParam) startDate = fromParam;
    if (toParam) endDate = toParam;
  }

  const startISO = new Date(Date.UTC(
    startDate.getFullYear(), startDate.getMonth(), startDate.getDate(), 0, 0, 0
  )).toISOString();
  const endISO = new Date(Date.UTC(
    endDate.getFullYear(), endDate.getMonth(), endDate.getDate(), 23, 59, 59, 999
  )).toISOString();

  // 3) Service-Role Query (nur serverseitig, nach Admin-Check)
  let txQuery = supabaseAdmin
    .from("transactions")
    .select("id, user_id, type, amount, currency, wallet_address, status, created_at, user_email")
    .gte("created_at", startISO)
    .lte("created_at", endISO)
    .order("created_at", { ascending: false })
    .limit(500);

  if (typeParam !== "all") {
    const normalized = typeParam === "withdrawal" ? "withdraw" : typeParam;
    txQuery = txQuery.eq("type", normalized as any);
  }

  const { data: txRaw, error: txErr } = await txQuery;
  if (txErr) {
    return (
      <section className="p-6">
        <h1 className="text-xl font-bold text-red-500">Fehler beim Laden</h1>
        <p className="text-white/80 mt-2">{txErr.message}</p>
      </section>
    );
  }
  const tx = txRaw || [];

  // 4) Profile holen
  const userIds = Array.from(new Set(tx.map(t => t.user_id).filter(Boolean))) as string[];
  let profMap: Record<string, any> = {};
  if (userIds.length) {
    const { data: profs, error: pErr } = await supabaseAdmin
      .from("profiles")
      .select("id, first_name, last_name, nickname, email")
      .in("id", userIds);
    if (pErr) {
      return (
        <section className="p-6">
          <h1 className="text-xl font-bold text-red-500">Fehler beim Laden der Profile</h1>
          <p className="text-white/80 mt-2">{pErr.message}</p>
        </section>
      );
    }
    (profs || []).forEach(p => { profMap[p.id] = p; });
  }

  // 5) Zeilen aufbereiten (user_id → string normalisieren)
  const rows = tx.map(t => {
    const uid = (t.user_id ?? "") as string;
    const prof = profMap[uid] || {};
    return {
      ...t,
      user_id: uid,
      profile_first_name: prof.first_name ?? null,
      profile_last_name:  prof.last_name ?? null,
      profile_nickname:   prof.nickname ?? null,
      profile_email:      prof.email ?? t.user_email ?? null,
    };
  });

  // Summen
  const totalDeposits = rows.filter(r => r.type === "deposit").reduce((s, r) => s + Number(r.amount || 0), 0);
  const totalWithdraws = rows.filter(r => (r.type === "withdraw" || r.type === "withdrawal")).reduce((s, r) => s + Number(r.amount || 0), 0);
  const net = totalDeposits - totalWithdraws;

  // Filter-Links
  const qsAll   = buildURL({ type: "all",      range, from: sp.from, to: sp.to });
  const qsDep   = buildURL({ type: "deposit",  range, from: sp.from, to: sp.to });
  const qsWit   = buildURL({ type: "withdraw", range, from: sp.from, to: sp.to });
  const qsToday = buildURL({ type: typeParam, range: "today" });
  const qs7d    = buildURL({ type: typeParam, range: "7d" });
  const qs30d   = buildURL({ type: typeParam, range: "30d" });

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between gap-3">
        <h1 className="text-3xl font-bold">Admin – Transaktionen</h1>
        <Link
          href="/admin/profiles"
          className="inline-block rounded-lg bg-purple-600 hover:bg-purple-500 px-4 py-2 text-sm font-medium"
        >
          Alle Profile
        </Link>
      </div>

      {/* Filter */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <a href={qsAll}  className={`px-4 py-2 rounded-lg border ${typeParam==="all" ? "bg-purple-600 border-purple-500" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>Alle</a>
        <a href={qsDep}  className={`px-4 py-2 rounded-lg border ${typeParam==="deposit" ? "bg-green-600 border-green-500" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>Einzahlungen</a>
        <a href={qsWit}  className={`px-4 py-2 rounded-lg border ${(typeParam==="withdraw"||typeParam==="withdrawal") ? "bg-blue-600 border-blue-500" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>Auszahlungen</a>

        <div className="w-px h-6 bg-white/10 mx-2" />

        <a href={qsToday} className={`px-3 py-2 rounded-lg border ${range==="today" ? "bg-white/20 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>Heute</a>
        <a href={qs7d}    className={`px-3 py-2 rounded-lg border ${range==="7d"    ? "bg-white/20 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>7 Tage</a>
        <a href={qs30d}   className={`px-3 py-2 rounded-lg border ${range==="30d"   ? "bg-white/20 border-white/30" : "bg-white/5 border-white/10 hover:bg-white/10"}`}>30 Tage</a>

        <form action="/admin" method="get" className="flex items-center gap-2 ml-auto">
          <input type="hidden" name="type" value={typeParam} />
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={sp.from || ""} className="rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm" />
          <span className="text-white/60 text-sm">bis</span>
          <input type="date" name="to" defaultValue={sp.to || ""} className="rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm" />
          <button type="submit" className="px-3 py-2 rounded-lg bg-white/10 border border-white/10 hover:bg-white/20 text-sm">Anwenden</button>
        </form>
      </div>

      {/* Summen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">Gesamteinzahlungen</p>
          <p className="text-2xl font-bold mt-1">${totalDeposits.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">Gesamtauszahlungen</p>
          <p className="text-2xl font-bold mt-1">${totalWithdraws.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/5 p-4">
          <p className="text-sm text-white/70">Netto</p>
          <p className="text-2xl font-bold mt-1">${net.toFixed(2)}</p>
        </div>
      </div>

      <AdminTable transactions={rows} />
    </section>
  );
}