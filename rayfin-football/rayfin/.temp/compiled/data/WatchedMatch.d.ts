/**
 * Catalog of matches the app knows about - the thing the home screen lists.
 *
 * The Eventhouse only knows a match once events arrive; this entity lets you schedule a replay,
 * show kickoff times and lock predictions before the first event lands. Readable by everyone,
 * writable by anyone signed in (for the demo); narrow the write role to an "admin" role in the
 * Entra app registration when real users show up.
 */
export declare class WatchedMatch {
    id: string;
    /** StatsBomb match id; primary join key to the Eventhouse. */
    match_id: number;
    competition: string;
    season: string;
    home_team: string;
    away_team: string;
    /** Real kickoff date of the original fixture, for display. */
    played_on: Date;
    /** When the replay is scheduled to start; predictions lock at this moment. */
    replay_at?: Date;
    is_live: boolean;
    is_finished: boolean;
    /** Final score once known, used to settle predictions. */
    final_home_goals?: number;
    final_away_goals?: number;
}
