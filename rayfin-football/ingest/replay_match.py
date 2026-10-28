#!/usr/bin/env python3
"""
Replay a StatsBomb event file into a Fabric Eventstream as if the match were live.

Each event is flattened into a compact envelope and sent at the moment it happened
on the pitch, scaled by --speed. Period breaks are skipped (no 15-minute half-time
wait), so a 90-minute match at --speed 10 replays in about 9 minutes.

Usage:
    # Print the first 30 events to stdout, no Fabric needed
    python replay_match.py --events data/events_69299.json --dry-run --limit 30

    # Replay the full match at 10x into Eventstream
    python replay_match.py --events data/events_69299.json --speed 10

    # Jump straight to the second half
    python replay_match.py --events data/events_69299.json --speed 5 --start-minute 45

Connection: after fabric/deploy/deploy.py has run, nothing to set. The script reads the
Eventstream's custom endpoint connection string from the Fabric API with your `az login`
token, using the ids deploy.py recorded. Nothing is stored on disk.

To send somewhere else, set EVENTSTREAM_CONNECTION_STRING to a full connection string
(Endpoint=sb://...;SharedAccessKeyName=...;SharedAccessKey=...;EntityPath=...); it wins.
"""

from __future__ import annotations

import argparse
import json
import os
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Iterable

# Event types worth streaming for the live panels. Everything else (Ball Receipt*,
# Carry, Pressure, ...) is noise for a match centre and triples the payload.
DEFAULT_TYPES = {
    "Pass",
    "Shot",
    "Goal Keeper",
    "Dribble",
    "Duel",
    "Interception",
    "Ball Recovery",
    "Clearance",
    "Block",
    "Foul Committed",
    "Foul Won",
    "Bad Behaviour",
    "Substitution",
    "Starting XI",
    "Half Start",
    "Half End",
    "Own Goal For",
    "Own Goal Against",
}


def _ts_seconds(ts: str) -> float:
    """'00:05:30.776' -> 330.776"""
    h, m, s = ts.split(":")
    return int(h) * 3600 + int(m) * 60 + float(s)


def _xy(loc: Any) -> tuple[float | None, float | None]:
    if isinstance(loc, list) and len(loc) >= 2:
        return float(loc[0]), float(loc[1])
    return None, None


def flatten(ev: dict[str, Any], match_id: int, keep_freeze_frame: bool) -> dict[str, Any]:
    """Turn a StatsBomb event into a flat, Eventhouse-friendly record."""
    t = ev["type"]["name"]
    x, y = _xy(ev.get("location"))
    out: dict[str, Any] = {
        "match_id": match_id,
        "event_id": ev["id"],
        "index": ev["index"],
        "period": ev["period"],
        "minute": ev["minute"],
        "second": ev["second"],
        "match_clock": ev["timestamp"],
        "type": t,
        "team_id": ev["team"]["id"],
        "team": ev["team"]["name"],
        "possession_team": ev.get("possession_team", {}).get("name"),
        "player_id": (ev.get("player") or {}).get("id"),
        "player": (ev.get("player") or {}).get("name"),
        "position": (ev.get("position") or {}).get("name"),
        "play_pattern": (ev.get("play_pattern") or {}).get("name"),
        "under_pressure": bool(ev.get("under_pressure", False)),
        "x": x,
        "y": y,
    }

    if t == "Shot":
        s = ev.get("shot", {})
        ex, ey = _xy(s.get("end_location"))
        out.update(
            {
                "xg": s.get("statsbomb_xg"),
                "outcome": (s.get("outcome") or {}).get("name"),
                "body_part": (s.get("body_part") or {}).get("name"),
                "shot_type": (s.get("type") or {}).get("name"),
                "technique": (s.get("technique") or {}).get("name"),
                "end_x": ex,
                "end_y": ey,
                "is_goal": (s.get("outcome") or {}).get("name") == "Goal",
            }
        )
        if keep_freeze_frame and s.get("freeze_frame"):
            out["freeze_frame"] = [
                {
                    "x": f["location"][0],
                    "y": f["location"][1],
                    "player": f["player"]["name"],
                    "teammate": f["teammate"],
                }
                for f in s["freeze_frame"]
            ]

    elif t == "Pass":
        p = ev.get("pass", {})
        ex, ey = _xy(p.get("end_location"))
        out.update(
            {
                "recipient_id": (p.get("recipient") or {}).get("id"),
                "recipient": (p.get("recipient") or {}).get("name"),
                "pass_length": p.get("length"),
                "pass_angle": p.get("angle"),
                "pass_height": (p.get("height") or {}).get("name"),
                "pass_type": (p.get("type") or {}).get("name"),
                "body_part": (p.get("body_part") or {}).get("name"),
                # StatsBomb omits outcome on completed passes
                "outcome": (p.get("outcome") or {}).get("name") or "Complete",
                "end_x": ex,
                "end_y": ey,
                "is_cross": bool(p.get("cross", False)),
                "is_through_ball": bool(p.get("through_ball", False)),
                "is_assist": bool(p.get("goal_assist", False)),
                "is_key_pass": bool(p.get("shot_assist", False)),
            }
        )

    elif t == "Dribble":
        out["outcome"] = (ev.get("dribble", {}).get("outcome") or {}).get("name")

    elif t == "Duel":
        d = ev.get("duel", {})
        out["duel_type"] = (d.get("type") or {}).get("name")
        out["outcome"] = (d.get("outcome") or {}).get("name")

    elif t == "Foul Committed":
        fc = ev.get("foul_committed", {})
        out["card"] = (fc.get("card") or {}).get("name")

    elif t == "Bad Behaviour":
        out["card"] = (ev.get("bad_behaviour", {}).get("card") or {}).get("name")

    elif t == "Substitution":
        s = ev.get("substitution", {})
        out["replacement"] = (s.get("replacement") or {}).get("name")
        out["outcome"] = (s.get("outcome") or {}).get("name")

    elif t == "Goal Keeper":
        g = ev.get("goalkeeper", {})
        out["gk_type"] = (g.get("type") or {}).get("name")
        out["outcome"] = (g.get("outcome") or {}).get("name")

    return out


def load_events(path: Path, types: set[str] | None) -> list[dict[str, Any]]:
    events = json.loads(path.read_text(encoding="utf-8"))
    if types:
        events = [e for e in events if e["type"]["name"] in types]
    events.sort(key=lambda e: (e["period"], _ts_seconds(e["timestamp"]), e["index"]))
    return events


def schedule(events: Iterable[dict[str, Any]]) -> Iterable[tuple[float, dict[str, Any]]]:
    """
    Yield (delay_seconds_since_previous, event). Delays are computed within a period;
    the first event of each period starts immediately so breaks are skipped.
    """
    prev_period = None
    prev_t = 0.0
    for ev in events:
        t = _ts_seconds(ev["timestamp"])
        if ev["period"] != prev_period:
            delay = 0.0
            prev_period = ev["period"]
        else:
            delay = max(0.0, t - prev_t)
        prev_t = t
        yield delay, ev


def connection_string_from_fabric() -> str:
    """Read the custom endpoint's connection string live from the Fabric API.

    Uses fabric/deploy/_fabric.py and the ids in fabric/deploy/.state.json written by deploy.py.
    """
    deploy_dir = Path(__file__).resolve().parent.parent / "fabric" / "deploy"
    if not (deploy_dir / ".state.json").exists():
        sys.exit(
            "No Eventstream connection found.\n"
            "  Run fabric/deploy/deploy.py first (it records where the Eventstream is), or\n"
            "  set EVENTSTREAM_CONNECTION_STRING to the custom endpoint's full connection string, or\n"
            "  use --dry-run to print events without sending."
        )
    sys.path.insert(0, str(deploy_dir))
    import _fabric  # type: ignore

    cs = _fabric.eventstream_connection_string()
    print("# connection string read from the Fabric API", file=sys.stderr)
    return cs


class StdoutSink:
    def send(self, records: list[dict[str, Any]]) -> None:
        for r in records:
            print(json.dumps(r, ensure_ascii=False))

    def close(self) -> None:
        pass


class EventstreamSink:
    def __init__(self, connection_string: str) -> None:
        try:
            from azure.eventhub import EventData, EventHubProducerClient
        except ImportError:  # pragma: no cover
            sys.exit("pip install azure-eventhub  (or run with --dry-run)")
        self._EventData = EventData
        self._producer = EventHubProducerClient.from_connection_string(connection_string)

    def send(self, records: list[dict[str, Any]]) -> None:
        batch = self._producer.create_batch()
        for r in records:
            batch.add(self._EventData(json.dumps(r, ensure_ascii=False)))
        self._producer.send_batch(batch)

    def close(self) -> None:
        self._producer.close()


def main() -> None:
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("--events", required=True, type=Path, help="StatsBomb events JSON file")
    ap.add_argument("--match-id", type=int, help="Override match id (defaults to the number in the file name)")
    ap.add_argument("--speed", type=float, default=10.0, help="Replay speed multiplier (1 = real time)")
    ap.add_argument("--start-minute", type=int, default=0, help="Skip events before this match minute")
    ap.add_argument("--limit", type=int, help="Stop after N events")
    ap.add_argument("--all-types", action="store_true", help="Stream every event type, not just the curated set")
    ap.add_argument("--freeze-frame", action="store_true", help="Include shot freeze frames (bigger payload)")
    ap.add_argument("--dry-run", action="store_true", help="Print to stdout instead of sending; no delays")
    ap.add_argument("--no-wait", action="store_true", help="Send as fast as possible (backfill mode)")
    args = ap.parse_args()

    match_id = args.match_id or int("".join(ch for ch in args.events.stem if ch.isdigit()))
    events = load_events(args.events, None if args.all_types else DEFAULT_TYPES)
    events = [e for e in events if e["minute"] >= args.start_minute]
    if args.limit:
        events = events[: args.limit]

    if args.dry_run:
        sink: StdoutSink | EventstreamSink = StdoutSink()
    else:
        cs = os.environ.get("EVENTSTREAM_CONNECTION_STRING") or connection_string_from_fabric()
        sink = EventstreamSink(cs)

    print(
        f"# match {match_id}: {len(events)} events, speed {args.speed}x"
        + (" (dry run)" if args.dry_run else ""),
        file=sys.stderr,
    )

    sent = 0
    started = time.monotonic()
    try:
        for delay, ev in schedule(events):
            if not (args.dry_run or args.no_wait) and delay > 0:
                time.sleep(delay / args.speed)
            rec = flatten(ev, match_id, args.freeze_frame)
            # Envelope matches raw_events (match_id, emitted_at, content) by column name, which is
            # how Eventstream's "Event processing before ingestion" mode maps JSON to a table.
            envelope = {
                "match_id": match_id,
                "emitted_at": datetime.now(timezone.utc).isoformat(),
                "content": rec,
            }
            sink.send([envelope])
            sent += 1
            if sent % 100 == 0:
                print(f"# {sent}/{len(events)}  {ev['minute']:02d}:{ev['second']:02d}", file=sys.stderr)
    except KeyboardInterrupt:
        print("# interrupted", file=sys.stderr)
    finally:
        sink.close()

    print(f"# done: {sent} events in {time.monotonic() - started:.1f}s", file=sys.stderr)


if __name__ == "__main__":
    main()
