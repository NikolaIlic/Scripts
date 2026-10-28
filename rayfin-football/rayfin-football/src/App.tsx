import { useMemo, useState } from 'react';

import { MomentumChart, ShotMap, XgRaceChart, colourFor } from '@/components/Charts';
import { Predictions } from '@/components/Predictions';
import {
  LIVE_POLL_MS,
  useKeyMoments,
  useMomentum,
  useScoreline,
  useShotMap,
  useXgRace,
} from '@/hooks/useMatch';
import type { AppEnv } from '@/services/auth';
import { signIn } from '@/services/auth';
import { connectPowerBi } from '@/services/daxGateway';
import { getRayfinClient } from '@/services/rayfinClient';

/** The replayed fixture. Make this a route param once WatchedMatch is populated. */
const MATCH = { id: 69299, home: 'Barcelona', away: 'Real Madrid', label: 'El Clásico, 29 Nov 2010' };

interface AppProps {
  env: AppEnv;
  authenticated: boolean;
  onAuthenticated: () => void;
}

function SignInScreen({ env, onAuthenticated }: { env: AppEnv; onAuthenticated: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const handle = async () => {
    setBusy(true);
    setError(null);
    try {
      await signIn(env);
      onAuthenticated();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="flex min-h-screen items-center justify-center p-8">
      <div className="max-w-md text-center">
        <h1 className="text-[20px] font-semibold">Football Match Centre</h1>
        <p className="mt-2 text-[13px] opacity-60">
          Live match events streamed through Fabric Real-Time Intelligence, predictions and
          scouting notes in Rayfin.
        </p>
        <button type="button" onClick={handle} disabled={busy} className="mt-6 rounded-md bg-blue-600 px-4 py-2 text-[13px] font-medium text-white disabled:opacity-40">
          {busy ? 'Signing in...' : 'Sign in with Fabric'}
        </button>
        {error ? <p className="mt-3 text-[12px] text-red-400">{error}</p> : null}
      </div>
    </div>
  );
}

function MatchCentre() {
  const matchId = MATCH.id;
  const { teams, error, needsSignIn, updatedAt } = useScoreline(matchId);
  const { points: xg } = useXgRace(matchId);
  const { points: momentum } = useMomentum(matchId);
  const { shots } = useShotMap(matchId);
  const { moments } = useKeyMoments(matchId);

  const currentUserId = useMemo(() => {
    try {
      return getRayfinClient().auth.getSession().user?.id ?? null;
    } catch {
      return null;
    }
  }, []);

  const home = teams.find((t) => t.team === MATCH.home);
  const away = teams.find((t) => t.team === MATCH.away);
  const live = updatedAt !== null && Date.now() - updatedAt < LIVE_POLL_MS * 5 && teams.length > 0;
  const clock = home?.clock || away?.clock || '';

  return (
    <div className="mx-auto max-w-5xl p-4 text-[13px]">
      <header className="mb-4 flex items-center justify-between">
        <div>
          <div className="text-[11px] tracking-wider opacity-50">{MATCH.label}</div>
          <div className="mt-1 flex items-baseline gap-3 text-[26px] font-semibold tabular-nums">
            <span style={{ color: colourFor(MATCH.home) }}>{MATCH.home}</span>
            <span>{home?.goals ?? 0}</span>
            <span className="opacity-40">-</span>
            <span>{away?.goals ?? 0}</span>
            <span style={{ color: colourFor(MATCH.away) }}>{MATCH.away}</span>
          </div>
        </div>
        <div className="text-right">
          <div className={`text-[11px] ${live ? 'text-emerald-400' : 'opacity-40'}`}>{live ? '● LIVE' : '○ waiting for events'}</div>
          <div className="text-[22px] font-semibold tabular-nums">{clock}</div>
        </div>
      </header>

      {needsSignIn ? (
        <div className="mb-4 rounded-md border border-amber-400/30 bg-amber-400/10 p-3">
          Running outside the Fabric portal - sign in to Power BI to load live data.{' '}
          <button type="button" className="underline" onClick={() => void connectPowerBi()}>
            Sign in
          </button>
        </div>
      ) : null}
      {error ? <div className="mb-4 rounded-md border border-red-400/30 bg-red-400/10 p-3 text-red-300">{error}</div> : null}

      <div className="grid grid-cols-2 gap-x-6 gap-y-1 rounded-lg border border-white/10 p-3 sm:grid-cols-4">
        {[
          ['Shots', home?.shots, away?.shots],
          ['On target', home?.shotsOnTarget, away?.shotsOnTarget],
          ['xG', home?.xg.toFixed(2), away?.xg.toFixed(2)],
          ['Passes', home?.passes, away?.passes],
          ['Pass %', home?.passPct, away?.passPct],
          ['Yellow', home?.yellow, away?.yellow],
          ['Red', home?.red, away?.red],
        ].map(([label, h, a]) => (
          <div key={String(label)} className="flex justify-between tabular-nums">
            <span>{h ?? 0}</span>
            <span className="text-[11px] opacity-50">{label}</span>
            <span>{a ?? 0}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <section className="rounded-lg border border-white/10 p-3">
          <h2 className="text-[11px] tracking-wider opacity-60">xG RACE</h2>
          <XgRaceChart points={xg} />
        </section>
        <section className="rounded-lg border border-white/10 p-3">
          <h2 className="text-[11px] tracking-wider opacity-60">MOMENTUM (5 min window)</h2>
          <MomentumChart points={momentum} home={MATCH.home} away={MATCH.away} />
        </section>
        <section className="rounded-lg border border-white/10 p-3">
          <h2 className="text-[11px] tracking-wider opacity-60">SHOT MAP</h2>
          <ShotMap shots={shots} />
        </section>
        <section className="rounded-lg border border-white/10 p-3">
          <h2 className="text-[11px] tracking-wider opacity-60">KEY MOMENTS</h2>
          <ul className="mt-2 max-h-[400px] space-y-1 overflow-auto text-[12px]">
            {moments.map((m, i) => (
              <li key={i} className="flex gap-2">
                <span className="w-9 shrink-0 tabular-nums opacity-50">{m.minute}'</span>
                <span className="w-2 shrink-0 rounded" style={{ background: colourFor(m.team) }} />
                <span className={m.headline.startsWith('GOAL') ? 'font-semibold' : ''}>{m.headline}</span>
              </li>
            ))}
            {moments.length === 0 ? <li className="opacity-40">No events yet - start the replay.</li> : null}
          </ul>
        </section>
      </div>

      <div className="mt-4">
        <Predictions matchId={matchId} home={MATCH.home} away={MATCH.away} currentUserId={currentUserId} live={live} />
      </div>
    </div>
  );
}

export default function App({ env, authenticated, onAuthenticated }: AppProps) {
  if (!authenticated) return <SignInScreen env={env} onAuthenticated={onAuthenticated} />;
  return <MatchCentre />;
}
