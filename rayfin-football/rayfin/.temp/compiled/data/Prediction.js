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
let Prediction = (() => {
    let _classDecorators = [entity(), role('authenticated', ['read']), role('authenticated', ['create', 'update', 'delete'], {
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
    let _home_goals_decorators;
    let _home_goals_initializers = [];
    let _home_goals_extraInitializers = [];
    let _away_goals_decorators;
    let _away_goals_initializers = [];
    let _away_goals_extraInitializers = [];
    let _first_scorer_decorators;
    let _first_scorer_initializers = [];
    let _first_scorer_extraInitializers = [];
    let _points_decorators;
    let _points_initializers = [];
    let _points_extraInitializers = [];
    let _locked_decorators;
    let _locked_initializers = [];
    let _locked_extraInitializers = [];
    let _author_decorators;
    let _author_initializers = [];
    let _author_extraInitializers = [];
    let _createdAt_decorators;
    let _createdAt_initializers = [];
    let _createdAt_extraInitializers = [];
    let _user_id_decorators;
    let _user_id_initializers = [];
    let _user_id_extraInitializers = [];
    var Prediction = class {
        static { _classThis = this; }
        static {
            const _metadata = typeof Symbol === "function" && Symbol.metadata ? Object.create(null) : void 0;
            _id_decorators = [uuid()];
            _match_id_decorators = [int()];
            _home_goals_decorators = [int()];
            _away_goals_decorators = [int()];
            _first_scorer_decorators = [text({ optional: true })];
            _points_decorators = [int({ optional: true })];
            _locked_decorators = [boolean()];
            _author_decorators = [text()];
            _createdAt_decorators = [date()];
            _user_id_decorators = [text()];
            __esDecorate(null, null, _id_decorators, { kind: "field", name: "id", static: false, private: false, access: { has: obj => "id" in obj, get: obj => obj.id, set: (obj, value) => { obj.id = value; } }, metadata: _metadata }, _id_initializers, _id_extraInitializers);
            __esDecorate(null, null, _match_id_decorators, { kind: "field", name: "match_id", static: false, private: false, access: { has: obj => "match_id" in obj, get: obj => obj.match_id, set: (obj, value) => { obj.match_id = value; } }, metadata: _metadata }, _match_id_initializers, _match_id_extraInitializers);
            __esDecorate(null, null, _home_goals_decorators, { kind: "field", name: "home_goals", static: false, private: false, access: { has: obj => "home_goals" in obj, get: obj => obj.home_goals, set: (obj, value) => { obj.home_goals = value; } }, metadata: _metadata }, _home_goals_initializers, _home_goals_extraInitializers);
            __esDecorate(null, null, _away_goals_decorators, { kind: "field", name: "away_goals", static: false, private: false, access: { has: obj => "away_goals" in obj, get: obj => obj.away_goals, set: (obj, value) => { obj.away_goals = value; } }, metadata: _metadata }, _away_goals_initializers, _away_goals_extraInitializers);
            __esDecorate(null, null, _first_scorer_decorators, { kind: "field", name: "first_scorer", static: false, private: false, access: { has: obj => "first_scorer" in obj, get: obj => obj.first_scorer, set: (obj, value) => { obj.first_scorer = value; } }, metadata: _metadata }, _first_scorer_initializers, _first_scorer_extraInitializers);
            __esDecorate(null, null, _points_decorators, { kind: "field", name: "points", static: false, private: false, access: { has: obj => "points" in obj, get: obj => obj.points, set: (obj, value) => { obj.points = value; } }, metadata: _metadata }, _points_initializers, _points_extraInitializers);
            __esDecorate(null, null, _locked_decorators, { kind: "field", name: "locked", static: false, private: false, access: { has: obj => "locked" in obj, get: obj => obj.locked, set: (obj, value) => { obj.locked = value; } }, metadata: _metadata }, _locked_initializers, _locked_extraInitializers);
            __esDecorate(null, null, _author_decorators, { kind: "field", name: "author", static: false, private: false, access: { has: obj => "author" in obj, get: obj => obj.author, set: (obj, value) => { obj.author = value; } }, metadata: _metadata }, _author_initializers, _author_extraInitializers);
            __esDecorate(null, null, _createdAt_decorators, { kind: "field", name: "createdAt", static: false, private: false, access: { has: obj => "createdAt" in obj, get: obj => obj.createdAt, set: (obj, value) => { obj.createdAt = value; } }, metadata: _metadata }, _createdAt_initializers, _createdAt_extraInitializers);
            __esDecorate(null, null, _user_id_decorators, { kind: "field", name: "user_id", static: false, private: false, access: { has: obj => "user_id" in obj, get: obj => obj.user_id, set: (obj, value) => { obj.user_id = value; } }, metadata: _metadata }, _user_id_initializers, _user_id_extraInitializers);
            __esDecorate(null, _classDescriptor = { value: _classThis }, _classDecorators, { kind: "class", name: _classThis.name, metadata: _metadata }, null, _classExtraInitializers);
            Prediction = _classThis = _classDescriptor.value;
            if (_metadata) Object.defineProperty(_classThis, Symbol.metadata, { enumerable: true, configurable: true, writable: true, value: _metadata });
            __runInitializers(_classThis, _classExtraInitializers);
        }
        id = __runInitializers(this, _id_initializers, void 0);
        /** StatsBomb match id, e.g. 69299. Matches match_events.match_id in the Eventhouse. */
        match_id = (__runInitializers(this, _id_extraInitializers), __runInitializers(this, _match_id_initializers, void 0));
        home_goals = (__runInitializers(this, _match_id_extraInitializers), __runInitializers(this, _home_goals_initializers, void 0));
        away_goals = (__runInitializers(this, _home_goals_extraInitializers), __runInitializers(this, _away_goals_initializers, void 0));
        /** Free-text first goalscorer; scored against the first is_goal event. */
        first_scorer = (__runInitializers(this, _away_goals_extraInitializers), __runInitializers(this, _first_scorer_initializers, void 0));
        /** Points awarded once the match ends; null while live. */
        points = (__runInitializers(this, _first_scorer_extraInitializers), __runInitializers(this, _points_initializers, void 0));
        locked = (__runInitializers(this, _points_extraInitializers), __runInitializers(this, _locked_initializers, void 0));
        /** Display name captured at write time so the leaderboard needs no lookup. */
        author = (__runInitializers(this, _locked_extraInitializers), __runInitializers(this, _author_initializers, void 0));
        createdAt = (__runInitializers(this, _author_extraInitializers), __runInitializers(this, _createdAt_initializers, void 0));
        /** Owner association, populated from the JWT `sub` claim. */
        user_id = (__runInitializers(this, _createdAt_extraInitializers), __runInitializers(this, _user_id_initializers, void 0));
        constructor() {
            __runInitializers(this, _user_id_extraInitializers);
        }
    };
    return Prediction = _classThis;
})();
export { Prediction };
