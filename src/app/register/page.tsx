// src/app/register/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import toast, { Toaster } from "react-hot-toast";

/**
 * Empfohlener Fix für Next 15:
 * useSearchParams NUR in einer inneren Komponente nutzen,
 * die in <Suspense> gewrappt ist.
 */

function RegisterInner() {
  const router = useRouter();
  const sp = useSearchParams();               // <- sicher innerhalb Suspense
  const refFromUrl = sp.get("ref") || "";     // Referral-ID aus ?ref=

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [nickname, setNickname] = useState("");
  const [loading, setLoading] = useState(false);

  // Referral-ID früh speichern (robust bei Redirects)
  useEffect(() => {
    if (refFromUrl) {
      try {
        localStorage.setItem("pending_ref", refFromUrl);
      } catch {}
    }
  }, [refFromUrl]);

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
    if (newUser && refId === newUser.id) refId = null;

    // 3) Profil upserten (wenn Session sofort vorhanden)
    let upsertSucceeded = false;
    if (newUser) {
      const { data: sessData } = await supabase.auth.getSession();
      if (sessData?.session) {
        const { error: profErr } = await supabase.from("profiles").upsert({
          id: newUser.id,
          first_name: firstName,
          last_name: lastName,
          nickname,
          referred_by: refId,
        });
        if (!profErr) {
          upsertSucceeded = true;
          try {
            localStorage.removeItem("pending_ref");
            localStorage.removeItem("pending_profile");
          } catch {}
        }
      }
    }

    // 4) Fallback: später auf /account initialisieren
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

// Seite rendert eine Suspense-Grenze, in der die eigentliche Logik läuft.
export default function RegisterPage() {
  return (
    <Suspense fallback={<section className="mx-auto max-w-md px-4 py-16 text-white/60">lädt…</section>}>
      <RegisterInner />
    </Suspense>
  );
}

/**
 * Optionaler Ausweichweg (nicht nötig, wenn Suspense genutzt wird):
 * Falls du die Seite komplett aus dem Prerender nehmen willst,
 * entkommentiere die nächste Zeile.
 */
// export const dynamic = "force-dynamic";