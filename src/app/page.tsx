// src/app/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { motion } from "framer-motion";

/**
 * Ein Step beschreibt eine der großen Ziffern in der 1–4–1–1 Sequenz.
 * Nur die "4" hat die eingebettete kleine "1", deshalb ist embeddedOneDelay optional.
 */
type Step = {
  key: "one-left" | "four" | "one-mid" | "one-right";
  char: "1" | "4";
  xIndex: number;
  risePx: number;
  delay: number;
  color: "text-emerald-400" | "text-white";
  embeddedOneDelay?: number;
};

/**
 * ====== KONFIGURATION ======
 * Du kannst hier schnell die X-Positionen, die "Höhen" (risePx) und die Delays anpassen,
 * damit es 1:1 zu deinen Skizzen passt – ohne Code unten anfassen zu müssen.
 */
const DIGIT_LAYOUT = {
  // horizontales Spacing zwischen den Ziffern (in px)
  gap: 24,
  // Schriftgrößen-Scaling der großen Ziffern
  fontScale: 1, // 1 = so wie im Design, >1 größer, <1 kleiner

  // Reihenfolge & Stufen (wie gezeichnet): 1 → 4 (+1) → 1 → 1
  // xIndex bestimmt die Reihenfolge/Gruppierung von links nach rechts.
  // risePx ist die "Höhe" über der Grundlinie (je größer, desto höher/ansteigend).
  steps: [
    { key: "one-left",  char: "1", xIndex: 0, risePx:  0, delay: 0.10, color: "text-emerald-400" },
    { key: "four",      char: "4", xIndex: 1, risePx: 10, delay: 0.60, color: "text-white",        embeddedOneDelay: 0.95 },
    { key: "one-mid",   char: "1", xIndex: 2, risePx: 22, delay: 1.20, color: "text-emerald-400" },
    { key: "one-right", char: "1", xIndex: 3, risePx: 32, delay: 1.60, color: "text-emerald-400" },
  ] as Step[],

  // Chart-Linie startet nach den Ziffern
  lineDelay: 2.05,
  // Chart-Punkte (werden automatisch aus Steps berechnet, Skalierung unten)
};

type StepUnion = Step; // nur zur Lesbarkeit

// Kleine Helfer: aus Steps → Punkte für die Uptrend-Linie
function buildChartPoints(steps: StepUnion[], baseX: number, baseY: number, gap: number) {
  // Wir projizieren jeden Ziffern-Slot auf einen Punkt
  // x = baseX + xIndex * gap * 3.6 (damit die Linie breit genug wird)
  // y = baseY - risePx  (höherer risePx → kleineres y, da SVG von oben zählt)
  const scale = 3.6;
  return steps.map((s) => ({
    x: baseX + s.xIndex * gap * scale,
    y: baseY - s.risePx,
  }));
}

function pathFromPoints(pts: { x: number; y: number }[]) {
  if (!pts.length) return "";
  const [first, ...rest] = pts;
  return `M${first.x} ${first.y} ` + rest.map((p) => `L${p.x} ${p.y}`).join(" ");
}

export default function HomePage() {
  const [isAuthed, setIsAuthed] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    (async () => {
      const { data } = await supabase.auth.getUser();
      if (!alive) return;
      setIsAuthed(!!data?.user);
      setLoading(false);
    })();
    return () => {
      alive = false;
    };
  }, []);

  // Chart-Geometrie (du kannst baseY anpassen, falls die Linie höher/tiefer sitzen soll)
  const baseX = 8;
  const baseY = 96; // Grundlinie (SVG)
  const points = useMemo(
    () => buildChartPoints(DIGIT_LAYOUT.steps, baseX, baseY, DIGIT_LAYOUT.gap),
    []
  );
  const chartPath = useMemo(() => pathFromPoints(points), [points]);

  return (
    <div className="relative">
      {/* Hintergrund-Deko */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-24 -right-24 h-[480px] w-[480px] rounded-full bg-purple-600/20 blur-[100px]" />
        <div className="absolute -bottom-24 -left-24 h-[420px] w-[420px] rounded-full bg-indigo-600/20 blur-[100px]" />
      </div>

      {/* HERO */}
      <section className="mx-auto max-w-6xl px-4 pt-16 pb-12">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10 items-center">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-xs text-white/80 ring-1 ring-white/15 mb-4">
              <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
              Dezentral • Transparent • Nutzerzentriert
            </span>

            <h1 className="text-4xl md:text-5xl font-extrabold leading-tight">
              Fortune <span className="text-green-400">1411</span> – Dein Weg nach oben.
            </h1>

            {/* 1411 – exakt in deiner Reihenfolge */}
            <div className="mt-6">
              <div className="relative h-[140px] md:h-[160px]">
                <div
                  className="absolute bottom-0 left-0 flex items-end leading-none"
                  style={{ gap: DIGIT_LAYOUT.gap }}
                >
                  {DIGIT_LAYOUT.steps.map((s) => (
                    <Digit
                      key={s.key}
                      char={s.char}
                      delay={s.delay}
                      risePx={s.risePx}
                      className={`${s.color}`}
                      scale={DIGIT_LAYOUT.fontScale}
                      showEmbeddedOne={s.char === "4"}
                      embeddedDelay={s.embeddedOneDelay}
                    />
                  ))}
                </div>

                {/* Uptrend-Linie: automatisch an die Stufen angepasst */}
                <motion.svg
                  viewBox="0 0 420 120"
                  className="absolute bottom-[-6px] left-[-2px] w-[320px] md:w-[420px] h-[110px]"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: DIGIT_LAYOUT.lineDelay, duration: 0.3 }}
                >
                  <motion.path
                    d={chartPath}
                    stroke="rgb(34 197 94)"
                    strokeWidth="6"
                    strokeLinecap="round"
                    fill="transparent"
                    initial={{ pathLength: 0 }}
                    animate={{ pathLength: 1 }}
                    transition={{ duration: 1.5, ease: "easeInOut", delay: DIGIT_LAYOUT.lineDelay }}
                  />
                  {points.map((p, i) => (
                    <ChartDot key={i} x={p.x} y={p.y} delay={DIGIT_LAYOUT.lineDelay + 0.12 * i} />
                  ))}
                </motion.svg>
              </div>

              <p className="mt-4 text-white/80 text-lg">
                Die Sequenz folgt deiner Skizze:{" "}
                <span className="text-green-400 font-semibold">1 → 4 (+1) → 1 → 1</span> – als klarer Uptrend.
              </p>
            </div>

            {/* CTA-Buttons */}
            <div className="mt-8 flex flex-wrap gap-3">
              {loading ? (
                <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-white/70">lädt…</div>
              ) : isAuthed ? (
                <>
                  <Link
                    href="/dashboard"
                    className="rounded-xl bg-purple-600 px-5 py-3 font-medium hover:bg-purple-500"
                  >
                    Weiter zum Dashboard
                  </Link>
                  <Link
                    href="/referrals"
                    className="rounded-xl bg-white/10 px-5 py-3 font-medium ring-1 ring-white/10 hover:bg-white/20"
                  >
                    Mein Einladungslink
                  </Link>
                </>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-xl bg-purple-600 px-5 py-3 font-medium hover:bg-purple-500"
                  >
                    Jetzt starten
                  </Link>
                  <Link
                    href="#learn-more"
                    className="rounded-xl bg-white/10 px-5 py-3 font-medium ring-1 ring-white/10 hover:bg-white/20"
                  >
                    Mehr erfahren
                  </Link>
                </>
              )}
            </div>

            <div className="mt-6 flex items-center gap-6 text-sm text-white/60">
              <div className="flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-emerald-400" />
                Krypto-Ein-/Auszahlungen (BTC, ETH, USDT)
              </div>
              <div className="hidden md:flex items-center gap-2">
                <span className="inline-block h-2 w-2 rounded-full bg-indigo-400" />
                100-Tage-Zyklen
              </div>
            </div>
          </div>

          {/* rechte Infokachelgruppe */}
          <div className="relative">
            <div className="rounded-2xl border border-white/10 bg-white/5 p-6 shadow-2xl backdrop-blur">
              <div className="grid grid-cols-2 gap-4">
                <MiniStat title="Tägliche Rendite (Mo–Do)" value="variabel" hint="nach Invest-Staffel" />
                <MiniStat title="Referral-Boni" value="3 Ebenen" hint="10% / 5% / 2.5%" />
                <MiniStat title="Pool-Beteiligung" value="0,1%/Monat" hint="ab Einstieg – 25." />
                <MiniStat title="Meilensteine" value="Bronze → Elite" hint="Rangabhängige Extras" />
              </div>
              <div className="mt-6 h-px w-full bg-white/10" />
              <p className="mt-4 text-sm text-white/70">
                *Dezentral gedacht: Deine Wallet-Adressen bleiben bei dir. Auszahlungen erfolgen ausschließlich an
                von dir hinterlegte Adressen.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* VERTRAUEN / SICHERHEIT */}
      <section id="learn-more" className="mx-auto max-w-6xl px-4 py-12">
        <h2 className="text-2xl md:text-3xl font-bold mb-6">Sicherheit & Transparenz</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <InfoCard
            icon={
              <span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500/20">
                🔐
              </span>
            }
            title="Sicherheit an erster Stelle"
            text="Ein- & Auszahlungen laufen ausschließlich über BTC, ETH oder USDT. Du hinterlegst deine Auszahl-Adressen selbst in deinem Profil."
          />
          <InfoCard
            icon={<span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/20">🌍</span>}
            title="Dezentral & transparent"
            text="Offene Regeln, klare Abrechnung: Rendite-Tage, Referral-Raten, Pool-Ausschüttung und Zyklen sind jederzeit nachvollziehbar."
          />
          <InfoCard
            icon={<span className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-purple-500/20">📈</span>}
            title="Nachhaltiges Wachstum"
            text="Tägliche Renditen (Mo–Do), 3-stufige Referral-Boni, monatliche Pool-Beteiligung und Meilensteine – alles greift ineinander."
          />
        </div>
      </section>

      {/* WARUM WIR */}
      <section className="mx-auto max-w-6xl px-4 py-12">
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 md:p-10">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div>
              <h3 className="text-xl md:text-2xl font-semibold">Warum Fortune 1411?</h3>
              <p className="mt-3 text-white/70">
                Unsere Mission: Einfacher Zugang zu stabilen, planbaren Erträgen – mit echten Anreizen für
                Community-Wachstum. Deine Vorteile:
              </p>
              <ul className="mt-4 space-y-2 text-sm text-white/80">
                <li>• Invest-Staffel für faire Basisrendite</li>
                <li>• 3 Ebenen Referral-Boni – belohnen Netzwerkaufbau</li>
                <li>• Meilensteine (Bronze → Elite) geben dir Extras & höhere Renditen</li>
                <li>• Monatliche Pool-Ausschüttung (0,1% am 25.) auf globales Wachstum ab deinem Einstieg</li>
                <li>• 100-Tage-Zyklen für Struktur und Klarheit</li>
              </ul>
            </div>
            <div className="rounded-xl border border-white/10 bg-black/30 p-6">
              <h4 className="font-semibold">Rendite-Logik (Kurzfassung)</h4>
              <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
                <LogicPill label="Mo–Do" value="Ertrags-Tage" />
                <LogicPill label="Fr–So" value="Pause" />
                <LogicPill label="Staffel" value="höheres Invest → höhere Basisrate" />
                <LogicPill label="Meilenstein" value="+Rang-Bonus auf Basisrate" />
                <LogicPill label="Ref-Boni" value="10% / 5% / 2.5%" />
                <LogicPill label="Pool" value="0,1% mtl. ab Einstieg" />
              </div>

              <div className="mt-6 rounded-lg bg-white/5 p-4 text-sm text-white/70">
                Beispiel: Du investierst in der 0,30%-Staffel, erreichst „Silber“ (+0,04% Rang-Bonus) → deine tägliche
                Basisrendite an Ertrags-Tagen steigt entsprechend.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16">
        <div className="rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 p-8 md:p-12 text-white">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
            <div>
              <h3 className="text-2xl md:text-3xl font-bold">Bereit, dein Geld für dich arbeiten zu lassen?</h3>
              <p className="mt-2 text-white/90">
                Starte mit wenigen Klicks. Lege deine Wallet-Adressen fest, zahle ein und profitiere von Renditen, Boni
                und dem globalen Pool.
              </p>
            </div>
            <div className="flex md:justify-end gap-3">
              {isAuthed ? (
                <Link
                  href="/dashboard"
                  className="rounded-xl bg-black/20 px-5 py-3 font-medium hover:bg-black/30 ring-1 ring-white/20"
                >
                  Zum Dashboard
                </Link>
              ) : (
                <>
                  <Link
                    href="/register"
                    className="rounded-xl bg-black/20 px-5 py-3 font-medium hover:bg-black/30 ring-1 ring-white/20"
                  >
                    Konto erstellen
                  </Link>
                  <Link
                    href="/login"
                    className="rounded-xl bg-white/10 px-5 py-3 font-medium hover:bg-white/20 ring-1 ring-white/20"
                  >
                    Einloggen
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

/* ====== Animations-Bausteine ====== */

function Digit({
  char,
  delay,
  className = "",
  risePx = 0,
  scale = 1,
  showEmbeddedOne = false,
  embeddedDelay,
}: {
  char: string;
  delay: number;
  className?: string;
  risePx?: number;
  scale?: number;
  showEmbeddedOne?: boolean;
  embeddedDelay?: number;
}) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 30, scale: 0.98 }}
      animate={{ opacity: 1, y: -risePx, scale: scale }}
      transition={{ delay, duration: 0.6, type: "spring", stiffness: 180, damping: 18 }}
      className={`relative inline-block text-6xl md:text-8xl font-extrabold leading-none ${className}`}
      style={{ lineHeight: 0.9 }}
    >
      {char}
      {showEmbeddedOne && (
        <motion.span
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: embeddedDelay ?? delay + 0.3, duration: 0.45, ease: "easeOut" }}
          className="absolute left-1/2 -translate-x-1/2 top-[22%] text-emerald-400"
          style={{ fontSize: "0.55em" }}
          aria-label="eingebettete 1"
        >
          1
        </motion.span>
      )}
    </motion.span>
  );
}

function ChartDot({ x, y, delay = 0 }: { x: number; y: number; delay?: number }) {
  return (
    <motion.circle
      cx={x}
      cy={y}
      r="5.5"
      fill="rgb(34 197 94)"
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ delay, duration: 0.22, ease: "easeOut" }}
    />
  );
}

/* ====== kleine UI-Bausteine ====== */

function MiniStat({ title, value, hint }: { title: string; value: string; hint?: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 p-4">
      <p className="text-xs text-white/60">{title}</p>
      <p className="mt-1 text-xl font-bold">{value}</p>
      {hint && <p className="text-xs text-white/50 mt-1">{hint}</p>}
    </div>
  );
}

function InfoCard({ icon, title, text }: { icon: React.ReactNode; title: string; text: string }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-6">
      <div className="flex items-start gap-4">
        {icon}
        <div>
          <h4 className="text-lg font-semibold">{title}</h4>
          <p className="mt-2 text-white/70 text-sm">{text}</p>
        </div>
      </div>
    </div>
  );
}

function LogicPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg border border-white/10 bg-white/5 px-3 py-2">
      <p className="text-xs text-white/60">{label}</p>
      <p className="text-sm font-medium">{value}</p>
    </div>
  );
}