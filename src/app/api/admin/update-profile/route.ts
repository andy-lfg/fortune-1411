// src/app/api/admin/update-profile/route.ts
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export async function POST(req: Request) {
  try {
    const { user_id, updates, account_updates } = await req.json();

    if (!user_id) {
      return NextResponse.json({ error: "user_id fehlt" }, { status: 400 });
    }

    // Admin-Check über Session (anon, RLS-konform)
    const cookieStore = cookies();
    const supabase = createRouteHandlerClient({ cookies: () => cookieStore });
    const { data: { user } } = await supabase.auth.getUser();
    const adminMail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL ?? "").trim().toLowerCase();
    const curMail = (user?.email ?? "").trim().toLowerCase();
    if (!adminMail || curMail !== adminMail) {
      return NextResponse.json({ error: "Nicht autorisiert" }, { status: 403 });
    }

    const out: any = {};

    // --- Profile-Updates (whitelist) ---
    if (updates && typeof updates === "object") {
      const allowed = ["email", "first_name", "last_name", "nickname", "wallet_btc", "wallet_eth", "wallet_usdt"];
      const payload: Record<string, any> = {};
      for (const k of allowed) {
        if (k in updates) {
          const v = updates[k];
          payload[k] = v === "" ? null : v;
        }
      }
      if (Object.keys(payload).length) {
        const { data: profile, error: upErr } = await supabaseAdmin
          .from("profiles")
          .update(payload)
          .eq("id", user_id)
          .select("id, email, first_name, last_name, nickname, wallet_btc, wallet_eth, wallet_usdt")
          .single();
        if (upErr) return NextResponse.json({ error: upErr.message }, { status: 400 });
        out.profile = profile;

        // Optional: Auth-E-Mail synchronisieren
        if ("email" in payload && payload.email) {
          const { error: authErr } = await supabaseAdmin.auth.admin.updateUserById(user_id, {
            email: payload.email,
          });
          if (authErr) {
            out.warning = `Profil gespeichert, aber Auth-E-Mail konnte nicht aktualisiert werden: ${authErr.message}`;
          }
        }
      }
    }

    // --- Account-Updates (invest_balance / withdrawable_yield) ---
    if (account_updates && typeof account_updates === "object") {
      const toNum = (v: any) => (v === null || v === undefined || v === "" ? undefined : Number(v));
      const inv = toNum(account_updates.invest_balance);
      const wy  = toNum(account_updates.withdrawable_yield);

      if ((inv !== undefined && (isNaN(inv) || inv < 0)) ||
          (wy  !== undefined && (isNaN(wy)  || wy  < 0))) {
        return NextResponse.json({ error: "Invest/Rendite müssen ≥ 0 und numerisch sein." }, { status: 400 });
      }

      // Row sicherstellen (falls Account noch nicht existiert)
      await supabaseAdmin
        .from("investment_accounts")
        .upsert({ user_id }, { onConflict: "user_id" });

      const payloadAcc: Record<string, any> = {};
      if (inv !== undefined) payloadAcc.invest_balance = Number(inv.toFixed(2));
      if (wy  !== undefined) payloadAcc.withdrawable_yield = Number(wy.toFixed(2));

      if (Object.keys(payloadAcc).length) {
        const { data: account, error: accErr } = await supabaseAdmin
          .from("investment_accounts")
          .update(payloadAcc)
          .eq("user_id", user_id)
          .select("user_id, invest_balance, withdrawable_yield")
          .single();
        if (accErr) return NextResponse.json({ error: accErr.message }, { status: 400 });
        out.account = account;
      }
    }

    return NextResponse.json(out, { status: 200 });
  } catch (e: any) {
    return NextResponse.json({ error: e?.message || "Unexpected error" }, { status: 500 });
  }
}
