import type { ReactNode } from 'react';

import { displayName, shortName } from '@/data/players';
import type { MomentumPoint, PassEdge, Shot, XgPoint } from '@/hooks/useMatch';

/** Team colours keyed by team name; anything else gets a neutral blue. */
export const TEAM_COLOURS: Record<string, string> = {
  Barcelona: '#c8102e',
  'Real Madrid': '#e8ecf2',
};
export const colourFor = (team: string) => TEAM_COLOURS[team] ?? '#60a5fa';

const AXIS = '#8a96a8';
const GRID = '#222a36';
const GOLD = '#f5c542';

/**
 * Full pitch in StatsBomb coordinates: 120 x 80, x along the length. StatsBomb stores every
 * team's events as if it attacks left to right, so the home team is drawn as-is (attacking the
 * right goal) and the away team is mirrored (attacking the left goal). Both goals are visible.
 */
export function toPitch(x: number, y: number, isHome: boolean): [number, number] {
  return isHome ? [x, y] : [120 - x, 80 - y];
}

export function Pitch({ children, label }: { children?: ReactNode; label: string }) {
  const line = { stroke: 'var(--pitch-line)', strokeWidth: 0.35, fill: 'none' } as const;
  return (
    <svg viewBox="-4 -3 128 86" className="block w-full" role="img" aria-label={label}>
      <rect x={-4} y={-3} width={128} height={86} rx={1.5} fill="var(--pitch-dark)" />
      {/* mowing stripes */}
      {Array.from({ length: 12 }, (_, i) => (
        <rect key={i} x={i * 10} y={0} width={10} height={80} fill={i % 2 ? 'var(--pitch)' : 'var(--pitch-dark)'} />
      ))}
      <rect x={0} y={0} width={120} height={80} {...line} />
      <line x1={60} y1={0} x2={60} y2={80} {...line} />
      <circle cx={60} cy={40} r={10} {...line} />
      <circle cx={60} cy={40} r={0.5} fill="var(--pitch-line)" />
      {/* left end */}
      <rect x={0} y={18} width={18} height={44} {...line} />
      <rect x={0} y={30} width={6} height={20} {...line} />
      <circle cx={12} cy={40} r={0.5} fill="var(--pitch-line)" />
      <path d="M18 32 A10 10 0 0 1 18 48" {...line} />
      <rect x={-2} y={36} width={2} height={8} {...line} strokeWidth={0.5} />
      {/* right end */}
      <rect x={102} y={18} width={18} height={44} {...line} />
      <rect x={114} y={30} width={6} height={20} {...line} />
      <circle cx={108} cy={40} r={0.5} fill="var(--pitch-line)" />
      <path d="M102 32 A10 10 0 0 0 102 48" {...line} />
      <rect x={120} y={36} width={2} height={8} {...line} strokeWidth={0.5} />
      {children}
    </svg>
  );
}

/** Shots for both teams on the full pitch. Marker area follows xG; goals get a gold ring. */
export function ShotMap({ shots, home }: { shots: Shot[]; home: string }) {
  return (
    <Pitch label="Shot map, both teams, marker size is expected goals">
      {shots.map((s, i) => {
        const [x, y] = toPitch(s.x, s.y, s.team === home);
        const r = 0.9 + Math.sqrt(Math.max(s.xg, 0)) * 3.6;
        return (
          <g key={i}>
            <circle
              cx={x}
              cy={y}
              r={r}
              fill={colourFor(s.team)}
              fillOpacity={s.isGoal ? 0.95 : 0.5}
              stroke={s.isGoal ? GOLD : '#ffffff'}
              strokeWidth={s.isGoal ? 0.6 : 0.25}
            />
            <title>{`${s.minute}' ${displayName(s.player)} (${s.team}) - xG ${s.xg.toFixed(2)}, ${s.outcome}`}</title>
          </g>
        );
      })}
    </Pitch>
  );
}

/** Pass network for one team on the full pitch, in that team's attacking direction. */
export function PassNetwork({ edges, team, isHome }: { edges: PassEdge[]; team: string; isHome: boolean }) {
  const colour = colourFor(team);
  const max = Math.max(1, ...edges.map((e) => e.passes));
  const nodes = new Map<string, { x: number; y: number; touches: number }>();
  for (const e of edges) {
    if (!nodes.has(e.player)) {
      const [x, y] = toPitch(e.fromX, e.fromY, isHome);
      nodes.set(e.player, { x, y, touches: e.fromTouches });
    }
  }
  for (const e of edges) {
    if (!nodes.has(e.recipient)) {
      const [x, y] = toPitch(e.toX, e.toY, isHome);
      nodes.set(e.recipient, { x, y, touches: 0 });
    }
  }
  // White labels on the light away kit would vanish; use dark text there.
  const labelFill = colour.toLowerCase() === '#e8ecf2' ? '#0b0e13' : '#ffffff';

  return (
    <Pitch label={`Pass network, ${team}`}>
      {edges.map((e, i) => {
        const [x1, y1] = toPitch(e.fromX, e.fromY, isHome);
        const [x2, y2] = toPitch(e.toX, e.toY, isHome);
        return (
          <line
            key={i}
            x1={x1}
            y1={y1}
            x2={x2}
            y2={y2}
            stroke="#ffffff"
            strokeOpacity={0.2 + 0.6 * (e.passes / max)}
            strokeWidth={0.2 + 1.3 * (e.passes / max)}
            strokeLinecap="round"
          >
            <title>{`${displayName(e.player)} to ${displayName(e.recipient)}: ${e.passes} passes`}</title>
          </line>
        );
      })}
      {[...nodes.entries()].map(([name, n]) => {
        const r = 1.7 + Math.min(1.6, n.touches / 40);
        return (
          <g key={name}>
            <circle cx={n.x} cy={n.y} r={r} fill={colour} stroke="#ffffff" strokeWidth={0.35} />
            <text x={n.x} y={n.y + r + 2.6} textAnchor="middle" fontSize={2.4} fill="#ffffff" fontWeight={600} paintOrder="stroke" stroke="rgba(0,0,0,0.55)" strokeWidth={0.5}>
              {shortName(name)}
            </text>
            <text x={n.x} y={n.y + 0.7} textAnchor="middle" fontSize={1.8} fill={labelFill} fontWeight={700}>
              {n.touches || ''}
            </text>
          </g>
        );
      })}
    </Pitch>
  );
}

const W = 640;
const H = 220;
const PAD = { l: 34, r: 44, t: 14, b: 26 };

/** Cumulative xG per team as step lines with a soft area, goals as gold-ringed dots. */
export function XgRaceChart({ points, minute, maxMinute = 95 }: { points: XgPoint[]; minute: number; maxMinute?: number }) {
  const teams = [...new Set(points.map((p) => p.team))];
  const top = Math.max(1, ...points.map((p) => p.cumXg));
  const maxXg = Math.ceil(top * 2) / 2;
  const sx = (m: number) => PAD.l + (Math.min(m, maxMinute) / maxMinute) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - (v / maxXg) * (H - PAD.t - PAD.b);
  const ticks: number[] = [];
  for (let v = 0; v <= maxXg + 1e-9; v += maxXg > 2 ? 1 : 0.5) ticks.push(v);
  const now = Math.max(minute, ...points.map((p) => p.minute), 0);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label="Cumulative expected goals per team">
      {ticks.map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke={GRID} />
          <text x={PAD.l - 8} y={sy(v) + 4} fontSize={11} textAnchor="end" fill={AXIS}>
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {[0, 15, 30, 45, 60, 75, 90].map((m) => (
        <text key={m} x={sx(m)} y={H - 8} fontSize={11} textAnchor="middle" fill={AXIS}>
          {m}'
        </text>
      ))}
      <line x1={sx(45)} x2={sx(45)} y1={PAD.t} y2={H - PAD.b} stroke={GRID} strokeDasharray="3 4" />
      {teams.map((team) => {
        const series = points.filter((p) => p.team === team).sort((a, b) => a.minute - b.minute);
        let d = `M ${sx(0)} ${sy(0)}`;
        let prev = 0;
        for (const p of series) {
          d += ` L ${sx(p.minute)} ${sy(prev)} L ${sx(p.minute)} ${sy(p.cumXg)}`;
          prev = p.cumXg;
        }
        d += ` L ${sx(now)} ${sy(prev)}`;
        const area = `${d} L ${sx(now)} ${sy(0)} Z`;
        const goals = series.filter((p, i) => p.cumGoals > (series[i - 1]?.cumGoals ?? 0));
        const colour = colourFor(team);
        return (
          <g key={team}>
            <path d={area} fill={colour} fillOpacity={0.1} />
            <path d={d} fill="none" stroke={colour} strokeWidth={2.5} strokeLinejoin="round" />
            {goals.map((g) => (
              <circle key={g.minute} cx={sx(g.minute)} cy={sy(g.cumXg)} r={5.5} fill={colour} stroke={GOLD} strokeWidth={2} />
            ))}
            <text x={sx(now) + 6} y={sy(prev) + 4} fontSize={13} fontWeight={700} fill={colour} className="display">
              {prev.toFixed(2)}
            </text>
          </g>
        );
      })}
      {now > 0 ? (
        <g>
          <line x1={sx(now)} x2={sx(now)} y1={PAD.t} y2={H - PAD.b} stroke="var(--live)" strokeWidth={1.5} />
          <text x={sx(now)} y={PAD.t - 3} fontSize={11} textAnchor="middle" fill="var(--live)" fontWeight={600}>
            {now}'
          </text>
        </g>
      ) : null}
    </svg>
  );
}

/** Broadcast-style momentum: home team above the axis, away team below, no legend needed. */
export function MomentumChart({ points, home, away, maxMinute = 95 }: { points: MomentumPoint[]; home: string; away: string; maxMinute?: number }) {
  const mid = H / 2;
  const maxM = Math.max(1, ...points.map((p) => Math.abs(p.momentum)));
  const sx = (m: number) => PAD.l + (m / maxMinute) * (W - PAD.l - PAD.r);
  const bw = Math.max(1.5, (W - PAD.l - PAD.r) / maxMinute - 1.2);
  const scale = (v: number) => (v / maxM) * (mid - PAD.t - 4);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="block w-full" role="img" aria-label={`Momentum, ${home} above the line, ${away} below`}>
      {[0, 15, 30, 45, 60, 75, 90].map((m) => (
        <text key={m} x={sx(m)} y={H - 8} fontSize={11} textAnchor="middle" fill={AXIS}>
          {m}'
        </text>
      ))}
      <line x1={sx(45)} x2={sx(45)} y1={PAD.t} y2={H - PAD.b} stroke={GRID} strokeDasharray="3 4" />
      {points.map((p) => {
        const h = Math.max(0, scale(p.momentum));
        const up = p.team === home;
        return (
          <rect
            key={`${p.team}-${p.minute}`}
            x={sx(p.minute)}
            y={up ? mid - h : mid}
            width={bw}
            height={h}
            rx={1}
            fill={colourFor(p.team)}
            fillOpacity={0.9}
          />
        );
      })}
      <line x1={PAD.l} x2={W - PAD.r} y1={mid} y2={mid} stroke="#3a4454" />
      <text x={PAD.l} y={PAD.t + 4} fontSize={11} fontWeight={700} fill={colourFor(home)} letterSpacing="0.08em">
        {home.toUpperCase()}
      </text>
      <text x={PAD.l} y={H - PAD.b - 2} fontSize={11} fontWeight={700} fill={colourFor(away)} letterSpacing="0.08em">
        {away.toUpperCase()}
      </text>
    </svg>
  );
}
