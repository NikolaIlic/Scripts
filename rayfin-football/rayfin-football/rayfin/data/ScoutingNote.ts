import { date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';

/**
 * A note pinned to a player or a moment in a match.
 *
 * Tagged live from the match centre ("watch his first touch under pressure at 54'") and later
 * exported as a scouting report. Notes are private by default: only the author can read them,
 * which is the right default for scouting. Flip the read role to plain `authenticated` for a
 * shared analyst room.
 */
@entity()
@role('authenticated', '*', {
  policy: (claims, item) => claims.sub.eq(item.user_id),
})
export class ScoutingNote {
  @uuid() id!: string;

  @int() match_id!: number;

  /** StatsBomb player id when the note is about a player; optional for team/moment notes. */
  @int({ optional: true }) player_id?: number;
  @text({ optional: true }) player?: string;
  @text() team!: string;

  /** Match clock the note refers to, so it lines up with the event feed. */
  @int() minute!: number;

  /** Optional link to the exact event (match_events.event_id). */
  @text({ optional: true }) event_id?: string;

  /** Short tag for filtering: "pressing", "first-touch", "set-piece", "fitness"... */
  @text({ optional: true }) tag?: string;

  /** 1-5 rating of the observed action. */
  @int({ optional: true }) rating?: number;

  @text() body!: string;

  @text() author!: string;
  @date() createdAt!: Date;

  /** Owner association, populated from the JWT `sub` claim. */
  @text() user_id!: string;
}
