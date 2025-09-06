"use client";

import { useEffect } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function SupabaseAuthListener() {
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      // Session-Änderung an Route posten → setzt Server-Cookies
      fetch("/api/auth/callback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ event, session }),
      }).catch(() => {});
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return null;
}
