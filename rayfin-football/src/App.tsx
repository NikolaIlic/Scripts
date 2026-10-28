import { useEffect, useMemo, useRef, useState } from 'react';

import { MomentumChart, PassNetwork, ShotMap, XgRaceChart, colourFor } from '@/components/Charts';
import { Predictions } from '@/components/Predictions';
import {
  LIVE_POLL_MS,
  useKeyMoments,
  useMomentum,
  usePassNetwork,
  useScoreline,
  useShotMap,
  useXgRace,
  type Moment,
  type Shot,
  type TeamLine,
} from '@/hooks/useMatch';
import type { AppEnv } from '@/services/auth';
import { signIn } from '@/services/auth';
import { connectPowerBi } from '@/services/daxGateway';
import { getRayfinClient } from '@/services/rayfinClient';
import { shortName, withDisplayNames } from '@/data/players';

/** The replayed fixture. Make this a route param once WatchedMatch is populated. */
const MATCH = {
  id: 69299,
  home: 'Barcelona',
  away: 'Real Madrid',
  competition: 'La Liga',
  date: '29 Nov 2010',
  venue: 'Camp Nou',
};

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
    <div className="flex min-h-screen items-center justify-center px-6">
      <div className="max-w-md text-center">
        <div className="eyebrow">Football match centre</div>
        <h1 className="display mt-2 text-[44px] font-extrabold uppercase leading-none">
          {MATCH.home} <span style={{ color: 'var(--faint)' }}>v</span> {MATCH.away}
        </h1>
        <p className="mt-3 text-[14px]" style={{ color: 'var(--muted)' }}>
          Live match events through Fabric Real-Time Intelligence. Sign in to follow the match and make your prediction.
        </p>
        <button type="button" onClick={handle} disabled={busy} className="btn mt-6">
          {busy ? 'Signing in' : 'Sign in with Fabric'}
        </button>
        {error ? <p className="mt-3 text-[12px]" style={{ color: 'var(--danger)' }}>{error}</p> : null}
      </div>
    </div>
  );
}

/** A score digit that replays its entry animation whenever the value changes. */
function ScoreDigit({ value }: { value: number }) {
  const [bump, setBump] = useState(false);
  const first = useRef(true);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    setBump(true);
    const t = window.setTimeout(() => setBump(false), 750);
    return () => window.clearTimeout(t);
  }, [value]);
  return <span className={`score-digit tnum${bump ? ' bump' : ''}`}>{value}</span>;
}

interface GoalFlash {
  key: number;
  team: string;
  scorer: string;
  minute: number;
}

/** Watches the goal totals and returns a flash whenever a team's total goes up after first load. */
function useGoalFlash(home?: TeamLine, away?: TeamLine, shots: Shot[] = []): GoalFlash | null {
  const prev = useRef<Record<string, number> | null>(null);
  const [flash, setFlash] = useState<GoalFlash | null>(null);
  useEffect(() => {
    if (!home || !away) return;
    const now = { [home.team]: home.goals, [away.team]: away.goals };
    const before = prev.current;
    prev.current = now;
    if (!before) return;
    const scored = [home, away].find((t) => (now[t.team] ?? 0) > (before[t.team] ?? 0));
    if (!scored) return;
    const goal = [...shots].reverse().find((s) => s.isGoal && s.team === scored.team);
    setFlash({ key: Date.now(), team: scored.team, scorer: goal?.player ?? scored.team, minute: goal?.minute ?? 0 });
    const t = window.setTimeout(() => setFlash(null), 2500);
    return () => window.clearTimeout(t);
  }, [home, away, shots]);
  return flash;
}

const OUTCOMES: Record<string, string> = {
  'off t': 'off target',
  wayward: 'wide',
  post: 'hits the post',
  saved: 'saved',
  blocked: 'blocked',
  'saved to post': 'saved onto the post',
};

/** Turn the KeyMoments headline into broadcast copy with common player names. */
function formatMoment(headline: string): { title: string; detail: string; isGoal: boolean } {
  const text = withDisplayNames(headline);
  let m = /^GOAL\s+(.+?)\s+\((.+)\)$/.exec(text);
  if (m) return { title: `Goal · ${m[1]}`, detail: m[2], isGoal: true };
  m = /^Shot (.+?)\s{2}(.+?)\s{2}xG ([\d.]+)$/.exec(text);
  if (m) return { title: `${m[2]} · shot ${OUTCOMES[m[1]] ?? m[1]}`, detail: `xG ${Number(m[3]).toFixed(2)}`, isGoal: false };
  m = /^(Yellow Card|Red Card|Second Yellow)\s+(.+)$/.exec(text);
  if (m) return { title: `${m[1].replace('Card', 'card')} · ${m[2]}`, detail: '', isGoal: false };
  m = /^Sub\s+(.+?) off, (.+?) on$/.exec(text);
  if (m) return { title: `Substitution · ${m[2]} on`, detail: `for ${m[1]}`, isGoal: false };
  m = /^Key pass\s+(.+?) to (.+)$/.exec(text);
  if (m) return { title: `Key pass · ${m[1]}`, detail: `to ${m[2]}`, isGoal: false };
  return { title: text, detail: '', isGoal: false };
}

/**
 * A broadcast clock that ticks every second between data batches.
 *
 * Events reach the Eventhouse in batches, so the latest event's minute jumps several minutes at a
 * time during a fast replay. Between batches the clock runs forward at the replay speed from an
 * anchor, and each new batch moves the anchor:
 *
 *   1. Preferred anchor: the latest event's match second and the time the producer SENT it. This
 *      shows where the match is now, not where the last batch was.
 *   2. Fallback anchor: the moment this browser RECEIVED a new match second. Used when the send
 *      time is missing or implausible (clock skew between machines, a timezone-less timestamp).
 *
 * It never runs backwards, stops at half time and full time, and stops ticking when no new batch
 * has arrived for a while (replay stopped, or a backfill of an old match).
 */
const TICK_MS = 250;
/** Keep counting this long after the last new batch, then hold. */
const MAX_RUN_MS = 90_000;

interface ClockAnchor {
  matchSeconds: number;
  receivedAt: number;
  /** Match seconds per wall second, measured from the last two anchors; 0 until known. */
  measuredSpeed: number;
}

function useMatchClock(line?: TeamLine): { label: string; seconds: number; state: 'live' | 'ht' | 'ft' | 'idle' } {
  const [now, setNow] = useState(() => Date.now());
  const shown = useRef(0);
  const anchor = useRef<ClockAnchor | null>(null);

  useEffect(() => {
    const t = window.setInterval(() => setNow(Date.now()), TICK_MS);
    return () => window.clearInterval(t);
  }, []);

  // Move the receive-time anchor whenever a batch brings a new match second.
  const latest = line?.clockSeconds ?? -1;
  useEffect(() => {
    if (latest < 0) {
      anchor.current = null;
      return;
    }
    const at = Date.now();
    const prev = anchor.current;
    if (prev && latest === prev.matchSeconds) return;
    const measured =
      prev && latest > prev.matchSeconds && at > prev.receivedAt
        ? (latest - prev.matchSeconds) / ((at - prev.receivedAt) / 1000)
        : prev?.measuredSpeed ?? 0;
    anchor.current = { matchSeconds: latest, receivedAt: at, measuredSpeed: measured };
  }, [latest]);

  if (!line) {
    shown.current = 0;
    return { label: '00:00', seconds: 0, state: 'idle' };
  }

  const speed = Math.min(
    Math.max(line.replaySpeed > 1.01 ? line.replaySpeed : anchor.current?.measuredSpeed || line.replaySpeed, 0.5),
    60,
  );
  const sinceSent = now - line.lastEventAt;
  const sinceReceived = anchor.current ? now - anchor.current.receivedAt : Infinity;
  const sendTimeUsable = line.lastEventAt > 0 && sinceSent >= -5_000 && sinceSent <= MAX_RUN_MS;

  let seconds = line.clockSeconds;
  let state: 'live' | 'ht' | 'ft' | 'idle' = 'idle';
  if (line.periodOver) {
    state = line.period >= 2 ? 'ft' : 'ht';
  } else if (sendTimeUsable) {
    seconds += (Math.max(sinceSent, 0) / 1000) * speed;
    state = 'live';
  } else if (sinceReceived <= MAX_RUN_MS && (line.lastEventAt === 0 || Math.abs(sinceSent) > MAX_RUN_MS * 4)) {
    // Send time missing or way off (skew or timezone): count from when this batch arrived.
    seconds = (anchor.current?.matchSeconds ?? seconds) + (sinceReceived / 1000) * speed;
    state = 'live';
  }

  // Never run backwards when a batch lands behind the running clock;
  // do reset when the match itself restarts (tables cleared, a new replay).
  if (seconds < shown.current && shown.current - seconds < 600) seconds = shown.current;
  shown.current = seconds;

  const whole = Math.floor(seconds);
  const label = `${String(Math.floor(whole / 60)).padStart(2, '0')}:${String(whole % 60).padStart(2, '0')}`;
  return { label, seconds: whole, state };
}

function Scoreboard({ home, away, clock, live, flash }: { home?: TeamLine; away?: TeamLine; clock: ReturnType<typeof useMatchClock>; live: boolean; flash: GoalFlash | null }) {
  const teamBlock = (name: string, align: 'left' | 'right') => (
    <div className={`flex min-w-0 items-center gap-3 ${align === 'right' ? 'flex-row-reverse text-right' : ''}`}>
      <span className="h-12 w-2 shrink-0 rounded-sm" style={{ background: colourFor(name) }} />
      <span className="display truncate text-[clamp(22px,3.4vw,38px)] font-bold uppercase leading-none">{name}</span>
    </div>
  );
  return (
    <header className="relative overflow-hidden border-b" style={{ background: 'var(--surface)', borderColor: 'var(--line)' }}>
      <div className="mx-auto grid max-w-[1440px] grid-cols-[1fr_auto_1fr] items-center gap-4 px-4 py-4 sm:px-8">
        {teamBlock(MATCH.home, 'left')}
        <div className="display flex items-center gap-3 text-[clamp(48px,7vw,84px)] font-extrabold leading-none">
          <ScoreDigit value={home?.goals ?? 0} />
          <span className="text-[0.5em] font-semibold" style={{ color: 'var(--faint)' }}>-</span>
          <ScoreDigit value={away?.goals ?? 0} />
        </div>
        {teamBlock(MATCH.away, 'right')}
      </div>
      <div className="mx-auto flex max-w-[1440px] flex-wrap items-center justify-between gap-3 border-t px-4 py-2 sm:px-8" style={{ borderColor: 'var(--line)' }}>
        <span className="eyebrow">{MATCH.competition} · {MATCH.date} · {MATCH.venue}</span>
        <span className="flex items-center gap-3">
          {clock.state === 'live' && live ? (
            <>
              <span className="live-dot" aria-hidden="true" />
              <span className="display text-[15px] font-bold tracking-[0.12em]" style={{ color: 'var(--live)' }}>LIVE</span>
            </>
          ) : (
            <span className="display text-[15px] font-bold tracking-[0.12em]" style={{ color: 'var(--muted)' }}>
              {clock.state === 'ht' ? 'HALF TIME' : clock.state === 'ft' ? 'FULL TIME' : home ? 'NO NEW EVENTS' : 'WAITING FOR KICKOFF'}
            </span>
          )}
          <span className="display tnum min-w-[3.6em] text-right text-[28px] font-bold leading-none" aria-label={`Match clock ${clock.label}`}>
            {clock.label}
          </span>
        </span>
      </div>
      {flash ? (
        <div key={flash.key} className="goal-flash" style={{ background: colourFor(flash.team), color: flash.team === 'Real Madrid' ? '#0b0e13' : '#ffffff' }} role="status">
          <span className="display text-[clamp(40px,7vw,80px)] font-extrabold uppercase tracking-[0.08em]">Goal</span>
          <span className="display text-[clamp(20px,3vw,34px)] font-bold uppercase">
            {shortName(flash.scorer)} {flash.minute ? `${flash.minute}'` : ''}
          </span>
        </div>
      ) : null}
    </header>
  );
}

function StatBars({ home, away }: { home?: TeamLine; away?: TeamLine }) {
  const rows: Array<[string, number, number, (v: number) => string]> = [
    ['Shots', home?.shots ?? 0, away?.shots ?? 0, String],
    ['On target', home?.shotsOnTarget ?? 0, away?.shotsOnTarget ?? 0, String],
    ['xG', home?.xg ?? 0, away?.xg ?? 0, (v) => v.toFixed(2)],
    ['Passes', home?.passes ?? 0, away?.passes ?? 0, String],
    ['Pass accuracy', home?.passPct ?? 0, away?.passPct ?? 0, (v) => `${Math.round(v)}%`],
    ['Cards', (home?.yellow ?? 0) + (home?.red ?? 0), (away?.yellow ?? 0) + (away?.red ?? 0), String],
  ];
  return (
    <section className="mx-auto grid max-w-[1440px] grid-cols-2 gap-x-6 gap-y-4 px-4 py-5 sm:grid-cols-3 sm:px-8 lg:grid-cols-6" aria-label="Match statistics">
      {rows.map(([label, h, a, fmt]) => {
        const total = h + a || 1;
        return (
          <div key={label} className="flex min-w-0 flex-col gap-2">
            <div className="flex items-baseline justify-between gap-2">
              <span className="display tnum text-[24px] font-bold leading-none">{fmt(h)}</span>
              <span className="eyebrow truncate">{label}</span>
              <span className="display tnum text-[24px] font-bold leading-none">{fmt(a)}</span>
            </div>
            <div className="flex h-[5px] gap-[3px]">
              <div className="flex flex-1 justify-end overflow-hidden rounded-l-sm" style={{ background: 'var(--surface-2)' }}>
                <div style={{ width: `${(100 * h) / total}%`, background: colourFor(MATCH.home), transition: 'width 600ms ease' }} />
              </div>
              <div className="flex-1 overflow-hidden rounded-r-sm" style={{ background: 'var(--surface-2)' }}>
                <div className="h-full" style={{ width: `${(100 * a) / total}%`, background: colourFor(MATCH.away), transition: 'width 600ms ease' }} />
              </div>
            </div>
          </div>
        );
      })}
    </section>
  );
}

function Timeline({ moments }: { moments: Moment[] }) {
  if (moments.length === 0) {
    return <p className="mt-3 text-[13px]" style={{ color: 'var(--muted)' }}>No events yet. Start the replay and the key moments appear here.</p>;
  }
  return (
    <ol className="mt-3 max-h-[440px] overflow-auto pr-1" aria-label="Key moments, newest first">
      {moments.map((m, i) => {
        const f = formatMoment(m.headline);
        const isGoal = f.isGoal;
        const isCard = /card|yellow/i.test(m.headline);
        const dot = isCard ? 'var(--gold)' : colourFor(m.team);
        return (
          <li key={i} className="grid grid-cols-[40px_18px_1fr] items-stretch gap-3">
            <span className="display tnum pt-2 text-right text-[19px] font-bold" style={{ color: 'var(--muted)' }}>{m.minute}'</span>
            <span className="flex flex-col items-center">
              <span className="w-px flex-1" style={{ background: 'var(--line)' }} />
              <span
                className="shrink-0 rounded-full"
                style={{
                  width: isGoal ? 14 : 8,
                  height: isGoal ? 14 : 8,
                  background: dot,
                  border: isGoal ? '3px solid var(--gold)' : 'none',
                  boxSizing: 'border-box',
                }}
              />
              <span className="w-px flex-1" style={{ background: 'var(--line)' }} />
            </span>
            <span className="flex min-w-0 flex-col py-2">
              <span className={isGoal ? 'display text-[20px] font-bold uppercase leading-tight' : 'text-[13px] font-medium'}>{f.title}</span>
              {f.detail ? <span className="text-[12px]" style={{ color: 'var(--muted)' }}>{f.detail}</span> : null}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

function MatchCentre() {
  const matchId = MATCH.id;
  const { teams, error, needsSignIn, updatedAt } = useScoreline(matchId);
  const { points: xg } = useXgRace(matchId);
  const { points: momentum } = useMomentum(matchId);
  const { shots } = useShotMap(matchId);
  const { moments } = useKeyMoments(matchId);
  const [networkTeam, setNetworkTeam] = useState(MATCH.home);
  const { edges } = usePassNetwork(matchId, networkTeam);

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
  const clock = useMatchClock(home ?? away);
  const minute = Math.floor(clock.seconds / 60);
  const flash = useGoalFlash(home, away, shots);

  return (
    <div className="min-h-screen pb-10">
      <Scoreboard home={home} away={away} clock={clock} live={live} flash={flash} />
      <StatBars home={home} away={away} />

      <main className="mx-auto flex max-w-[1440px] flex-col gap-5 px-4 sm:px-8">
        {needsSignIn ? (
          <div className="panel flex flex-wrap items-center justify-between gap-3" style={{ borderColor: 'var(--gold)' }}>
            <span>Outside the Fabric portal the app needs a Power BI sign-in to read live data.</span>
            <button type="button" className="btn" onClick={() => void connectPowerBi()}>Sign in to Power BI</button>
          </div>
        ) : null}
        {error ? (
          <div className="panel" style={{ borderColor: 'var(--danger)', color: 'var(--danger)' }}>{error}</div>
        ) : null}

        <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          <div className="flex min-w-0 flex-col gap-5">
            <section className="panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="panel-title">Shot map</h2>
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>
                  {MATCH.home} attack right · {MATCH.away} attack left · size = xG · gold ring = goal
                </span>
              </div>
              <div className="mt-3">
                <ShotMap shots={shots} home={MATCH.home} />
              </div>
            </section>

            <section className="panel">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h2 className="panel-title">Pass network</h2>
                <div className="flex gap-2" role="group" aria-label="Team">
                  {[MATCH.home, MATCH.away].map((t) => (
                    <button key={t} type="button" className="pill" aria-pressed={networkTeam === t} onClick={() => setNetworkTeam(t)}>
                      <span className="h-2.5 w-2.5 rounded-full" style={{ background: colourFor(t) }} />
                      {t}
                    </button>
                  ))}
                </div>
              </div>
              <p className="mt-1 text-[12px]" style={{ color: 'var(--muted)' }}>
                Average positions, three or more completed passes per link · number = touches
              </p>
              <div className="mt-3">
                <PassNetwork edges={edges} team={networkTeam} isHome={networkTeam === MATCH.home} />
              </div>
            </section>
          </div>

          <div className="flex min-w-0 flex-col gap-5">
            <section className="panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="panel-title">xG race</h2>
                <span className="flex gap-4 text-[13px] font-semibold tnum">
                  <span style={{ color: colourFor(MATCH.home) }}>{MATCH.home} {(home?.xg ?? 0).toFixed(2)}</span>
                  <span style={{ color: colourFor(MATCH.away) }}>{MATCH.away} {(away?.xg ?? 0).toFixed(2)}</span>
                </span>
              </div>
              <div className="mt-2">
                <XgRaceChart points={xg} minute={minute} />
              </div>
            </section>

            <section className="panel">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h2 className="panel-title">Momentum</h2>
                <span className="text-[12px]" style={{ color: 'var(--muted)' }}>5-minute window · xG, final-third passes, box entries</span>
              </div>
              <div className="mt-2">
                <MomentumChart points={momentum} home={MATCH.home} away={MATCH.away} />
              </div>
            </section>

            <section className="panel">
              <h2 className="panel-title">Key moments</h2>
              <Timeline moments={moments} />
            </section>
          </div>
        </div>

        <Predictions
          matchId={matchId}
          home={MATCH.home}
          away={MATCH.away}
          currentUserId={currentUserId}
          live={live}
          homeGoals={home?.goals ?? 0}
          awayGoals={away?.goals ?? 0}
        />
      </main>
    </div>
  );
}

export default function App({ env, authenticated, onAuthenticated }: AppProps) {
  if (!authenticated) return <SignInScreen env={env} onAuthenticated={onAuthenticated} />;
  return <MatchCentre />;
}
