/**
 * DAX queries against the football semantic model (DirectQuery over the Eventhouse).
 *
 * The model exposes the KQL functions in fabric/eventhouse/DatabaseSchema.kql as tables, each
 * parameterised by an M parameter `Match_Id`. Push the match id in with MPARAMETER on every query.
 *
 * Row keys returned by Power BI's `executeQueries` are qualified (`[team]`, `'Scoreline'[team]`),
 * so read them through `daxValue`/`daxNumber` in src/data/model.ts rather than by bare name.
 */

const matchParam = (matchId: number) => `
DEFINE
    MPARAMETER 'Match_Id' = ${Math.trunc(matchId)}
`;

/** Header strip: score, shots, xG, possession proxy, cards. One row per team. */
export function scorelineDax(matchId: number): string {
  return `${matchParam(matchId)}
EVALUATE
SELECTCOLUMNS(
    'Scoreline',
    "team", 'Scoreline'[team],
    "goals", 'Scoreline'[goals],
    "shots", 'Scoreline'[shots],
    "shots_on_t", 'Scoreline'[shots_on_t],
    "xg", 'Scoreline'[xg],
    "passes", 'Scoreline'[passes],
    "pass_pct", 'Scoreline'[pass_pct],
    "yellow_cards", 'Scoreline'[yellow_cards],
    "red_cards", 'Scoreline'[red_cards],
    "clock", 'Scoreline'[clock],
    "clock_seconds", 'Scoreline'[clock_seconds],
    "last_event_at", 'Scoreline'[last_event_at],
    "replay_speed", 'Scoreline'[replay_speed],
    "period", 'Scoreline'[period],
    "period_over", 'Scoreline'[period_over]
)`.trim();
}

/** Cumulative xG per team per minute for the xG race line chart. */
export function xgRaceDax(matchId: number): string {
  return `${matchParam(matchId)}
EVALUATE
SELECTCOLUMNS(
    'XgRace',
    "team", 'XgRace'[team],
    "minute", 'XgRace'[minute],
    "cum_xg", 'XgRace'[cum_xg],
    "cum_goals", 'XgRace'[cum_goals]
)
ORDER BY [team], [minute]`.trim();
}

/** Rolling momentum per team, rendered as a mirrored area chart. */
export function momentumDax(matchId: number): string {
  return `${matchParam(matchId)}
EVALUATE
SELECTCOLUMNS(
    'Momentum',
    "team", 'Momentum'[team],
    "minute", 'Momentum'[minute],
    "momentum", 'Momentum'[momentum]
)
ORDER BY [team], [minute]`.trim();
}

/** Every shot with pitch coordinates (StatsBomb 120 x 80, attacking left to right). */
export function shotMapDax(matchId: number): string {
  return `${matchParam(matchId)}
EVALUATE
SELECTCOLUMNS(
    'ShotMap',
    "minute", 'ShotMap'[minute],
    "team", 'ShotMap'[team],
    "player", 'ShotMap'[player],
    "x", 'ShotMap'[x],
    "y", 'ShotMap'[y],
    "xg", 'ShotMap'[xg],
    "outcome", 'ShotMap'[outcome],
    "body_part", 'ShotMap'[body_part],
    "is_goal", 'ShotMap'[is_goal]
)
ORDER BY [minute]`.trim();
}

/** Pass network edges plus node positions for one team. */
export function passNetworkDax(matchId: number, team: string): string {
  const safeTeam = team.replace(/"/g, '""');
  return `${matchParam(matchId)}
EVALUATE
CALCULATETABLE(
    SELECTCOLUMNS(
        'PassNetwork',
        "player", 'PassNetwork'[player],
        "recipient", 'PassNetwork'[recipient],
        "passes", 'PassNetwork'[passes],
        "from_x", 'PassNetwork'[from_x],
        "from_y", 'PassNetwork'[from_y],
        "from_touches", 'PassNetwork'[from_touches],
        "to_x", 'PassNetwork'[to_x],
        "to_y", 'PassNetwork'[to_y]
    ),
    'PassNetwork'[team] = "${safeTeam}"
)`.trim();
}

/** Live leaderboard, top N by touches. */
export function playerStatsDax(matchId: number, top = 30): string {
  return `${matchParam(matchId)}
EVALUATE
TOPN(
    ${top},
    SELECTCOLUMNS(
        'PlayerStats',
        "team", 'PlayerStats'[team],
        "player", 'PlayerStats'[player],
        "touches", 'PlayerStats'[touches],
        "passes", 'PlayerStats'[passes],
        "pass_pct", 'PlayerStats'[pass_pct],
        "progressive_passes", 'PlayerStats'[progressive_passes],
        "key_passes", 'PlayerStats'[key_passes],
        "shots", 'PlayerStats'[shots],
        "goals", 'PlayerStats'[goals],
        "xg", 'PlayerStats'[xg],
        "dribbles_won", 'PlayerStats'[dribbles_won],
        "recoveries", 'PlayerStats'[recoveries]
    ),
    [touches], DESC
)`.trim();
}

/** Key moments ticker, newest first. */
export function keyMomentsDax(matchId: number, limit = 40): string {
  return `${matchParam(matchId)}
EVALUATE
TOPN(
    ${limit},
    SELECTCOLUMNS(
        'KeyMoments',
        "emitted_at", 'KeyMoments'[emitted_at],
        "period", 'KeyMoments'[period],
        "minute", 'KeyMoments'[minute],
        "second", 'KeyMoments'[second],
        "team", 'KeyMoments'[team],
        "headline", 'KeyMoments'[headline],
        "event_type", 'KeyMoments'[event_type]
    ),
    [emitted_at], DESC
)`.trim();
}
