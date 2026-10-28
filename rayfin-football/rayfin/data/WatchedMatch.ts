import { boolean, date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

/**
 * Catalog of matches the app knows about - the thing the home screen lists.
 *
 * The Eventhouse only knows a match once events arrive; this entity lets you schedule a replay,
 * show kickoff times and lock predictions before the first event lands. Readable by everyone,
 * writable by anyone signed in (for the demo); narrow the write role to an "admin" role in the
 * Entra app registration when real users show up.
 */
@entity()
@role('authenticated', ['read', 'create', 'update'])
export class WatchedMatch {
  @uuid() id!: string;

  /** StatsBomb match id; primary join key to the Eventhouse. */
  @int() match_id!: number;

  @text() competition!: string;
  @text() season!: string;
  @text() home_team!: string;
  @text() away_team!: string;

  /** Real kickoff date of the original fixture, for display. */
  @date() played_on!: Date;

  /** When the replay is scheduled to start; predictions lock at this moment. */
  @date({ optional: true }) replay_at?: Date;

  @boolean() is_live!: boolean;
  @boolean() is_finished!: boolean;

  /** Final score once known, used to settle predictions. */
  @int({ optional: true }) final_home_goals?: number;
  @int({ optional: true }) final_away_goals?: number;
}
