// app/legal/impressum/page.tsx

export default function ImpressumPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-semibold">Impressum</h1>
      <p className="mt-2 text-white/70 text-sm">Stand: 30.08.2025</p>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Anbieter</h2>
        <p className="text-white/80">
          Fortune-1411<br />
          Basel, Schweiz
        </p>
        <p className="text-white/80">
          E-Mail: <a href="mailto:support@fortune1411.com" className="underline">support@fortune1411.com</a>
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Vertretungsberechtigte</h2>
        <p className="text-white/80">
          {/* Trage hier die verantwortliche Person / Geschäftsführung ein */}
          Verantwortlich i.S.d. § 18 Abs. 2 MStV (DE) / Art. 322 StGB (CH):<br />
          &lt;Name der verantwortlichen Person&gt;
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Register & Aufsicht</h2>
        <p className="text-white/80">
          {/* Optional: nur falls vorhanden */}
          Handelsregister / Registernummer: &lt;falls vorhanden eintragen&gt;<br />
          Umsatzsteuer-ID / MWST-Nr.: &lt;falls vorhanden eintragen&gt;<br />
          Zuständige Aufsichtsbehörde (falls erlaubnispflichtig): &lt;falls zutreffend eintragen&gt;
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Haftung für Inhalte</h2>
        <p className="text-white/80">
          Die Inhalte dieser Website wurden mit größter Sorgfalt erstellt. Für die Richtigkeit, Vollständigkeit und
          Aktualität der Inhalte können wir jedoch keine Gewähr übernehmen. Nach den gesetzlichen Bestimmungen sind wir
          für eigene Inhalte auf diesen Seiten verantwortlich. In diesem Zusammenhang weisen wir darauf hin, dass wir
          nicht verpflichtet sind, übermittelte oder gespeicherte fremde Informationen zu überwachen oder Umstände zu
          erforschen, die auf eine rechtswidrige Tätigkeit hinweisen.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Haftung für Links</h2>
        <p className="text-white/80">
          Für Inhalte externer Links übernehmen wir keine Haftung. Für den Inhalt der verlinkten Seiten sind ausschließlich
          deren Betreiber verantwortlich. Rechtswidrige Inhalte waren zum Zeitpunkt der Verlinkung nicht erkennbar.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Urheberrecht</h2>
        <p className="text-white/80">
          Die durch uns erstellten Inhalte und Werke auf diesen Seiten unterliegen dem Urheberrecht. Beiträge Dritter sind
          als solche gekennzeichnet. Vervielfältigung, Bearbeitung, Verbreitung und jede Art der Verwertung außerhalb der
          Grenzen des Urheberrechts bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Bild- und Markenhinweise</h2>
        <p className="text-white/80">
          Eigene Medien sowie ggf. Stock-Material. Marken und Logos Dritter sind Eigentum der jeweiligen Inhaber und
          dienen lediglich der Identifikation.
        </p>
      </section>

      <section className="mt-8 space-y-2">
        <h2 className="text-xl font-semibold">Streitbeilegung</h2>
        <p className="text-white/80">
          Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS) bereit:{' '}
          <a className="underline" href="https://ec.europa.eu/consumers/odr" target="_blank">https://ec.europa.eu/consumers/odr</a>.
          Wir sind nicht verpflichtet und nicht bereit, an Streitbeilegungsverfahren vor einer Verbraucherschlichtungsstelle
          teilzunehmen.
        </p>
      </section>
    </main>
  );
}
