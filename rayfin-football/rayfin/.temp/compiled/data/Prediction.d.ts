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
export declare class Prediction {
    id: string;
    /** StatsBomb match id, e.g. 69299. Matches match_events.match_id in the Eventhouse. */
    match_id: number;
    home_goals: number;
    away_goals: number;
    /** Free-text first goalscorer; scored against the first is_goal event. */
    first_scorer?: string;
    /** Points awarded once the match ends; null while live. */
    points?: number;
    locked: boolean;
    /** Display name captured at write time so the leaderboard needs no lookup. */
    author: string;
    createdAt: Date;
    /** Owner association, populated from the JWT `sub` claim. */
    user_id: string;
}
