// app/legal/privacy/page.tsx

export default function PrivacyPage() {
  return (
    <main className="mx-auto max-w-4xl px-4 py-14">
      <h1 className="text-3xl font-semibold">Datenschutzerklärung</h1>
      <p className="mt-2 text-white/70 text-sm">Stand: 30.08.2025</p>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">1. Verantwortlicher</h2>
        <p className="text-white/80">
          Fortune-1411, Basel, Schweiz<br />
          E-Mail: <a href="mailto:support@fortune1411.com" className="underline">support@fortune1411.com</a>
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">2. Verarbeitungszwecke</h2>
        <ul className="list-disc pl-6 text-white/80 space-y-1">
          <li>Bereitstellung der Website, Stabilität & Sicherheit (Server-Logs, DDoS-Schutz).</li>
          <li>Konto- & Vertragsverwaltung (Registrierung, Login, Authentifizierung, Support).</li>
          <li>Zahlungsabwicklung (Ein-/Auszahlungen in Krypto, Nachweise & Betrugsprävention).</li>
          <li>Leistungsbereitstellung (Investments, Rendite-Berechnungen, Auszahlungsprozesse).</li>
          <li>Kommunikation (Transaktions-Benachrichtigungen, Service-E-Mails).</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">3. Rechtsgrundlagen</h2>
        <p className="text-white/80">
          Verarbeitung erfolgt je nach Vorgang auf Basis von Vertragserfüllung (Art. 6 Abs. 1 lit. b DSGVO),
          berechtigtem Interesse (Art. 6 Abs. 1 lit. f DSGVO), rechtlicher Verpflichtung (Art. 6 Abs. 1 lit. c DSGVO)
          oder Einwilligung (Art. 6 Abs. 1 lit. a DSGVO).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">4. Kategorien personenbezogener Daten</h2>
        <ul className="list-disc pl-6 text-white/80 space-y-1">
          <li>Stammdaten (Name, E-Mail, Nickname; ggf. Referer/Nutzer-IDs).</li>
          <li>Nutzungsdaten (Logins, Zeitstempel, IP-Adresse, Geräte-/Browser-Infos, Cookies).</li>
          <li>Transaktionsdaten (Einzahlungen, Auszahlungen, Wallet-Adressen).</li>
          <li>Kommunikationsdaten (Support-Anfragen, System-Benachrichtigungen).</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">5. Empfänger & Auftragsverarbeiter</h2>
        <p className="text-white/80">
          Wir setzen sorgfältig ausgewählte Dienstleister ein (z. B. Hosting, Datenbanken, E-Mail-Versand).
          Mit diesen bestehen Auftragsverarbeitungsverträge gemäß Art. 28 DSGVO, soweit erforderlich.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">6. Drittlandtransfers</h2>
        <p className="text-white/80">
          Sofern Daten in Drittländer übermittelt werden, erfolgt dies auf Basis geeigneter Garantien
          (z. B. EU-Standardvertragsklauseln) oder gesetzlicher Ausnahmen. Details teilen wir auf Anfrage mit.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">7. Speicherdauer</h2>
        <p className="text-white/80">
          Wir verarbeiten personenbezogene Daten nur so lange, wie es für die jeweiligen Zwecke erforderlich ist.
          Gesetzliche Aufbewahrungspflichten (z. B. Handels-/Steuerrecht) bleiben unberührt.
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">8. Cookies & lokale Speicherung</h2>
        <p className="text-white/80">
          Wir verwenden technisch erforderliche Cookies bzw. Local-/Session-Storage für Login-/Session-Funktionen
          und Sicherheit. Optionale Cookies (z. B. Analytics/Marketing) werden – falls eingesetzt – nur mit
          Einwilligung gesetzt. Einstellungen können Sie jederzeit in der Website-Fußzeile über „Cookie-Einstellungen“
          anpassen (sofern aktiv).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">9. Analysen & Reichweitenmessung</h2>
        <p className="text-white/80">
          Falls wir Webanalyse nutzen (z. B. anonymisierte Reichweitenmessung), verarbeiten wir Daten nur in dem Rahmen,
          der für die Verbesserung unseres Angebots erforderlich ist – möglichst datensparsam und mit IP-Anonymisierung.
          Die Verarbeitung erfolgt auf Basis von Einwilligung oder berechtigtem Interesse; Details werden im Consent-Layer
          bereitgestellt (sofern aktiv).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">10. Ihre Rechte</h2>
        <ul className="list-disc pl-6 text-white/80 space-y-1">
          <li>Auskunft, Berichtigung, Löschung, Einschränkung der Verarbeitung.</li>
          <li>Widerspruch gegen Verarbeitungen aus berechtigtem Interesse.</li>
          <li>Datenübertragbarkeit, sofern anwendbar.</li>
          <li>Widerruf von Einwilligungen mit Wirkung für die Zukunft.</li>
          <li>Beschwerderecht bei einer zuständigen Datenschutz-Aufsichtsbehörde.</li>
        </ul>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">11. Sicherheit</h2>
        <p className="text-white/80">
          Wir treffen technische und organisatorische Maßnahmen, um Daten vor Verlust, Missbrauch und unbefugtem Zugriff
          zu schützen (z. B. Verschlüsselung, Zugriffskontrollen, Protokollierung).
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">12. Kontakt</h2>
        <p className="text-white/80">
          Bei Fragen oder zur Geltendmachung Ihrer Rechte wenden Sie sich an:{' '}
          <a href="mailto:support@fortune1411.com" className="underline">support@fortune1411.com</a>
        </p>
      </section>

      <section className="mt-8 space-y-3">
        <h2 className="text-xl font-semibold">13. Änderungen</h2>
        <p className="text-white/80">
          Wir passen diese Datenschutzerklärung an, wenn sich Rechtslage, unser Dienst oder die Datenverarbeitung ändern.
          Die jeweils aktuelle Fassung ist hier abrufbar.
        </p>
      </section>
    </main>
  );
}
