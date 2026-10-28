import { useCallback, useEffect, useState } from 'react';

import type { Prediction } from '../../rayfin/data/Prediction';
import { getRayfinClient } from '@/services/rayfinClient';

export type PredictionRow = Pick<
  Prediction,
  'id' | 'home_goals' | 'away_goals' | 'first_scorer' | 'points' | 'locked' | 'author' | 'createdAt' | 'user_id'
>;

const FIELDS = [
  'id',
  'home_goals',
  'away_goals',
  'first_scorer',
  'points',
  'locked',
  'author',
  'createdAt',
  'user_id',
] as const;

/**
 * Predictions for one match, through the Rayfin data service.
 *
 * Not polled: a prediction changes when a person types one. The list refetches after each write
 * and when the match changes. The owner check for update/delete is enforced server-side against
 * the JWT `sub` claim; `user_id` is written here only so the list can show "yours".
 */
export function usePredictions(matchId: number) {
  const [rows, setRows] = useState<PredictionRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const result = await getRayfinClient()
        .data.Prediction.select([...FIELDS])
        .where({ match_id: { eq: matchId } })
        .orderBy({ createdAt: 'desc' })
        .execute();
      setRows((result ?? []) as PredictionRow[]);
    } catch (e) {
      setRows([]);
      setError(e instanceof Error ? e.message : String(e));
    } finally {
      setLoading(false);
    }
  }, [matchId]);

  useEffect(() => {
    void load();
  }, [load]);

  const submit = useCallback(
    async (homeGoals: number, awayGoals: number, firstScorer: string) => {
      setSaving(true);
      setError(null);
      try {
        const client = getRayfinClient();
        const user = client.auth.getSession().user;
        if (!user) throw new Error('not signed in');

        // One prediction per user per match: update if it exists, otherwise create.
        const mine = rows.find((r) => r.user_id === user.id);
        if (mine?.locked) throw new Error('Predictions are locked once the match is live.');

        if (mine) {
          await client.data.Prediction.update(
            { id: mine.id },
            { home_goals: homeGoals, away_goals: awayGoals, first_scorer: firstScorer || undefined },
          );
        } else {
          await client.data.Prediction.create({
            match_id: matchId,
            home_goals: homeGoals,
            away_goals: awayGoals,
            first_scorer: firstScorer || undefined,
            locked: false,
            author: user.email || 'unknown',
            createdAt: new Date(),
            user_id: user.id,
          });
        }
        await load();
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setSaving(false);
      }
    },
    [matchId, rows, load],
  );

  return { rows, loading, saving, error, submit, reload: load };
}
