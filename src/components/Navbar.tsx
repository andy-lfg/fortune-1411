"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function Navbar() {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [email, setEmail] = useState<string | null>(null);
  const [nickname, setNickname] = useState<string>("");
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    let mounted = true;

    const loadUserAndProfile = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!mounted) return;

      setEmail(user?.email ?? null);

      if (user) {
        const { data: profile } = await supabase
          .from("profiles")
          .select("nickname")
          .eq("id", user.id)
          .single();

        setNickname(profile?.nickname ?? "");
      } else {
        setNickname("");
      }
    };

    loadUserAndProfile();

    const { data: authListener } = supabase.auth.onAuthStateChange(() => {
      loadUserAndProfile();
    });

    return () => {
      mounted = false;
      authListener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const isAdmin =
    (email || "").toLowerCase() ===
    (process.env.NEXT_PUBLIC_ADMIN_EMAIL || "").toLowerCase();

  const logout = async () => {
    await supabase.auth.signOut();
    setEmail(null);
    setNickname("");
    setOpen(false);
    router.push("/login");
  };

  // ---- NAV ITEMS ----
  const navItems: { href: string; label: string }[] = [
    { href: "/", label: "Home" },
    { href: "/about", label: "Über uns" }, // ✅ Neuer About-Button
  ];

  if (email) {
    navItems.push({ href: "/dashboard", label: "Dashboard" });
    navItems.push({ href: "/referrals", label: "Referrals" });
    if (isAdmin) navItems.push({ href: "/admin", label: "Admin" });
  } else {
    navItems.push({ href: "/login", label: "Login" });
    navItems.push({ href: "/register", label: "Registrieren" });
  }

  return (
    <header className="border-b border-white/10 bg-slate-900/60 backdrop-blur supports-[backdrop-filter]:bg-slate-900/40 sticky top-0 z-50">
      <div className="mx-auto max-w-6xl px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <Image
            src="/fortune-logo.png"
            alt="Fortune-1411 Logo"
            width={36}
            height={36}
            className="rounded-lg border border-white/10"
            priority
          />
          <span className="text-lg md:text-xl font-bold tracking-tight">
            Fortune <span className="text-purple-400">1411</span>
          </span>
        </Link>

        {/* Desktop */}
        <nav className="hidden md:flex items-center gap-6">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={`text-sm transition ${
                pathname === item.href
                  ? "text-white"
                  : "text-white/70 hover:text-white"
              }`}
            >
              {item.label}
            </Link>
          ))}

          {/* Avatar + Nickname Dropdown */}
          {email && (
            <div className="relative" ref={dropdownRef}>
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                className="flex items-center gap-2 px-3 py-1 rounded-lg border border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
              >
                <div className="h-8 w-8 rounded-full bg-gradient-to-br from-purple-500 to-indigo-600 flex items-center justify-center text-sm font-bold">
                  {nickname?.charAt(0).toUpperCase() || "?"}
                </div>
                <span>{nickname || "Mein Konto"}</span>
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-2 w-40 bg-slate-800 rounded-lg shadow-lg border border-white/10">
                  <Link
                    href="/account"
                    className="block px-4 py-2 text-sm text-white/90 hover:bg-slate-700"
                    onClick={() => setDropdownOpen(false)}
                  >
                    Mein Konto
                  </Link>
                  <button
                    onClick={logout}
                    className="w-full text-left px-4 py-2 text-sm text-red-400 hover:bg-slate-700"
                  >
                    Logout
                  </button>
                </div>
              )}
            </div>
          )}
        </nav>

        {/* Mobile Toggle */}
        <button
          className="md:hidden inline-flex h-10 w-10 items-center justify-center rounded-lg border border-white/10"
          onClick={() => setOpen((v) => !v)}
          aria-label="Toggle Menu"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-5 w-5"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
          >
            <path d="M3 6h18M3 12h18M3 18h18" strokeWidth="2" strokeLinecap="round" />
          </svg>
        </button>
      </div>

      {/* Mobile Menu */}
      {open && (
        <div className="md:hidden border-t border-white/10">
          <nav className="mx-auto max-w-6xl px-4 py-3 flex flex-col gap-3">
            {navItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={`text-sm ${
                  pathname === item.href ? "text-white" : "text-white/80"
                }`}
              >
                {item.label}
              </Link>
            ))}

            {email && (
              <>
                <Link
                  href="/account"
                  onClick={() => setOpen(false)}
                  className="text-sm px-3 py-2 rounded-lg border border-white/15 bg-white/5 text-white/90 hover:bg-white/10"
                >
                  Mein Konto
                </Link>
                <button
                  onClick={logout}
                  className="text-left text-sm rounded-lg border border-white/15 px-3 py-2 hover:bg-white/5 text-red-400"
                >
                  Logout
                </button>
              </>
            )}
          </nav>
        </div>
      )}
    </header>
  );
}
