// src/app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import SupabaseAuthListener from "@/components/SupabaseAuthListener";

export const metadata: Metadata = {
  title: "Fortune 1411 — Invest Smarter",
  description: "Professionelle Investment-Plattform mit Krypto-Ein- & Auszahlungen.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="de" className="bg-slate-950 text-white">
      <body className="min-h-screen flex flex-col">
        <Navbar />
        {/* Session-Änderungen (Login/Logout) an API melden */}
        <SupabaseAuthListener />
        <main className="flex-1">{children}</main>
        <Footer />
      </body>
    </html>
  );
}
