import { Prediction } from './Prediction.js';
import { ScoutingNote } from './ScoutingNote.js';
import { WatchedMatch } from './WatchedMatch.js';
/**
 * Schema type definition for the match centre.
 *
 * Maps entity names to their model types so the RayfinClient is fully typed
 * (`client.data.Prediction…`, `client.data.ScoutingNote…`, `client.data.WatchedMatch…`).
 */
export type DataAppSchema = {
    Prediction: Prediction;
    ScoutingNote: ScoutingNote;
    WatchedMatch: WatchedMatch;
};
export declare const schema: (typeof Prediction | typeof ScoutingNote | typeof WatchedMatch)[];
