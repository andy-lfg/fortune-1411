"use client";

import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useSearchParams } from "next/navigation";
import toast, { Toaster } from "react-hot-toast";

export default function RegisterPage() {
  const router = useRouter();
  const sp = useSearchParams();

  // Referral-ID aus ?ref= (wir erwarten user_id/UUID)
  const refFromUrl = sp.get("ref") || "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  // Merke die Referral-ID frühzeitig (robust bei Navigation / Confirm-Flows)
  useEffect(() => {
    if (refFromUrl) {
      try {
        localStorage.setItem("pending_ref", refFromUrl);
      } catch {}
    }
  }, [refFromUrl]);

  // UI-Hinweis, wen man angibt (nur hübsch)
  const referralPreview = useMemo(() => refFromUrl, [refFromUrl]);

  async function handleRegister() {
    setLoading(true);
    const t = toast.loading("Registriere…");

    // 1) Account anlegen
    const { data: signData, error: signErr } = await supabase.auth.signUp({
      email,
      password,
    });

    if (signErr) {
      toast.dismiss(t);
      setLoading(false);
      return toast.error(signErr.message);
    }

    const newUser = signData?.user || null;

    // 2) Referral ermitteln (URL > localStorage), Self-Ref verhindern
    let refId: string | null = null;
    try {
      refId = refFromUrl || localStorage.getItem("pending_ref") || null;
    } catch {
      refId = refFromUrl || null;
    }

    if (newUser && refId === newUser.id) {
      // Self-ref verhindern
      refId = null;
    }

    // 3) Versuchen, Profil direkt zu upserten – klappt nur, wenn Session existiert (RLS!)
    let upsertSucceeded = false;
    if (newUser) {
      // Prüfen, ob direkt nach signUp schon eine Session da ist
      const { data: sessData } = await supabase.auth.getSession();
      const hasSession = !!sessData?.session;

      if (hasSession) {
        const { error: profErr } = await supabase.from("profiles").upsert({
          id: newUser.id,
          first_name: firstName,
          last_name: lastName,
          nickname,
          referred_by: refId,
        });

        if (!profErr) {
          upsertSucceeded = true;
          // Aufräumen
          try {
            localStorage.removeItem("pending_ref");
            localStorage.removeItem("pending_profile");
          } catch {}
        }
      }
    }

    // 4) Fallback: keine Session → in localStorage vormerken, Account-Seite initialisiert später
    if (!upsertSucceeded) {
      try {
        localStorage.setItem(
          "pending_profile",
          JSON.stringify({
            first_name: firstName,
            last_name: lastName,
            nickname,
            referred_by: refId,
          })
        );
      } catch {}
    }

    toast.dismiss(t);
    toast.success("Registriert! Bitte E-Mail bestätigen.");
    setLoading(false);

    // Weiter zur Login-Seite (oder direkt /account, je nach Flow)
    setTimeout(() => router.push("/login"), 800);
  }

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <Toaster position="top-right" />
      <h1 className="text-3xl font-bold mb-6">Registrieren</h1>

      <div className="space-y-4">
        <input
          type="text"
          placeholder="Vorname"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
        />
        <input
          type="text"
          placeholder="Nachname"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
        />
        <input
          type="text"
          placeholder="Nickname"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
        />
        <input
          type="email"
          placeholder="E-Mail"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
        />
        <input
          type="password"
          placeholder="Passwort"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-xl border border-white/10 bg-black/30 px-4 py-3 text-sm"
        />

        <button
          onClick={handleRegister}
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 font-medium hover:bg-purple-500 disabled:opacity-50"
        >
          {loading ? "Bitte warten…" : "Registrieren"}
        </button>

        {referralPreview && (
          <p className="text-xs text-white/60">
            Dein Anmeldecode:{" "}
            <code className="text-white/80">{referralPreview}</code>
          </p>
        )}
      </div>
    </section>
  );
}
