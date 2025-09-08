// src/app/admin/page.tsx
import Link from "next/link";
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import AdminTable from "./table";
import { supabaseAdmin } from "@/lib/supabaseAdmin"; // ⬅️ Service-Role Client (Server-only!)

export const dynamic = "force-dynamic";
export const revalidate = 0;

// Hilfstyp für Query-Werte
type SP = Record<string, string | string[] | undefined>;

function buildURL(params: Record<string, string | undefined>) {
  const sp = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => v && sp.set(k, v));
  const q = sp.toString();
  return q ? `?${q}` : "";
}

export default async function AdminPage(
  props:
    | { searchParams?: SP }
    | { searchParams: Promise<SP> }
) {
  // ✅ searchParams robust behandeln (Promise ODER Sync-Objekt)
  const raw = (props as any).searchParams;
  const sp: SP =
    raw && typeof raw.then === "function" ? await raw : (raw ?? {});

  // 1) Admin-Check mit dem "anon"-Serverclient (cookie-basiert, RLS-konform)
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

  // 2) Filter lesen (aus sp statt searchParams)
  const typeParam = (sp.type as SP["type"]) || "all";
  const range = (sp.range as SP["range"]) || "30d";

  const fromStr = typeof sp.from === "string" ? sp.from : Array.isArray(sp.from) ? sp.from[0] : undefined;
  const toStr   = typeof sp.to   === "string" ? sp.to   : Array.isArray(sp.to)   ? sp.to[0]   : undefined;

  const fromParam = fromStr ? new Date(fromStr) : undefined;
  const toParam   = toStr   ? new Date(toStr)   : undefined;

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
    startDate.getFullYear(),
    startDate.getMonth(),
    startDate.getDate(), 0, 0, 0
  )).toISOString();

  const endISO = new Date(Date.UTC(
    endDate.getFullYear(),
    endDate.getMonth(),
    endDate.getDate(), 23, 59, 59, 999
  )).toISOString();

  // 3) Service-Role Client NUR serverseitig verwenden (bypasst RLS, aber nur nach Admin-Check!)
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

  // 4) Alle betroffenen Profile OHNE RLS holen (Service-Role)
  const userIds = Array.from(new Set(tx.map((t: any) => t.user_id).filter(Boolean)));
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
    (profs || []).forEach((p: any) => { profMap[p.id] = p; });
  }

  // 5) Transaktionszeilen mit Profilfeldern mergen (für AdminTable)
  const rows = tx.map((t: any) => ({
    ...t,
    profile_first_name: profMap[t.user_id]?.first_name ?? null,
    profile_last_name:  profMap[t.user_id]?.last_name ?? null,
    profile_nickname:   profMap[t.user_id]?.nickname ?? null,
    profile_email:      profMap[t.user_id]?.email ?? t.user_email ?? null,
  }));

  // Summen
  const totalDeposits  = rows.filter((r: any) => r.type === "deposit" || r.type === "DEPOSIT").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const totalWithdraws = rows.filter((r: any) => r.type === "withdraw" || r.type === "withdrawal" || r.type === "WITHDRAW").reduce((s: number, r: any) => s + Number(r.amount || 0), 0);
  const net = totalDeposits - totalWithdraws;

  // Filter-Links (nutzt sp.* statt searchParams.*)
  const qsAll   = buildURL({ type: "all",      range: range as string, from: fromStr, to: toStr });
  const qsDep   = buildURL({ type: "deposit",  range: range as string, from: fromStr, to: toStr });
  const qsWit   = buildURL({ type: "withdraw", range: range as string, from: fromStr, to: toStr });
  const qsToday = buildURL({ type: typeParam as string, range: "today" });
  const qs7d    = buildURL({ type: typeParam as string, range: "7d" });
  const qs30d   = buildURL({ type: typeParam as string, range: "30d" });

  return (
    <section className="mx-auto max-w-7xl px-4 py-16">
      {/* Header mit Button zu /admin/profiles */}
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
          <input type="hidden" name="type"  value={(typeParam as string) || ""} />
          <input type="hidden" name="range" value="custom" />
          <input type="date" name="from" defaultValue={fromStr || ""} className="rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm" />
          <span className="text-white/60 text-sm">bis</span>
          <input type="date" name="to"   defaultValue={toStr   || ""} className="rounded-md bg-black/30 border border-white/10 px-2 py-1 text-sm" />
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