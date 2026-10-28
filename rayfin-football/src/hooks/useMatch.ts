import { useMemo } from 'react';

import { daxNumber, daxRaw, daxString, type DaxRow } from '@/data/model';
import {
  keyMomentsDax,
  momentumDax,
  passNetworkDax,
  scorelineDax,
  shotMapDax,
  xgRaceDax,
} from '@/data/queries';
import { useDaxQuery } from './useDaxQuery';

/** Live panels refresh on this cadence; the replay emits several events per second at 10x. */
export const LIVE_POLL_MS = 3000;

export interface TeamLine {
  team: string;
  goals: number;
  shots: number;
  shotsOnTarget: number;
  xg: number;
  passes: number;
  passPct: number;
  yellow: number;
  red: number;
  clock: string;
  /** Match second of the latest event (minute * 60 + second). */
  clockSeconds: number;
  /** Wall-clock time (ms) the latest event was sent by the producer. */
  lastEventAt: number;
  /** Match seconds per wall-clock second in the current period (10 for --speed 10). */
  replaySpeed: number;
  period: number;
  /** True when the latest event is a Half End: half time or full time. */
  periodOver: boolean;
}

export interface XgPoint {
  team: string;
  minute: number;
  cumXg: number;
  cumGoals: number;
}

export interface MomentumPoint {
  team: string;
  minute: number;
  momentum: number;
}

export interface Shot {
  minute: number;
  team: string;
  player: string;
  x: number;
  y: number;
  xg: number;
  outcome: string;
  bodyPart: string;
  isGoal: boolean;
}

export interface Moment {
  period: number;
  minute: number;
  second: number;
  team: string;
  headline: string;
  eventType: string;
}

/**
 * Kusto datetimes are UTC, but Power BI's executeQueries returns them without a zone
 * ("2026-10-28T10:05:01.123"), which Date.parse would read as local time. Treat a timestamp
 * with no zone as UTC. Returns 0 when there is nothing to parse.
 */
export function parseUtc(value: string): number {
  if (!value) return 0;
  const hasZone = /(Z|[+-]\d{2}:?\d{2})$/i.test(value.trim());
  const ms = Date.parse(hasZone ? value : `${value.trim().replace(' ', 'T')}Z`);
  return Number.isFinite(ms) ? ms : 0;
}

const bool = (row: DaxRow, key: string) => {
  const v = daxRaw(row, key);
  return v === true || v === 1 || v === 'true' || v === 'True';
};

export function useScoreline(matchId: number) {
  const q = useDaxQuery(scorelineDax(matchId), LIVE_POLL_MS);
  const teams = useMemo<TeamLine[]>(
    () =>
      q.rows.map((r) => ({
        team: daxString(r, 'team'),
        goals: daxNumber(r, 'goals') || 0,
        shots: daxNumber(r, 'shots') || 0,
        shotsOnTarget: daxNumber(r, 'shots_on_t') || 0,
        xg: daxNumber(r, 'xg') || 0,
        passes: daxNumber(r, 'passes') || 0,
        passPct: daxNumber(r, 'pass_pct') || 0,
        yellow: daxNumber(r, 'yellow_cards') || 0,
        red: daxNumber(r, 'red_cards') || 0,
        clock: daxString(r, 'clock'),
        clockSeconds: daxNumber(r, 'clock_seconds') || 0,
        lastEventAt: parseUtc(daxString(r, 'last_event_at')),
        replaySpeed: daxNumber(r, 'replay_speed') || 1,
        period: daxNumber(r, 'period') || 1,
        periodOver: bool(r, 'period_over'),
      })),
    [q.rows],
  );
  return { teams, ...q };
}

export function useXgRace(matchId: number) {
  const q = useDaxQuery(xgRaceDax(matchId), LIVE_POLL_MS);
  const points = useMemo<XgPoint[]>(
    () =>
      q.rows.map((r) => ({
        team: daxString(r, 'team'),
        minute: daxNumber(r, 'minute'),
        cumXg: daxNumber(r, 'cum_xg') || 0,
        cumGoals: daxNumber(r, 'cum_goals') || 0,
      })),
    [q.rows],
  );
  return { points, ...q };
}

export function useMomentum(matchId: number) {
  const q = useDaxQuery(momentumDax(matchId), LIVE_POLL_MS * 2);
  const points = useMemo<MomentumPoint[]>(
    () =>
      q.rows.map((r) => ({
        team: daxString(r, 'team'),
        minute: daxNumber(r, 'minute'),
        momentum: daxNumber(r, 'momentum') || 0,
      })),
    [q.rows],
  );
  return { points, ...q };
}

export function useShotMap(matchId: number) {
  const q = useDaxQuery(shotMapDax(matchId), LIVE_POLL_MS);
  const shots = useMemo<Shot[]>(
    () =>
      q.rows.map((r) => ({
        minute: daxNumber(r, 'minute'),
        team: daxString(r, 'team'),
        player: daxString(r, 'player'),
        x: daxNumber(r, 'x'),
        y: daxNumber(r, 'y'),
        xg: daxNumber(r, 'xg') || 0,
        outcome: daxString(r, 'outcome'),
        bodyPart: daxString(r, 'body_part'),
        isGoal: bool(r, 'is_goal'),
      })),
    [q.rows],
  );
  return { shots, ...q };
}

export interface PassEdge {
  team: string;
  player: string;
  recipient: string;
  passes: number;
  fromX: number;
  fromY: number;
  fromTouches: number;
  toX: number;
  toY: number;
}

/** Pass network for one team, refreshed less often than the live panels. */
export function usePassNetwork(matchId: number, team: string) {
  const q = useDaxQuery(passNetworkDax(matchId, team), LIVE_POLL_MS * 3);
  const edges = useMemo<PassEdge[]>(
    () =>
      q.rows.map((r) => ({
        team: daxString(r, 'team') || team,
        player: daxString(r, 'player'),
        recipient: daxString(r, 'recipient'),
        passes: daxNumber(r, 'passes') || 0,
        fromX: daxNumber(r, 'from_x'),
        fromY: daxNumber(r, 'from_y'),
        fromTouches: daxNumber(r, 'from_touches') || 0,
        toX: daxNumber(r, 'to_x'),
        toY: daxNumber(r, 'to_y'),
      })),
    [q.rows, team],
  );
  return { edges, ...q };
}

export function useKeyMoments(matchId: number) {
  const q = useDaxQuery(keyMomentsDax(matchId), LIVE_POLL_MS);
  const moments = useMemo<Moment[]>(
    () =>
      q.rows.map((r) => ({
        period: daxNumber(r, 'period'),
        minute: daxNumber(r, 'minute'),
        second: daxNumber(r, 'second'),
        team: daxString(r, 'team'),
        headline: daxString(r, 'headline'),
        eventType: daxString(r, 'event_type'),
      })),
    [q.rows],
  );
  return { moments, ...q };
}
