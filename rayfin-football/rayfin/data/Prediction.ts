import { boolean, date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

/**
 * A user's pre-kickoff prediction for one match.
 *
 * This is the write workload that justifies Rayfin in the stack: the Eventhouse tells you what
 * happened on the pitch, the SQL database behind this entity remembers what each user thought
 * would happen. The leaderboard joins the two.
 *
 * Everyone signed in can read every prediction (a leaderboard with hidden rows is pointless),
 * but a prediction can only be created, changed or deleted by its owner - enforced server-side
 * against the JWT `sub` claim, not by hiding buttons. `locked` is set by the app once the first
 * event for the match arrives, after which updates are refused in the UI.
 */
@entity()
@role('authenticated', ['read'])
@role('authenticated', ['create', 'update', 'delete'], {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class Prediction {
  @uuid() id!: string;

  /** StatsBomb match id, e.g. 69299. Matches match_events.match_id in the Eventhouse. */
  @int() match_id!: number;

  @int() home_goals!: number;
  @int() away_goals!: number;

  /** Free-text first goalscorer; scored against the first is_goal event. */
  @text({ optional: true }) first_scorer?: string;

  /** Points awarded once the match ends; null while live. */
  @int({ optional: true }) points?: number;

  @boolean() locked!: boolean;

  /** Display name captured at write time so the leaderboard needs no lookup. */
  @text() author!: string;

  @date() createdAt!: Date;

  /** Owner association, populated from the JWT `sub` claim. */
  @text() user_id!: string;
}
