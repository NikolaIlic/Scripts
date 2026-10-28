var __esDecorate = (this && this.__esDecorate) || function (ctor, descriptorIn, decorators, contextIn, initializers, extraInitializers) {
    function accept(f) { if (f !== void 0 && typeof f !== "function") throw new TypeError("Function expected"); return f; }
    var kind = contextIn.kind, key = kind === "getter" ? "get" : kind === "setter" ? "set" : "value";
    var target = !descriptorIn && ctor ? contextIn["static"] ? ctor : ctor.prototype : null;
    var descriptor = descriptorIn || (target ? Object.getOwnPropertyDescriptor(target, contextIn.name) : {});
    var _, done = false;
    for (var i = decorators.length - 1; i >= 0; i--) {
        var context = {};
        for (var p in contextIn) context[p] = p === "access" ? {} : contextIn[p];
        for (var p in contextIn.access) context.access[p] = contextIn.access[p];
        context.addInitializer = function (f) { if (done) throw new TypeError("Cannot add initializers after decoration has completed"); extraInitializers.push(accept(f || null)); };
        var result = (0, decorators[i])(kind === "accessor" ? { get: descriptor.get, set: descriptor.set } : descriptor[key], context);
        if (kind === "accessor") {
            if (result === void 0) continue;
            if (result === null || typeof result !== "object") throw new TypeError("Object expected");
            if (_ = accept(result.get)) descriptor.get = _;
            if (_ = accept(result.set)) descriptor.set = _;
            if (_ = accept(result.init)) initializers.unshift(_);
        }
        else if (_ = accept(result)) {
            if (kind === "field") initializers.unshift(_);
            else descriptor[key] = _;
        }
    }
    if (target) Object.defineProperty(target, contextIn.name, descriptor);
    done = true;
};
var __runInitializers = (this && this.__runInitializers) || function (thisArg, initializers, value) {
    var useValue = arguments.length > 2;
    for (var i = 0; i < initializers.length; i++) {
        value = useValue ? initializers[i].call(thisArg, value) : initializers[i].call(thisArg);
    }
    return useValue ? value : void 0;
};
import { boolean, date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';
/**
 * Catalog of matches the app knows about - the thing the home screen lists.
 *
 * The Eventhouse only knows a match once events arrive; this entity lets you schedule a replay,
 * show kickoff times and lock predictions before the first event lands. Readable by everyone,
 * writable by anyone signed in (for the demo); narrow the write role to an "admin" role in the
 * Entra app registration when real users show up.
 */
let WatchedMatch = (() => {
    let _classDecorators = [entity(), role('authenticated', ['read', 'create', 'update'])];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _match_id_decorators;
    let _match_id_initializers = [];
    let _match_id_extraInitializers = [];
    let _competition_decorators;
    let _competition_initializers = [];
    let _competition_extraInitializers = [];
    let _season_decorators;
    let _season_initializers = [];
    let _season_extraInitializers = [];
    let _home_team_decorators;
    let _home_team_initializers = [];
    let _home_team_extraInitializers = [];
    let _away_team_decorators;
    let _away_team_initializers = [];
    let _away_team_extraInitializers = [];
    let _played_on_decorators;
    let _played_on_initializers = [];
    let _played_on_extraInitializers = [];
    let _replay_at_decorators;
    let _replay_at_initializers = [];
    let _replay_at_extraInitializers = [];
    let _is_live_decorators;
    let _is_live_initializers = [];
    let _is_live_extraInitializers = [];
    let _is_finished_decorators;
    let _is_finished_initializers = [];
    let _is_finished_extraInitializers = [];
    let _final_home_goals_decorators;
    let _final_home_goals_initializers = [];
    let _final_home_goals_extraInitializers = [];
    let _final_away_goals_decorators;
    let _final_away_goals_initializers = [];
    let _final_away_goals_extraInitializers = [];
    var WatchedMatch = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [uuid()];
            _match_id_decorators = [int()];
            _competition_decorators = [text()];
            _season_decorators = [text()];
            _home_team_decorators = [text()];
            _away_team_decorators = [text()];
            _played_on_decorators = [date()];
            _replay_at_decorators = [date({ optional: true })];
            _is_live_decorators = [boolean()];
            _is_finished_decorators = [boolean()];
            _final_home_goals_decorators = [int({ optional: true })];
            _final_away_goals_decorators = [int({ optional: true })];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _match_id_decorators, { kind: "field", name: "match_id", static: false, private: false, access: { has: obj => "match_id" in obj, get: obj => obj.match_id, set: (obj, value) => { obj.match_id = value; } }, metadata: _metadata }, _match_id_initializers, _match_id_extraInitializers);
            __esDecorate(null, null, _competition_decorators, { kind: "field", name: "competition", static: false, private: false, access: { has: obj => "competition" in obj, get: obj => obj.competition, set: (obj, value) => { obj.competition = value; } }, metadata: _metadata }, _competition_initializers, _competition_extraInitializers);
            __esDecorate(null, null, _season_decorators, { kind: "field", name: "season", static: false, private: false, access: { has: obj => "season" in obj, get: obj => obj.season, set: (obj, value) => { obj.season = value; } }, metadata: _metadata }, _season_initializers, _season_extraInitializers);
            __esDecorate(null, null, _home_team_decorators, { kind: "field", name: "home_team", static: false, private: false, access: { has: obj => "home_team" in obj, get: obj => obj.home_team, set: (obj, value) => { obj.home_team = value; } }, metadata: _metadata }, _home_team_initializers, _home_team_extraInitializers);
            __esDecorate(null, null, _away_team_decorators, { kind: "field", name: "away_team", static: false, private: false, access: { has: obj => "away_team" in obj, get: obj => obj.away_team, set: (obj, value) => { obj.away_team = value; } }, metadata: _metadata }, _away_team_initializers, _away_team_extraInitializers);
            __esDecorate(null, null, _played_on_decorators, { kind: "field", name: "played_on", static: false, private: false, access: { has: obj => "played_on" in obj, get: obj => obj.played_on, set: (obj, value) => { obj.played_on = value; } }, metadata: _metadata }, _played_on_initializers, _played_on_extraInitializers);
            __esDecorate(null, null, _replay_at_decorators, { kind: "field", name: "replay_at", static: false, private: false, access: { has: obj => "replay_at" in obj, get: obj => obj.replay_at, set: (obj, value) => { obj.replay_at = value; } }, metadata: _metadata }, _replay_at_initializers, _replay_at_extraInitializers);
            __esDecorate(null, null, _is_live_decorators, { kind: "field", name: "is_live", static: false, private: false, access: { has: obj => "is_live" in obj, get: obj => obj.is_live, set: (obj, value) => { obj.is_live = value; } }, metadata: _metadata }, _is_live_initializers, _is_live_extraInitializers);
            __esDecorate(null, null, _is_finished_decorators, { kind: "field", name: "is_finished", static: false, private: false, access: { has: obj => "is_finished" in obj, get: obj => obj.is_finished, set: (obj, value) => { obj.is_finished = value; } }, metadata: _metadata }, _is_finished_initializers, _is_finished_extraInitializers);
            __esDecorate(null, null, _final_home_goals_decorators, { kind: "field", name: "final_home_goals", static: false, private: false, access: { has: obj => "final_home_goals" in obj, get: obj => obj.final_home_goals, set: (obj, value) => { obj.final_home_goals = value; } }, metadata: _metadata }, _final_home_goals_initializers, _final_home_goals_extraInitializers);
            __esDecorate(null, null, _final_away_goals_decorators, { kind: "field", name: "final_away_goals", static: false, private: false, access: { has: obj => "final_away_goals" in obj, get: obj => obj.final_away_goals, set: (obj, value) => { obj.final_away_goals = value; } }, metadata: _metadata }, _final_away_goals_initializers, _final_away_goals_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            WatchedMatch = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        id = __runInitializers(this, _id_initializers, void 0);
        /** StatsBomb match id; primary join key to the Eventhouse. */
        match_id = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _match_id_initializers, void 0));
        competition = (__runInitializers(this, _match_id_extraInitializers), __runInitializers(this, _competition_initializers, void 0));
        season = (__runInitializers(this, _competition_extraInitializers), __runInitializers(this, _season_initializers, void 0));
        home_team = (__runInitializers(this, _season_extraInitializers), __runInitializers(this, _home_team_initializers, void 0));
        away_team = (__runInitializers(this, _home_team_extraInitializers), __runInitializers(this, _away_team_initializers, void 0));
        /** Real kickoff date of the original fixture, for display. */
        played_on = (__runInitializers(this, _away_team_extraInitializers), __runInitializers(this, _played_on_initializers, void 0));
        /** When the replay is scheduled to start; predictions lock at this moment. */
        replay_at = (__runInitializers(this, _played_on_extraInitializers), __runInitializers(this, _replay_at_initializers, void 0));
        is_live = (__runInitializers(this, _replay_at_extraInitializers), __runInitializers(this, _is_live_initializers, void 0));
        is_finished = (__runInitializers(this, _is_live_extraInitializers), __runInitializers(this, _is_finished_initializers, void 0));
        /** Final score once known, used to settle predictions. */
        final_home_goals = (__runInitializers(this, _is_finished_extraInitializers), __runInitializers(this, _final_home_goals_initializers, void 0));
        final_away_goals = (__runInitializers(this, _final_home_goals_extraInitializers), __runInitializers(this, _final_away_goals_initializers, void 0));
        constructor() {
            __runInitializers(this, _final_away_goals_extraInitializers);
        }
    };
    return WatchedMatch = _classThis;
})();
export { WatchedMatch };
