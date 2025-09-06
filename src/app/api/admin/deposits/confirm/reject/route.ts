// src/app/api/admin/deposits/reject/route.ts
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";

export async function POST(req: Request) {
  const cookieStore = cookies();
  const supabase = createRouteHandlerClient({ cookies: () => cookieStore });

  const { transactionId } = await req.json();

  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "office@wb-solutions.at").toLowerCase();
  if (!user || (user.email || "").toLowerCase() !== adminEmail) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const { data: tx, error: txErr } = await supabase
    .from("transactions")
    .select("id, type, status")
    .eq("id", transactionId)
    .single();

  if (txErr || !tx) {
    return NextResponse.json({ error: "transaction_not_found" }, { status: 404 });
  }
  if (tx.type !== "deposit" || tx.status !== "pending") {
    return NextResponse.json({ error: "not_a_pending_deposit" }, { status: 400 });
  }

  const { error: upErr } = await supabase
    .from("transactions")
    .update({ status: "rejected" })
    .eq("id", tx.id);

  if (upErr) {
    return NextResponse.json({ error: "tx_update_failed" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
