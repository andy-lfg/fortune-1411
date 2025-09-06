// src/app/api/admin/deposits/confirm/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { transactionId } = await req.json();

  // Admin-Check (per E-Mail aus ENV; alternativ: admin-Flag im Profile)
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "office@wb-solutions.at").toLowerCase();
  if (!user || (user.email || "").toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  // Transaktion laden (nur deposits, pending)
  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("id, user_id, type, amount, status")
    .eq("id", transactionId)
    .single();

  if (txErr || !tx) {
    return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
  }
  if (tx.type !== "deposit" || tx.status !== "pending") {
    return NextResponse.json({ error: "not_a_pending_deposit" }, { status: 400 });
  }

  const amount = Number(tx.amount || 0);
  if (amount <= 0) {
    return NextResponse.json({ error: "invalid_amount" }, { status: 400 });
  }

  // Investment-Account anlegen falls fehlt
  const { data: ia } = await supabase
    .from("investment_accounts")
    .select("user_id")
    .eq("user_id", tx.user_id)
    .single();

  if (!ia) {
    const { error: insErr } = await supabase
      .from("investment_accounts")
      .insert({
        user_id: tx.user_id,
        invest_balance: 0,
        withdrawable_yield: 0,
        total_earned: 0,
        cycle_day: 0,
        cycle_started_at: new Date().toISOString().slice(0, 10), // heute als Start
        auto_compound_own: true,
        auto_compound_ref: true,
        auto_cycle_renew: true,
      });
    if (insErr) {
      return NextResponse.json({ error: "account_create_failed" }, { status: 500 });
    }
  }

  // Betrag auf invest_balance buchen
  const { error: upErr } = await supabase.rpc("sql", {
    // Hinweis: Wenn du keine sql-RPC hast, mach’s mit update:
  } as any);

  // → wir machen es ohne RPC, direkt mit update + increment:
  const { error: balErr } = await supabase
    .from("investment_accounts")
    .update({
      invest_balance: (ia ? undefined : 0) as any, // Platzhalter, wird gleich überschrieben
    })
    .eq("user_id", tx.user_id);

  // Workaround: Supabase kann nicht "increment" + upsert in einem Call in AppRouter.
  // Daher lesen+schreiben wir sauber in zwei Schritten:
  const { data: curr } = await supabase
    .from("investment_accounts")
    .select("invest_balance, cycle_day, cycle_started_at")
    .eq("user_id", tx.user_id)
    .single();

  const newBalance = Number((curr?.invest_balance ?? 0)) + amount;

  const { error: finalErr } = await supabase
    .from("investment_accounts")
    .update({
      invest_balance: newBalance,
      // Wenn noch kein Zyklus gesetzt war, heute setzen (falls du das möchtest)
      cycle_started_at: curr?.cycle_started_at ?? new Date().toISOString().slice(0, 10),
    })
    .eq("user_id", tx.user_id);

  if (finalErr) {
    return NextResponse.json({ error: "balance_update_failed" }, { status: 500 });
  }

  // Transaktion als completed markieren
  const { error: txUpErr } = await supabase
    .from("transactions")
    .update({ status: "completed" })
    .eq("id", tx.id);

  if (txUpErr) {
    return NextResponse.json({ error: "tx_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
