// app/about/page.tsx
'use client';

import Link from 'next/link';
import Image from 'next/image';

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? '';
const useLocalHero = (process.env.NEXT_PUBLIC_USE_LOCAL_HERO ?? '0') === '1';
const heroUrl = useLocalHero ? `${basePath}/hero-about.jpg` : null;

export default function AboutPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-14">
      {/* Hero mit optionalem Bild-Hintergrund */}
      <section
        className="mb-10 rounded-2xl border border-white/10 overflow-hidden"
        style={{
          backgroundImage:
            `linear-gradient(to top, rgba(0,0,0,.7), rgba(0,0,0,.3), rgba(0,0,0,0)),
             radial-gradient(1200px 600px at 0% 100%, rgba(16,185,129,.18), rgba(0,0,0,0)),
             linear-gradient(180deg, rgba(30,41,59,1) 0%, rgba(15,23,42,1) 100%)`,
        }}
      >
        <div
          className="relative h-56 md:h-80 w-full"
          style={{
            backgroundImage: heroUrl ? `url('${heroUrl}')` : undefined,
            backgroundSize: heroUrl ? 'cover' : undefined,
            backgroundPosition: heroUrl ? 'center' : undefined,
            backgroundRepeat: heroUrl ? 'no-repeat' : undefined,
            opacity: heroUrl ? 0.7 : 1,
          }}
        />
        <div className="p-6 md:p-10">
          <p className="text-xs uppercase tracking-wider text-white/60">Über uns</p>

          {/* Headline mit Logo links */}
          <div className="mt-2 flex items-center gap-3">
            <Image
              src="/fortune-logo.png"   // Datei muss in /public/fortune-logo.png liegen
              alt="Fortune-1411 Logo"
              width={40}
              height={40}
              priority
              className="rounded-lg border border-white/10 bg-black/40"
            />
            <h1 className="text-3xl md:text-4xl font-semibold">
              Fortune-1411 – Vertrauen, Stärke und Zukunft in einem Investment.
            </h1>
          </div>

          <p className="mt-4 max-w-3xl text-white/70">
            Wir wurden aus einer klaren Vision heraus gegründet: Wohlstand für unsere Partner zu schaffen –
            gestützt auf Transparenz, Sicherheit und innovative Strategien. Unser Ziel ist es, nachhaltige
            Renditen zu generieren – mit einem starken Fundament und einem klaren Vorteil für unsere Investoren.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
            >
              Zur Startseite
            </Link>
            <Link
              href="/account"
              className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
            >
              Zum Konto →
            </Link>
          </div>
        </div>
      </section>

      {/* Trust / Fakten */}
      <section className="mb-12 grid grid-cols-1 gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/60 text-sm">Sicherheitsfonds</p>
          <p className="mt-1 text-2xl font-semibold">$20 Mio+</p>
          <p className="mt-2 text-sm text-white/70">
            Eigene Saving Funds dienen als Stabilitätsanker und schützen gegen Marktschwankungen.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/60 text-sm">Institutionelle Partner</p>
          <p className="mt-1 text-2xl font-semibold">Top-Investoren</p>
          <p className="mt-2 text-sm text-white/70">
            Große internationale Investoren begleiten unsere Strategie und sichern unsere Expansion.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <p className="text-white/60 text-sm">Informationsvorsprung</p>
          <p className="mt-1 text-2xl font-semibold">Exklusive Research-Deals</p>
          <p className="mt-2 text-sm text-white/70">
            Zusammenarbeit mit führenden Investmentfirmen – inklusive gezieltem Informationsankauf.
          </p>
        </div>
      </section>

      {/* Herkunft & Struktur */}
      <section className="mb-12 grid grid-cols-1 gap-6 md:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="text-xl font-semibold">Herkunft & Idee</h2>
          <p className="mt-3 text-white/70">
            Die Idee von Fortune-1411 entstand in <span className="text-white/90 font-medium">Basel</span>, wo sich
            fünf Geschäftspartner zusammenschlossen, um eine dezentrale Investmentlösung zu entwickeln. Ziel: ein
            System, das Sicherheit, Fairness und Performance verbindet – ohne unnötige Abhängigkeiten.
          </p>
          <p className="mt-3 text-white/70">
            Um eine <span className="text-white/90 font-medium">100%ige Dezentralisierung</span> und steuerliche
            Effizienz zu garantieren, wurde die Lizenzierung in <span className="text-white/90 font-medium">Venezuela</span> umgesetzt.
          </p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
          <h2 className="text-xl font-semibold">Sicherheit & Fairness</h2>
          <p className="mt-3 text-white/70">
            Unser Modell ist einfach: <em>&quot;Denn wenn wir weniger Steuern bezahlen, können wir Ihnen mehr Gewinn
            ausschütten.&quot;</em> Dieser Vorteil fließt direkt in die Rendite unserer Partner – transparent und nachvollziehbar.
          </p>
          <ul className="mt-4 list-disc pl-5 text-white/70 space-y-2">
            <li>Klare Strukturen und nachvollziehbare Regeln.</li>
            <li>Solide Reserven für Stressphasen und schnelle Handlungsfähigkeit.</li>
            <li>Langfristige Ausrichtung – wir profitieren, wenn unsere Investoren profitieren.</li>
          </ul>
        </div>
      </section>

      {/* Warum wir / Value-Props */}
      <section className="mb-12 rounded-2xl border border-white/10 bg-white/5 p-6 md:p-8">
        <h2 className="text-xl font-semibold">Warum Fortune-1411?</h2>
        <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-white/60">Dezentral & robust</p>
            <p className="mt-1 text-white/80">
              Kein Single-Point-of-Failure – Zugang zu globalen Märkten und Informationen.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-white/60">Partnerorientiert</p>
            <p className="mt-1 text-white/80">
              Wir denken in Zyklen, nicht in Quartalen – Stabilität vor kurzfristiger Volatilität.
            </p>
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <p className="text-sm text-white/60">Informationsvorsprung</p>
            <p className="mt-1 text-white/80">
              Daten, Research und Netzwerke liefern uns Edge – wir investieren auch in Wissen.
            </p>
          </div>
        </div>
      </section>

      {/* Slogan / CTA */}
      <section className="rounded-2xl border border-white/10 bg-gradient-to-br from-emerald-600/20 via-white/5 to-white/5 p-8 md:p-10">
        <blockquote className="text-xl md:text-2xl font-semibold">
          &quot;The sky is the Limit&quot;
        </blockquote>
        <p className="mt-3 max-w-3xl text-white/70">
          Unser Versprechen: Verlässlichkeit, Transparenz und eine klare Vision – Wohlstand durch Gemeinschaft,
          Professionalität und intelligente Strategien.
        </p>

        <div className="mt-6 flex flex-wrap items-center gap-3">
          <Link
            href="/account"
            className="inline-flex items-center rounded-lg bg-emerald-600 px-4 py-2 text-sm font-medium hover:bg-emerald-500"
          >
            Konto öffnen →
          </Link>
          <Link
            href="/"
            className="inline-flex items-center rounded-lg border border-white/15 px-4 py-2 text-sm hover:bg-white/10"
          >
            Mehr erfahren
          </Link>
        </div>
      </section>
    </main>
  );
}
