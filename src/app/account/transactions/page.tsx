'use client';

import { useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabaseClient';

type Row = {
  id: string;
  user_id: string;
  occurred_at: string; // timestamptz
  kind: 'yield' | 'cashflow';
  subkind: string;     // 'invest' | 'referral' | 'pool' | 'deposit' | 'withdrawal'
  amount: number | string;
  currency: string | null; // wird ignoriert (wir zeigen immer USD)
  status: string | null;
  meta: any;
};

const PAGE_SIZE = 25;
const fmtUSD = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export default function TransactionsPage() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<Row[]>([]);
  const [error, setError] = useState<string | null>(null);

  // Filter-States (Art)
  const [fDeposit, setFDeposit] = useState(true);
  const [fWithdrawal, setFWithdrawal] = useState(true);
  const [fInvest, setFInvest] = useState(true);
  const [fReferral, setFReferral] = useState(true);
  const [fPool, setFPool] = useState(true);

  // Zeitraum
  const [fromDate, setFromDate] = useState<string>(''); // yyyy-mm-dd
  const [toDate, setToDate] = useState<string>('');     // yyyy-mm-dd

  // Nur Cashflow: Status
  const [status, setStatus] = useState<'ALL'|'pending'|'approved'|'rejected'>('ALL');

  // Pagination (client-seitig)
  const [page, setPage] = useState(1);

  // Alle an/aus
  const allOn  = fDeposit && fWithdrawal && fInvest && fReferral && fPool;
  const allOff = !(fDeposit || fWithdrawal || fInvest || fReferral || fPool);
  function toggleAll(next: boolean) {
    setFDeposit(next);
    setFWithdrawal(next);
    setFInvest(next);
    setFReferral(next);
    setFPool(next);
  }

  // Helper: ISO-Start/Ende des Tages
  function isoStartOfDay(d: string) {
    if (!d) return null;
    const dt = new Date(d + 'T00:00:00Z');
    return dt.toISOString();
  }
  function isoNextDay(d: string) {
    if (!d) return null;
    const dt = new Date(d + 'T00:00:00Z');
    dt.setUTCDate(dt.getUTCDate() + 1);
    return dt.toISOString(); // exklusives Ende
  }

  // Daten laden (Server-Filter: user, Art, Zeitraum)
  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      try {
        const { data: auth } = await supabase.auth.getUser();
        const user = auth?.user;
        if (!user) {
          setError('Bitte einloggen, um Transaktionen zu sehen.');
          setRows([]);
          setLoading(false);
          return;
        }

        if (allOff) {
          setRows([]);
          setLoading(false);
          return;
        }

        let q = supabase
          .from('unified_user_activity')
          .select('*')
          .eq('user_id', user.id);

        // Art-Filter via .or(...)
        const ors: string[] = [];
        if (fDeposit)    ors.push('and(kind.eq.cashflow,subkind.eq.deposit)');
        if (fWithdrawal) ors.push('and(kind.eq.cashflow,subkind.eq.withdrawal)');
        if (fInvest)     ors.push('and(kind.eq.yield,subkind.eq.invest)');
        if (fReferral)   ors.push('and(kind.eq.yield,subkind.eq.referral)');
        if (fPool)       ors.push('and(kind.eq.yield,subkind.eq.pool)');
        if (!allOn && ors.length > 0) {
          q = q.or(ors.join(','));
        }

        // Zeitraum
        const fromISO = isoStartOfDay(fromDate);
        const toISOExclusive = isoNextDay(toDate);
        if (fromISO) q = q.gte('occurred_at', fromISO);
        if (toISOExclusive) q = q.lt('occurred_at', toISOExclusive);

        const { data, error } = await q
          .order('occurred_at', { ascending: false })
          .limit(1000);

        if (error) throw error;
        setRows((data as Row[]) ?? []);
        setPage(1);
      } catch (e: any) {
        setError(e?.message ?? 'Unbekannter Fehler beim Laden.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [fDeposit, fWithdrawal, fInvest, fReferral, fPool, allOn, allOff, fromDate, toDate]);

  // Client-Format & Cashflow-Status-Filter
  const filtered = useMemo(() => {
    let list = rows;

    if (status !== 'ALL') {
      list = list.filter((r) => {
        if (r.kind !== 'cashflow') return true; // Gewinne nicht filtern
        return (r.status ?? '') === status;
      });
    }

    return list.map((r) => ({
      ...r,
      amount_num: Number(r.amount ?? 0),
      date_str: new Date(r.occurred_at).toLocaleString('de-DE', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit'
      })
    }));
  }, [rows, status]);

  // Pagination (client-seitig)
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(1, page), totalPages);
  const startIdx = (pageSafe - 1) * PAGE_SIZE;
  const pageRows = filtered.slice(startIdx, startIdx + PAGE_SIZE);

  // kleine UI-Komponente für Filter-Pills
  function FilterPill({
    active, onClick, children
  }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
    return (
      <button
        onClick={onClick}
        className={`rounded-lg border px-3 py-1 text-sm transition
          ${active ? 'border-emerald-400 text-emerald-300 bg-emerald-400/10' : 'border-white/15 text-white/70 hover:bg-white/10'}`}
      >
        {children}
      </button>
    );
  }

  return (
    <main className="mx-auto max-w-5xl px-4 py-10">
      {/* Header */}
      <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="text-2xl font-semibold">Transaktionen</h1>
        <div className="flex items-center gap-2">
          <button
            onClick={() => toggleAll(true)}
            className={`rounded-md border px-3 py-1 text-sm ${allOn ? 'border-white/20 text-white/60' : 'border-white/10 hover:bg-white/10'}`}
            title="Alle Filter aktivieren"
          >
            Alles an
          </button>
          <button
            onClick={() => toggleAll(false)}
            className={`rounded-md border px-3 py-1 text-sm ${allOff ? 'border-white/20 text-white/60' : 'border-white/10 hover:bg-white/10'}`}
            title="Alle Filter deaktivieren"
          >
            Alles aus
          </button>
          <Link href="/account" className="ml-2 text-sm text-white/70 hover:underline">
            ← Zurück zum Konto
          </Link>
        </div>
      </div>

      {/* Filter-Leisten */}
      <div className="mb-3 flex flex-wrap gap-2">
        <FilterPill active={fDeposit} onClick={() => setFDeposit(v => !v)}>Einzahlung</FilterPill>
        <FilterPill active={fWithdrawal} onClick={() => setFWithdrawal(v => !v)}>Auszahlung</FilterPill>
        <FilterPill active={fInvest} onClick={() => setFInvest(v => !v)}>Gewinn (Invest)</FilterPill>
        <FilterPill active={fReferral} onClick={() => setFReferral(v => !v)}>Gewinn (Referral)</FilterPill>
        <FilterPill active={fPool} onClick={() => setFPool(v => !v)}>Gewinn (Pool)</FilterPill>
      </div>

      {/* Zeitraum + Cashflow-Status */}
      <div className="mb-5 grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-4">
        <label className="text-sm">
          Von (inkl.)
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
        </label>
        <label className="text-sm">
          Bis (inkl.)
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          />
        </label>

        <label className="text-sm">
          Status (nur Cashflow)
          <select
            value={status}
            onChange={(e) => { setStatus(e.target.value as any); setPage(1); }}
            className="mt-1 w-full rounded-lg border border-white/15 bg-black/30 px-3 py-2 text-sm"
          >
            <option value="ALL">Alle</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </label>

        {/* Platzhalter für Layout-Gleichgewicht */}
        <div />
      </div>

      {/* Liste */}
      {loading ? (
        <div className="rounded-xl border border-white/10 p-6">Lade…</div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/30 bg-red-500/10 p-6 text-red-200">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <div className="rounded-xl border border-white/10 p-6 text-white/70">
          Keine Einträge gefunden.
        </div>
      ) : (
        <>
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-sm">
              <thead className="bg-white/5">
                <tr className="text-left">
                  <th className="px-4 py-3">Datum</th>
                  <th className="px-4 py-3">Typ</th>
                  <th className="px-4 py-3">Kategorie</th>
                  <th className="px-4 py-3 text-right">Betrag</th>
                  <th className="px-4 py-3">Währung</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">ID</th>
                </tr>
              </thead>
              <tbody>
                {pageRows.map((r) => (
                  <tr key={`${r.kind}-${r.id}`} className="border-t border-white/10">
                    <td className="px-4 py-3 whitespace-nowrap">{r.date_str}</td>
                    <td className="px-4 py-3">
                      <span className="rounded-md border border-white/10 px-2 py-0.5 text-xs">
                        {r.kind === 'cashflow' ? 'Cashflow' : 'Gewinn'}
                      </span>
                    </td>
                    <td className="px-4 py-3">{labelSubkind(r.subkind)}</td>
                    <td className="px-4 py-3 text-right tabular-nums">
                      {fmtUSD.format(Number(r.amount ?? 0))}
                    </td>
                    <td className="px-4 py-3">USD</td>
                    <td className="px-4 py-3">{r.status ?? '—'}</td>
                    <td className="px-4 py-3 text-white/50">{r.id}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="text-sm text-white/60">
              Zeige {startIdx + 1}–{Math.min(startIdx + PAGE_SIZE, total)} von {total}
            </div>
            <div className="flex items-center gap-2">
              <button
                className="rounded-md border border-white/10 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={pageSafe <= 1}
              >
                ← Zurück
              </button>
              <span className="text-sm text-white/70">
                Seite {pageSafe} / {totalPages}
              </span>
              <button
                className="rounded-md border border-white/10 px-3 py-1 text-sm hover:bg-white/10 disabled:opacity-40"
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                disabled={pageSafe >= totalPages}
              >
                Weiter →
              </button>
            </div>
          </div>
        </>
      )}

      <p className="mt-4 text-xs text-white/50">
        Hinweis: Beträge sind einheitlich in <strong>USD</strong>. Zeitraum-Filter sind serverseitig, Status nur auf Cashflow.
        CSV-Export kommt als Nächstes.
      </p>
    </main>
  );
}

function labelSubkind(sk: string) {
  switch (sk) {
    case 'deposit': return 'Einzahlung';
    case 'withdrawal': return 'Auszahlung';
    case 'invest': return 'Gewinn (Invest)';
    case 'referral': return 'Gewinn (Referral)';
    case 'pool': return 'Gewinn (Pool)';
    default: return sk;
  }
}
