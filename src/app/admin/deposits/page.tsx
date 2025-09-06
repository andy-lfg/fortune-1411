// src/app/admin/deposits/page.tsx
import { cookies } from "next/headers";
import { createServerComponentClient } from "@supabase/auth-helpers-nextjs";
import ApproveButtons from "./widgets";

export default async function AdminDepositsPage() {
  const cookieStore = cookies();
  const supabase = createServerComponentClient({ cookies: () => cookieStore });

  // Admin-Check
  const { data: { user } } = await supabase.auth.getUser();
  const adminEmail = (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "office@wb-solutions.at").toLowerCase();
  if (!user || (user.email || "").toLowerCase() !== adminEmail) {
    return (
      <section className="p-6">
        <h1 className="text-xl font-bold text-red-500">Zugriff verweigert</h1>
      </section>
    );
  }

  // Pending Deposits laden (inkl. User-Email)
  const { data: deposits } = await supabase
    .from("transactions")
    .select(`
      id, user_id, type, amount, currency, wallet_address, status, created_at,
      profiles: user_id ( email, nickname )
    `)
    .eq("type", "deposit")
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  return (
    <section className="mx-auto max-w-6xl px-4 py-16">
      <h1 className="text-3xl font-bold mb-6">Einzahlungen bestätigen</h1>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-sm">
          <thead className="bg-white/5">
            <tr>
              <th className="px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2">User (E-Mail)</th>
              <th className="px-4 py-2">Betrag</th>
              <th className="px-4 py-2">Währung</th>
              <th className="px-4 py-2">Adresse</th>
              <th className="px-4 py-2">Datum</th>
              <th className="px-4 py-2">Aktion</th>
            </tr>
          </thead>
          <tbody>
            {deposits?.map((t: any) => (
              <tr key={t.id} className="border-t border-white/10">
                <td className="px-4 py-2">{t.id}</td>
                <td className="px-4 py-2">{t.profiles?.email || t.user_id}</td>
                <td className="px-4 py-2">{Number(t.amount).toFixed(2)}</td>
                <td className="px-4 py-2">{t.currency}</td>
                <td className="px-4 py-2 truncate max-w-[180px]">{t.wallet_address}</td>
                <td className="px-4 py-2">{new Date(t.created_at).toLocaleString()}</td>
                <td className="px-4 py-2">
                  <ApproveButtons id={t.id} />
                </td>
              </tr>
            ))}
            {(!deposits || deposits.length === 0) && (
              <tr>
                <td className="px-4 py-6 text-center text-white/70" colSpan={7}>
                  Keine offenen Einzahlungen.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
