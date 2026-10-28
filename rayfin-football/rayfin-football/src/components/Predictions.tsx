import { useState } from 'react';

import { usePredictions } from '@/hooks/usePredictions';

interface Props {
  matchId: number;
  home: string;
  away: string;
  currentUserId: string | null;
  /** True once the first event has landed; the form becomes read-only. */
  live: boolean;
}

export function Predictions({ matchId, home, away, currentUserId, live }: Props) {
  const { rows, loading, saving, error, submit } = usePredictions(matchId);
  const [h, setH] = useState(2);
  const [a, setA] = useState(1);
  const [scorer, setScorer] = useState('');

  const mine = rows.find((r) => r.user_id === currentUserId);

  return (
    <section className="rounded-lg border border-white/10 p-3">
      <h2 className="text-[11px] tracking-wider opacity-60">PREDICTIONS ({rows.length})</h2>

      {!live ? (
        <form
          className="mt-2 flex flex-wrap items-center gap-2 text-[13px]"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(h, a, scorer);
          }}
        >
          <span className="opacity-70">{home}</span>
          <input type="number" min={0} max={9} value={h} onChange={(e) => setH(Number(e.target.value))} className="w-12 rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-center" />
          <span className="opacity-40">-</span>
          <input type="number" min={0} max={9} value={a} onChange={(e) => setA(Number(e.target.value))} className="w-12 rounded border border-white/10 bg-white/[0.04] px-1 py-0.5 text-center" />
          <span className="opacity-70">{away}</span>
          <input value={scorer} onChange={(e) => setScorer(e.target.value)} placeholder="First scorer (optional)" className="min-w-[160px] flex-1 rounded border border-white/10 bg-white/[0.04] px-2 py-0.5 placeholder:opacity-40" />
          <button type="submit" disabled={saving} className="rounded bg-blue-600 px-3 py-1 text-white disabled:opacity-40">
            {mine ? 'Update' : 'Submit'}
          </button>
        </form>
      ) : (
        <p className="mt-2 text-[12px] opacity-60">Locked - match is live.</p>
      )}

      {error ? <p className="mt-2 text-[12px] text-red-400">{error}</p> : null}

      <ul className="mt-3 space-y-1 text-[12px]">
        {loading && rows.length === 0 ? <li className="opacity-50">Loading...</li> : null}
        {rows.map((r) => (
          <li key={r.id} className="flex justify-between">
            <span className={r.user_id === currentUserId ? 'font-semibold' : ''}>
              {r.author} {r.user_id === currentUserId ? '(you)' : ''}
            </span>
            <span className="tabular-nums">
              {r.home_goals}-{r.away_goals}
              {r.first_scorer ? <span className="opacity-60"> · {r.first_scorer}</span> : null}
              {r.points != null ? <span className="ml-2 text-emerald-400">{r.points} pts</span> : null}
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
