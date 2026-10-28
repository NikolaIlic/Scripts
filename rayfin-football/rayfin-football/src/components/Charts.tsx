import type { MomentumPoint, Shot, XgPoint } from '@/hooks/useMatch';

/** Team colours keyed by team name; anything else gets a neutral. */
export const TEAM_COLOURS: Record<string, string> = {
  Barcelona: '#a50044',
  'Real Madrid': '#d8d8d8',
};
export const colourFor = (team: string) => TEAM_COLOURS[team] ?? '#60a5fa';

const W = 640;
const H = 220;
const PAD = { l: 36, r: 12, t: 12, b: 24 };

/** Cumulative xG per team as step lines, goals as dots. */
export function XgRaceChart({ points, maxMinute = 95 }: { points: XgPoint[]; maxMinute?: number }) {
  const teams = [...new Set(points.map((p) => p.team))];
  const maxXg = Math.max(0.5, ...points.map((p) => p.cumXg)) * 1.1;
  const sx = (m: number) => PAD.l + (m / maxMinute) * (W - PAD.l - PAD.r);
  const sy = (v: number) => H - PAD.b - (v / maxXg) * (H - PAD.t - PAD.b);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Cumulative xG race">
      {[0, 15, 30, 45, 60, 75, 90].map((m) => (
        <g key={m}>
          <line x1={sx(m)} x2={sx(m)} y1={PAD.t} y2={H - PAD.b} stroke="currentColor" strokeOpacity={0.08} />
          <text x={sx(m)} y={H - 6} fontSize={10} textAnchor="middle" fill="currentColor" opacity={0.5}>
            {m}'
          </text>
        </g>
      ))}
      {[0.5, 1, 1.5, 2, 2.5, 3, 4].filter((v) => v < maxXg).map((v) => (
        <g key={v}>
          <line x1={PAD.l} x2={W - PAD.r} y1={sy(v)} y2={sy(v)} stroke="currentColor" strokeOpacity={0.08} />
          <text x={PAD.l - 6} y={sy(v) + 3} fontSize={10} textAnchor="end" fill="currentColor" opacity={0.5}>
            {v.toFixed(1)}
          </text>
        </g>
      ))}
      {teams.map((team) => {
        const series = points.filter((p) => p.team === team).sort((a, b) => a.minute - b.minute);
        const last = series[series.length - 1];
        let d = `M ${sx(0)} ${sy(0)}`;
        let prevXg = 0;
        for (const p of series) {
          d += ` L ${sx(p.minute)} ${sy(prevXg)} L ${sx(p.minute)} ${sy(p.cumXg)}`;
          prevXg = p.cumXg;
        }
        if (last) d += ` L ${sx(Math.min(maxMinute, last.minute + 1))} ${sy(prevXg)}`;
        const goals = series.filter((p, i) => p.cumGoals > (series[i - 1]?.cumGoals ?? 0));
        return (
          <g key={team}>
            <path d={d} fill="none" stroke={colourFor(team)} strokeWidth={2.5} />
            {goals.map((g) => (
              <circle key={g.minute} cx={sx(g.minute)} cy={sy(g.cumXg)} r={5} fill={colourFor(team)} stroke="#000" strokeOpacity={0.4} />
            ))}
            {last ? (
              <text x={sx(last.minute) + 6} y={sy(last.cumXg) + 4} fontSize={11} fill={colourFor(team)} fontWeight={600}>
                {last.cumXg.toFixed(2)}
              </text>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

/** Mirrored momentum: home team up, away team down. */
export function MomentumChart({ points, home, away, maxMinute = 95 }: { points: MomentumPoint[]; home: string; away: string; maxMinute?: number }) {
  const mid = H / 2;
  const maxM = Math.max(1, ...points.map((p) => Math.abs(p.momentum)));
  const sx = (m: number) => PAD.l + (m / maxMinute) * (W - PAD.l - PAD.r);
  const bw = Math.max(1, (W - PAD.l - PAD.r) / maxMinute - 1);
  const scale = (v: number) => (v / maxM) * (mid - PAD.t);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Momentum">
      <line x1={PAD.l} x2={W - PAD.r} y1={mid} y2={mid} stroke="currentColor" strokeOpacity={0.25} />
      {points.map((p) => {
        const h = scale(p.momentum);
        const up = p.team === home;
        return (
          <rect
            key={`${p.team}-${p.minute}`}
            x={sx(p.minute)}
            y={up ? mid - h : mid}
            width={bw}
            height={Math.max(0, h)}
            fill={colourFor(p.team)}
            opacity={up ? 0.85 : 0.75}
          />
        );
      })}
      <text x={PAD.l} y={PAD.t + 10} fontSize={11} fill={colourFor(home)} fontWeight={600}>{home}</text>
      <text x={PAD.l} y={H - PAD.b + 4} fontSize={11} fill={colourFor(away)} fontWeight={600}>{away}</text>
    </svg>
  );
}

/**
 * Shot map on a half pitch. StatsBomb coordinates are 120 x 80 with each team attacking
 * left to right, so every shot is mirrored into the right-hand half.
 */
export function ShotMap({ shots }: { shots: Shot[] }) {
  const PW = 400;
  const PH = 400;
  // Map StatsBomb x (60..120) -> vertical, y (0..80) -> horizontal, goal at the top.
  const px = (y: number) => (y / 80) * PW;
  const py = (x: number) => PH - ((x - 60) / 60) * PH;

  return (
    <svg viewBox={`0 0 ${PW} ${PH}`} className="w-full max-w-[420px]" role="img" aria-label="Shot map">
      <rect x={0} y={0} width={PW} height={PH} fill="#1b6b3a" rx={6} />
      <rect x={px(18)} y={py(120)} width={px(62) - px(18)} height={py(102) - py(120)} fill="none" stroke="#fff" strokeOpacity={0.7} />
      <rect x={px(30)} y={py(120)} width={px(50) - px(30)} height={py(114) - py(120)} fill="none" stroke="#fff" strokeOpacity={0.7} />
      <rect x={px(36)} y={py(120) - 6} width={px(44) - px(36)} height={6} fill="#fff" />
      <circle cx={px(40)} cy={py(108)} r={2} fill="#fff" />
      <path d={`M ${px(31)} ${py(102)} A 45 45 0 0 0 ${px(49)} ${py(102)}`} fill="none" stroke="#fff" strokeOpacity={0.7} />
      {shots.map((s, i) => {
        const r = 4 + Math.sqrt(s.xg) * 18;
        return (
          <g key={i}>
            <circle
              cx={px(s.y)}
              cy={py(s.x)}
              r={r}
              fill={colourFor(s.team)}
              fillOpacity={s.isGoal ? 0.95 : 0.45}
              stroke={s.isGoal ? '#fde047' : '#fff'}
              strokeWidth={s.isGoal ? 2.5 : 1}
            />
            <title>{`${s.minute}' ${s.player} (${s.team}) xG ${s.xg.toFixed(2)} ${s.outcome}`}</title>
          </g>
        );
      })}
    </svg>
  );
}
