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
import { date, entity, int, role, text, uuid } from '@microsoft/rayfin-core';
/**
 * A note pinned to a player or a moment in a match.
 *
 * Tagged live from the match centre ("watch his first touch under pressure at 54'") and later
 * exported as a scouting report. Notes are private by default: only the author can read them,
 * which is the right default for scouting. Flip the read role to plain `authenticated` for a
 * shared analyst room.
 */
let ScoutingNote = (() => {
    let _classDecorators = [entity(), role('authenticated', '*', {
            policy: (claims, item) => claims.sub.eq(item.user_id),
        })];
    let _classDescriptor;
    let _classExtraInitializers = [];
    let _classThis;
    let _id_decorators;
    let _id_initializers = [];
    let _id_extraInitializers = [];
    let _match_id_decorators;
    let _match_id_initializers = [];
    let _match_id_extraInitializers = [];
    let _player_id_decorators;
    let _player_id_initializers = [];
    let _player_id_extraInitializers = [];
    let _player_decorators;
    let _player_initializers = [];
    let _player_extraInitializers = [];
    let _team_decorators;
    let _team_initializers = [];
    let _team_extraInitializers = [];
    let _minute_decorators;
    let _minute_initializers = [];
    let _minute_extraInitializers = [];
    let _event_id_decorators;
    let _event_id_initializers = [];
    let _event_id_extraInitializers = [];
    let _tag_decorators;
    let _tag_initializers = [];
    let _tag_extraInitializers = [];
    let _rating_decorators;
    let _rating_initializers = [];
    let _rating_extraInitializers = [];
    let _body_decorators;
    let _body_initializers = [];
    let _body_extraInitializers = [];
    let _author_decorators;
    let _author_initializers = [];
    let _author_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _user_id_decorators;
    let _user_id_initializers = [];
    let _user_id_extraInitializers = [];
    var ScoutingNote = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [uuid()];
            _match_id_decorators = [int()];
            _player_id_decorators = [int({ optional: true })];
            _player_decorators = [text({ optional: true })];
            _team_decorators = [text()];
            _minute_decorators = [int()];
            _event_id_decorators = [text({ optional: true })];
            _tag_decorators = [text({ optional: true })];
            _rating_decorators = [int({ optional: true })];
            _body_decorators = [text()];
            _author_decorators = [text()];
            _createdAt_decorators = [date()];
            _user_id_decorators = [text()];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _match_id_decorators, { kind: "field", name: "match_id", static: false, private: false, access: { has: obj => "match_id" in obj, get: obj => obj.match_id, set: (obj, value) => { obj.match_id = value; } }, metadata: _metadata }, _match_id_initializers, _match_id_extraInitializers);
            __esDecorate(null, null, _player_id_decorators, { kind: "field", name: "player_id", static: false, private: false, access: { has: obj => "player_id" in obj, get: obj => obj.player_id, set: (obj, value) => { obj.player_id = value; } }, metadata: _metadata }, _player_id_initializers, _player_id_extraInitializers);
            __esDecorate(null, null, _player_decorators, { kind: "field", name: "player", static: false, private: false, access: { has: obj => "player" in obj, get: obj => obj.player, set: (obj, value) => { obj.player = value; } }, metadata: _metadata }, _player_initializers, _player_extraInitializers);
            __esDecorate(null, null, _team_decorators, { kind: "field", name: "team", static: false, private: false, access: { has: obj => "team" in obj, get: obj => obj.team, set: (obj, value) => { obj.team = value; } }, metadata: _metadata }, _team_initializers, _team_extraInitializers);
            __esDecorate(null, null, _minute_decorators, { kind: "field", name: "minute", static: false, private: false, access: { has: obj => "minute" in obj, get: obj => obj.minute, set: (obj, value) => { obj.minute = value; } }, metadata: _metadata }, _minute_initializers, _minute_extraInitializers);
            __esDecorate(null, null, _event_id_decorators, { kind: "field", name: "event_id", static: false, private: false, access: { has: obj => "event_id" in obj, get: obj => obj.event_id, set: (obj, value) => { obj.event_id = value; } }, metadata: _metadata }, _event_id_initializers, _event_id_extraInitializers);
            __esDecorate(null, null, _tag_decorators, { kind: "field", name: "tag", static: false, private: false, access: { has: obj => "tag" in obj, get: obj => obj.tag, set: (obj, value) => { obj.tag = value; } }, metadata: _metadata }, _tag_initializers, _tag_extraInitializers);
            __esDecorate(null, null, _rating_decorators, { kind: "field", name: "rating", static: false, private: false, access: { has: obj => "rating" in obj, get: obj => obj.rating, set: (obj, value) => { obj.rating = value; } }, metadata: _metadata }, _rating_initializers, _rating_extraInitializers);
            __esDecorate(null, null, _body_decorators, { kind: "field", name: "body", static: false, private: false, access: { has: obj => "body" in obj, get: obj => obj.body, set: (obj, value) => { obj.body = value; } }, metadata: _metadata }, _body_initializers, _body_extraInitializers);
            __esDecorate(null, null, _author_decorators, { kind: "field", name: "author", static: false, private: false, access: { has: obj => "author" in obj, get: obj => obj.author, set: (obj, value) => { obj.author = value; } }, metadata: _metadata }, _author_initializers, _author_extraInitializers);
            __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
            __esDecorate(null, null, _user_id_decorators, { kind: "field", name: "user_id", static: false, private: false, access: { has: obj => "user_id" in obj, get: obj => obj.user_id, set: (obj, value) => { obj.user_id = value; } }, metadata: _metadata }, _user_id_initializers, _user_id_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            ScoutingNote = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        id = __runInitializers(this, _id_initializers, void 0);
        match_id = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _match_id_initializers, void 0));
        /** StatsBomb player id when the note is about a player; optional for team/moment notes. */
        player_id = (__runInitializers(this, _match_id_extraInitializers), __runInitializers(this, _player_id_initializers, void 0));
        player = (__runInitializers(this, _player_id_extraInitializers), __runInitializers(this, _player_initializers, void 0));
        team = (__runInitializers(this, _player_extraInitializers), __runInitializers(this, _team_initializers, void 0));
        /** Match clock the note refers to, so it lines up with the event feed. */
        minute = (__runInitializers(this, _team_extraInitializers), __runInitializers(this, _minute_initializers, void 0));
        /** Optional link to the exact event (match_events.event_id). */
        event_id = (__runInitializers(this, _minute_extraInitializers), __runInitializers(this, _event_id_initializers, void 0));
        /** Short tag for filtering: "pressing", "first-touch", "set-piece", "fitness"... */
        tag = (__runInitializers(this, _event_id_extraInitializers), __runInitializers(this, _tag_initializers, void 0));
        /** 1-5 rating of the observed action. */
        rating = (__runInitializers(this, _tag_extraInitializers), __runInitializers(this, _rating_initializers, void 0));
        body = (__runInitializers(this, _rating_extraInitializers), __runInitializers(this, _body_initializers, void 0));
        author = (__runInitializers(this, _body_extraInitializers), __runInitializers(this, _author_initializers, void 0));
        createdAt = (__runInitializers(this, _author_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
        /** Owner association, populated from the JWT `sub` claim. */
        user_id = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _user_id_initializers, void 0));
        constructor() {
            __runInitializers(this, _user_id_extraInitializers);
        }
    };
    return ScoutingNote = _classThis;
})();
export { ScoutingNote };
