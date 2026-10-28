import { useState } from 'react';

import { usePredictions } from '@/hooks/usePredictions';

interface Props {
  matchId: number;
  home: string;
  away: string;
  currentUserId: string | null;
  /** True once events are arriving; the form becomes read-only. */
  live: boolean;
  /** Current score, used to flag predictions that are still on track. */
  homeGoals: number;
  awayGoals: number;
}

export function Predictions({ matchId, home, away, currentUserId, live, homeGoals, awayGoals }: Props) {
  const { rows, loading, saving, error, submit } = usePredictions(matchId);
  const [h, setH] = useState(2);
  const [a, setA] = useState(1);
  const [scorer, setScorer] = useState('');

  const mine = rows.find((r) => r.user_id === currentUserId);
  // Still possible: the prediction has at least as many goals for each side as the score now.
  const onTrack = (r: { home_goals: number; away_goals: number }) =>
    live && r.home_goals >= homeGoals && r.away_goals >= awayGoals;

  return (
    <section className="panel" aria-labelledby="predictions-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="predictions-title" className="panel-title">Predictions</h2>
        <span className="eyebrow">{live ? 'Locked at kickoff' : 'Open until kickoff'} · {rows.length} entries</span>
      </div>

      {!live ? (
        <form
          className="mt-4 flex flex-wrap items-center gap-3"
          onSubmit={(e) => {
            e.preventDefault();
            void submit(h, a, scorer);
          }}
        >
          <label htmlFor="pred-home" className="display text-[18px] font-bold uppercase">{home}</label>
          <input id="pred-home" className="score-input tnum" type="number" min={0} max={9} value={h} onChange={(e) => setH(Number(e.target.value))} />
          <span className="display text-[22px]" style={{ color: 'var(--faint)' }}>-</span>
          <input id="pred-away" aria-label={`${away} goals`} className="score-input tnum" type="number" min={0} max={9} value={a} onChange={(e) => setA(Number(e.target.value))} />
          <span className="display text-[18px] font-bold uppercase">{away}</span>
          <input
            id="pred-scorer"
            aria-label="First goalscorer, optional"
            className="text-input min-w-[180px] flex-1"
            value={scorer}
            onChange={(e) => setScorer(e.target.value)}
            placeholder="First goalscorer (optional)"
          />
          <button type="submit" className="btn" disabled={saving}>
            {saving ? 'Saving' : mine ? 'Update' : 'Predict'}
          </button>
        </form>
      ) : null}

      {error ? <p className="mt-3 text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p> : null}

      <div className="mt-4 flex flex-wrap gap-2">
        {loading && rows.length === 0 ? <span className="eyebrow">Loading</span> : null}
        {!loading && rows.length === 0 ? (
          <span className="text-[13px]" style={{ color: 'var(--muted)' }}>No predictions yet. Be the first before kickoff.</span>
        ) : null}
        {rows.map((r) => {
          const track = onTrack(r);
          return (
            <span
              key={r.id}
              className="pill"
              style={track ? { borderColor: 'var(--live)' } : undefined}
            >
              <span style={{ fontWeight: r.user_id === currentUserId ? 700 : 500 }}>
                {r.author.split('@')[0]}
                {r.user_id === currentUserId ? ' (you)' : ''}
              </span>
              <span className="display tnum text-[17px] font-bold">
                {r.home_goals}-{r.away_goals}
              </span>
              {r.first_scorer ? <span style={{ color: 'var(--muted)' }}>{r.first_scorer}</span> : null}
              {track ? <span style={{ color: 'var(--live)' }}>on track</span> : null}
              {r.points != null ? <span style={{ color: 'var(--gold)' }}>{r.points} pts</span> : null}
            </span>
          );
        })}
      </div>
    </section>
  );
}
