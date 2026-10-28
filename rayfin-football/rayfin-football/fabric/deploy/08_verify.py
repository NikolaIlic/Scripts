"""Step 8 - verify the chain end to end, in the order that localises a fault.

  1. Eventstream topology - every node Running. Pausing the capacity pauses the Eventhouse
     destination and resuming the capacity does not resume it; pass --resume to fix that.
  2. Kusto - raw_events and match_events row counts and Scoreline(<match>).
  3. DAX - the query the app issues, through executeQueries on the semantic model.

Run it after a replay: with no events yet, steps 2 and 3 report empty tables, not a failure.
"""

import argparse
import json

from _fabric import (
    FABRIC_API,
    POWERBI_API,
    POWERBI_RESOURCE,
    call,
    kusto,
    need,
    workspace,
)


def check_eventstream(resume: bool) -> bool:
    eventstream_id = need("eventstream_id")
    status, _headers, topology = call(
        "GET", f"{FABRIC_API}/workspaces/{workspace()}/eventstreams/{eventstream_id}/topology"
    )
    if status != 200:
        print(f"  topology unreadable: HTTP {status}")
        return False
    nodes = [
        (kind, node.get("name"), node.get("status"))
        for kind in ("sources", "streams", "destinations")
        for node in topology.get(kind, [])
    ]
    for kind, name, state in nodes:
        print(f"  {'ok  ' if state == 'Running' else 'STOP'} {kind[:-1]:12} {name:32} {state}")
    paused = [n for n in nodes if n[2] != "Running"]
    if paused and resume:
        status, _headers, body = call(
            "POST",
            f"{FABRIC_API}/workspaces/{workspace()}/eventstreams/{eventstream_id}/resume",
            {"startType": "Now"},
        )
        print(f"  resume: HTTP {status}; nodes reach Running in about 30 s, re-run to confirm")
    elif paused:
        print("  -> pass --resume to restart the eventstream")
    return not paused


def check_kusto(match_id: int) -> bool:
    for table in ("raw_events", "match_events"):
        status, rows, _cols = kusto(f"{table} | count")
        if status != 200:
            print(f"  {table}: query failed HTTP {status} {json.dumps(rows)[:300]}")
            return False
        print(f"  {table:13} {rows[0][0]} rows")
    status, rows, cols = kusto(f"Scoreline({match_id}) | project team, goals, shots, xg, passes, pass_pct")
    if status != 200:
        print(f"  Scoreline failed: HTTP {status} {json.dumps(rows)[:300]}")
        return False
    if not rows:
        print("  Scoreline is empty - run the replay first")
        return True
    for row in rows:
        print("  " + ", ".join(f"{c}={v}" for c, v in zip(cols, row)))
    return True


def check_dax(match_id: int) -> bool:
    model_id = need("semantic_model_id")
    dax = f"DEFINE MPARAMETER 'Match_Id' = {match_id}\nEVALUATE 'Scoreline'"
    status, _headers, body = call(
        "POST",
        f"{POWERBI_API}/groups/{workspace()}/datasets/{model_id}/executeQueries",
        {"queries": [{"query": dax}], "serializerSettings": {"includeNulls": True}},
        resource=POWERBI_RESOURCE,
    )
    if status != 200:
        print(f"  executeQueries failed: HTTP {status} {json.dumps(body)[:400]}")
        print("  -> HTTP 400 DatasetExecuteQueriesError usually means step 5 (credentials) did not run")
        return False
    rows = body["results"][0]["tables"][0].get("rows", [])
    print(f"  {len(rows)} row(s) from the semantic model")
    for row in rows:
        print("  " + json.dumps(row)[:200])
    return True


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--match-id", type=int, default=69299)
    parser.add_argument("--resume", action="store_true", help="resume the eventstream if paused")
    args = parser.parse_args()

    results = []
    for label, check in (
        ("eventstream", lambda: check_eventstream(args.resume)),
        ("kusto", lambda: check_kusto(args.match_id)),
        ("semantic model", lambda: check_dax(args.match_id)),
    ):
        print(f"\n== {label}")
        results.append((label, check()))
    print()
    for label, ok in results:
        print(f"{'PASS' if ok else 'FAIL'}  {label}")
    if not all(ok for _label, ok in results):
        raise SystemExit(1)


if __name__ == "__main__":
    main()
