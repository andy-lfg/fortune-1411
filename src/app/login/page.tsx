"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setLoading(false);

    if (error) {
      setErr(error.message);
      return;
    }

    if (email.toLowerCase() === "admin@fortune1411.com") {
      router.push("/admin");
    } else {
      router.push("/dashboard");
    }
  };

  return (
    <section className="mx-auto max-w-md px-4 py-16">
      <h1 className="text-3xl font-bold">Login</h1>
      <p className="text-white/70 mt-2">Willkommen zurück bei Fortune 1411.</p>

      <form onSubmit={onSubmit} className="mt-8 space-y-4">
        {err && <div className="rounded-lg border border-red-500/40 bg-red-500/10 px-3 py-2 text-sm">{err}</div>}
        <input
          type="email"
          placeholder="E-Mail"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <input
          type="password"
          placeholder="Passwort"
          className="w-full rounded-xl border border-white/10 bg-white/5 px-4 py-3 outline-none"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          required
        />
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-purple-600 px-4 py-3 font-medium hover:bg-purple-500 disabled:opacity-60"
        >
          {loading ? "Wird eingeloggt…" : "Einloggen"}
        </button>

        <p className="text-sm text-white/60">
          Noch kein Konto?{" "}
          <Link href="/register" className="text-purple-300 hover:text-purple-200">
            Jetzt registrieren
          </Link>
        </p>
      </form>
    </section>
  );
}
