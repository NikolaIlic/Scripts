/**
 * A note pinned to a player or a moment in a match.
 *
 * Tagged live from the match centre ("watch his first touch under pressure at 54'") and later
 * exported as a scouting report. Notes are private by default: only the author can read them,
 * which is the right default for scouting. Flip the read role to plain `authenticated` for a
 * shared analyst room.
 */
export declare class ScoutingNote {
    id: string;
    match_id: number;
    /** StatsBomb player id when the note is about a player; optional for team/moment notes. */
    player_id?: number;
    player?: string;
    team: string;
    /** Match clock the note refers to, so it lines up with the event feed. */
    minute: number;
    /** Optional link to the exact event (match_events.event_id). */
    event_id?: string;
    /** Short tag for filtering: "pressing", "first-touch", "set-piece", "fitness"... */
    tag?: string;
    /** 1-5 rating of the observed action. */
    rating?: number;
    body: string;
    author: string;
    createdAt: Date;
    /** Owner association, populated from the JWT `sub` claim. */
    user_id: string;
}
