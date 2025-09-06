// src/app/api/admin/update-transaction/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    // Admin-Session
    const supabase = createRouteHandlerClient({ cookies });
    const { data: { user } } = await supabase.auth.getUser();
    const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();
    if (!user || (user.email || "").toLowerCase() !== adminEmail) {
      return NextResponse.json({ error: "Not authorized" }, { status: 403 });
    }

    const { id, action } = await req.json();
    if (!id || !["approve", "reject"].includes(action)) {
      return NextResponse.json({ error: "Bad request" }, { status: 400 });
    }

    // Transaktion holen (Service-Client)
    const { data: tx, error: txErr } = await supabaseAdmin
      .from("transactions")
      .select("id, user_id, type, amount, currency, status")
      .eq("id", id)
      .single();

    if (txErr || !tx) return NextResponse.json({ error: "Transaction not found" }, { status: 404 });
    if (tx.status !== "pending") {
      return NextResponse.json({ error: "Only pending can be updated" }, { status: 409 });
    }

    // >>> HIER: Check-Constraint erwartet 'approved' statt 'completed'
    const nextStatus = action === "approve" ? "approved" : "rejected";

    // Status setzen
    const { error: upErr } = await supabaseAdmin
      .from("transactions")
      .update({ status: nextStatus })
      .eq("id", tx.id);
    if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

    // Einzahlung → Kapital gutschreiben (nur bei approve)
    if (tx.type === "deposit" && action === "approve") {
      const addAmount = Number(tx.amount || 0);

      // Konto vorhanden?
      const { data: acct } = await supabaseAdmin
        .from("investment_accounts")
        .select("user_id, invest_balance")
        .eq("user_id", tx.user_id)
        .maybeSingle();

      if (!acct) {
        const { error: insErr } = await supabaseAdmin
          .from("investment_accounts")
          .insert({ user_id: tx.user_id, invest_balance: addAmount });
        if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
      } else {
        const newBalance = Number(acct.invest_balance || 0) + addAmount;
        const { error: updErr } = await supabaseAdmin
          .from("investment_accounts")
          .update({ invest_balance: newBalance })
          .eq("user_id", tx.user_id);
        if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });
      }
    }

    return NextResponse.json({ success: true, status: nextStatus });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Server error" }, { status: 500 });
  }
}
