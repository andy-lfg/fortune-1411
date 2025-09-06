// src/components/Footer.tsx
import Link from "next/link";

export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-slate-900/60">
      <div className="mx-auto max-w-6xl px-4 py-8 grid gap-6 md:grid-cols-3">
        <div>
          <h4 className="font-semibold">Fortune 1411</h4>
          <p className="text-sm text-white/70 mt-2">
            Diskrete & professionelle Investment-Lösungen. Krypto-Ein- & Auszahlungen (BTC, ETH, USDT).
          </p>
        </div>

        <div>
          <h4 className="font-semibold">Links</h4>
          <ul className="mt-2 space-y-2 text-sm">
            <li>
              <Link href="/login" className="text-white/70 hover:text-white">
                Login
              </Link>
            </li>
            <li>
              <Link href="/register" className="text-white/70 hover:text-white">
                Registrieren
              </Link>
            </li>
            <li>
              <Link href="/about" className="text-white/70 hover:text-white">
                Über uns
              </Link>
            </li>
            <li>
              <Link href="/legal/impressum" className="text-white/70 hover:text-white">
                Impressum
              </Link>
            </li>
            <li>
              <Link href="/legal/privacy" className="text-white/70 hover:text-white">
                Datenschutz
              </Link>
            </li>
          </ul>
        </div>

        <div>
          <h4 className="font-semibold">Kontakt</h4>
          <p className="text-sm text-white/70 mt-2">
            support@fortune1411.com
            <br />
            Basel, Schweiz
          </p>
        </div>
      </div>
      <div className="border-t border-white/10 py-4 text-center text-xs text-white/50">
        © {new Date().getFullYear()} Fortune 1411. Alle Rechte vorbehalten.
      </div>
    </footer>
  );
}
