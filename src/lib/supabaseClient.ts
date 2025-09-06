// src/lib/supabaseClient.ts
"use client";

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

// Hilfreiches Log, falls ENV fehlt (nur im Dev)
if (!url || !anon) {
  // eslint-disable-next-line no-console
  console.error("Supabase ENV fehlt:", { url, hasAnon: !!anon });
}

export const supabase = createClient(url!, anon!, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
