# Rayfin football match centre

A Fabric App (Rayfin) for live football analytics. A real match is replayed into a Fabric
Real-Time Intelligence Eventhouse as if it were happening now; the app shows the xG race,
momentum, shot map and key moments as they land, and lets signed-in users submit predictions
and scouting notes that persist in the Rayfin data service.

The demo match is Barcelona 5-0 Real Madrid, 29 November 2010, from StatsBomb open data.

```
ingest/replay_match.py  ->  Eventstream (custom endpoint)  ->  Eventhouse raw_events
                                                                   | update policy
                                                                   v
                                                             match_events + KQL functions
                                                                   |
                                               DirectQuery semantic model (one table per function)
                                                                   |
                                      Rayfin app (React) <- DAX via host bridge / connector / REST
                                             |
                                  Rayfin data service: Prediction, ScoutingNote, WatchedMatch
```

## What is in the repo

| Path | Purpose |
| --- | --- |
| `ingest/replay_match.py` | Replays a StatsBomb events file into Eventstream at a chosen speed. Dry-run mode prints JSON. |
| `ingest/data/` | Events and lineups for match 69299. |
| `fabric/eventhouse/DatabaseSchema.kql` | Landing table, typed table with update policy, and the match-centre functions. |
| `fabric/eventstream/` | Eventstream definition: custom endpoint source to Eventhouse destination. |
| `fabric/semantic-model/` | The DirectQuery model the app queries, as TMDL. |
| `fabric/deploy/` | One-command deployment of everything above plus the app (`deploy.py`), and `08_verify.py`. |
| `rayfin/` | Rayfin config and entities (`Prediction`, `ScoutingNote`, `WatchedMatch`), connector schema. |
| `src/` | React app: hooks over DAX, charts, predictions panel. Query transport is in `src/services`. |

## Quick start

You need Python 3.10+, Node.js 20+, the Azure CLI, a workspace on a Fabric capacity, and the
Fabric apps tenant setting turned on. Copy the tenant id and workspace id from the workspace URL
(`app.fabric.microsoft.com/groups/<workspace-id>/...?ctid=<tenant-id>`).

```powershell
az login --tenant <tenant-id>
pip install -r ingest/requirements.txt
python fabric/deploy/deploy.py --tenant-id <tenant-id> --workspace-id <workspace-id>
```

That creates the Eventhouse, KQL schema, Eventstream, semantic model and credentials, writes
the model id into the app, and deploys the app with `rayfin up`. Items that already exist under
the default names (`EH_Football`, `ES_MatchEvents`, `Football_Model`) are reused. Add
`--dry-run` to see the plan first.

Then replay the match and check the whole chain:

```powershell
python ingest/replay_match.py --events ingest/data/events_69299.json --speed 10
python fabric/deploy/08_verify.py
```

The replay reads the Eventstream connection string from the Fabric API, so there is nothing to
copy. Open the app item in the workspace and watch it go live.

The manual steps below are what `deploy.py` automates; follow them only to understand or
debug a step.

## Setup by hand

1. **Fabric workspace** with a capacity and Fabric Apps enabled in the admin portal.

2. **Eventhouse**: create one, open the KQL database, run `fabric/eventhouse/DatabaseSchema.kql`
   as a script. Check: `.show functions` lists `Scoreline`, `XgRace`, `Momentum`, `ShotMap`,
   `PassNetwork`, `PlayerStats`, `KeyMoments`.

3. **Eventstream**: create one with a Custom endpoint source and an Eventhouse destination
   pointing at `raw_events` with mapping `raw_events_mapping` (or import
   `fabric/eventstream/eventstream.json`). Copy the source's connection string.

4. **Replay**:
   ```bash
   pip install -r ingest/requirements.txt
   export EVENTSTREAM_CONNECTION_STRING="Endpoint=sb://...;EntityPath=..."
   python ingest/replay_match.py --events ingest/data/events_69299.json --speed 10
   ```
   At 10x the match takes about 9 minutes. Use `--speed 50` to backfill quickly or `--no-wait`
   to load everything at once. `--start-minute 45` jumps to the second half.

   Verify in KQL: `Scoreline(69299)` should end at Barcelona 5 goals / xG 2.77 / 723 passes
   (88.1%), Real Madrid 0 / 0.13 / 371 (73.9%).

5. **Semantic model**: follow `fabric/semantic-model/README.md`. Note its item id.

6. **App**:
   ```bash
   npm install
   cp .env.example .env.local.overrides   # set VITE_PBI_DATASET_ID (+ client/tenant for standalone)
   npm run dev                             # rayfin up (auth + data), then vite on :5173
   npx rayfin up                           # full deploy incl. static hosting
   ```
   Fill in `matchModel` ids in `rayfin/rayfin.yml` if you want the server-side connector transport.

7. Open the app, submit a prediction before starting the replay, then start it and watch the
   header flip to LIVE.

## Demo script (10 minutes)

1. App open, 0-0, prediction form visible. Have the room predict the score.
2. Start `replay_match.py --speed 10`. First events land within seconds.
3. Xavi 9', Pedro 17' - xG race separates, shot map fills the right half.
4. Switch to the KQL queryset mid-match: `Momentum(69299)` live, `PlayerStats(69299)` for Messi's
   progressive passes.
5. Second half: Villa 54' and 57'. Momentum chart is one-sided by now.
6. Show predictions leaderboard; nobody had 5-0.
7. Optional: Activator rule on `match_events | where is_goal` to Teams, Data Agent over the
   semantic model ("who had the most progressive passes in the second half").

## Next steps

- `WatchedMatch` seeding and a match picker instead of the hard-coded id in `src/App.tsx`.
- Scouting notes UI (entity exists, no panel yet).
- Settle predictions: a Fabric User Data Function on Half End of period 2 writing `points`.
- Pass network panel (KQL function and DAX query exist, no component yet).
- Activator alerts on goals, cards, xG swings.

## Licensing

Match data is StatsBomb open data, released for non-commercial use with attribution
(https://github.com/statsbomb/open-data). Fine for demos and talks; not for a paid product.

`src/services/*` and the build config are adapted from the MIT-licensed Helsinki Public Transport
template in microsoft/awesome-rayfin; see `THIRD_PARTY_LICENSE_helsinki_template.txt`.
