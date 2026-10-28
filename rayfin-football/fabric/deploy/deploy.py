#!/usr/bin/env python3
"""Deploy the whole football match centre into one Fabric workspace.

    az login --tenant <tenant-id>
    python fabric/deploy/deploy.py --tenant-id <tenant-id> --workspace-id <workspace-id>

Steps, each idempotent (an item that already exists under the configured name is reused):

    1  Eventhouse + KQL database            01_eventhouse.py
    2  KQL schema, policies, functions      02_kql_schema.py
    3  Eventstream -> raw_events            03_eventstream.py
    4  DirectQuery semantic model (TMDL)    04_semantic_model.py
    5  Model credentials (end-user SSO)     05_bind_credentials.py
    6  App config (model id into the app)   06_configure_app.py
    7  Rayfin app build + deploy            07_deploy_app.py

Then replay the match (no connection string needed) and verify:

    python ingest/replay_match.py --events ingest/data/events_69299.json --speed 10
    python fabric/deploy/08_verify.py

Options:
    --from N      start at step N (e.g. --from 4 after fixing the model)
    --only N      run just step N
    --skip-app    stop after step 6 (Fabric side only)
    --dry-run     print the plan and the configuration, change nothing

Prerequisites: Python 3.10+, Azure CLI (`az`), Node.js 20+, a workspace on a Fabric capacity,
and the tenant setting that enables Fabric apps. Your account needs Admin or Member on the
workspace.
"""

from __future__ import annotations

import argparse
import os
import runpy
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))

STEPS = [
    (1, "Eventhouse and KQL database", "01_eventhouse.py"),
    (2, "KQL schema, policies and functions", "02_kql_schema.py"),
    (3, "Eventstream into raw_events", "03_eventstream.py"),
    (4, "DirectQuery semantic model", "04_semantic_model.py"),
    (5, "Semantic model credentials", "05_bind_credentials.py"),
    (6, "App configuration", "06_configure_app.py"),
    (7, "Rayfin app build and deploy", "07_deploy_app.py"),
]


def main() -> None:
    parser = argparse.ArgumentParser(
        description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter
    )
    parser.add_argument("--tenant-id", help="Entra tenant GUID (remembered after the first run)")
    parser.add_argument("--workspace-id", help="Fabric workspace GUID (remembered after the first run)")
    parser.add_argument("--from", dest="start", type=int, default=1)
    parser.add_argument("--only", type=int)
    parser.add_argument("--skip-app", action="store_true")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    import _fabric  # noqa: E402  (after sys.path insert)

    if args.tenant_id:
        os.environ["FABRIC_TENANT_ID"] = args.tenant_id
    if args.workspace_id:
        os.environ["FABRIC_WORKSPACE_ID"] = args.workspace_id

    tenant = _fabric.tenant()
    workspace = _fabric.workspace()
    if not args.dry_run:
        _fabric.save_state(tenant_id=tenant, workspace_id=workspace)

    steps = [s for s in STEPS if s[0] >= args.start]
    if args.only:
        steps = [s for s in STEPS if s[0] == args.only]
    if args.skip_app:
        steps = [s for s in steps if s[0] != 7]

    print(f"tenant     {tenant}")
    print(f"workspace  {workspace}")
    print("items      " + ", ".join(f"{k}={v()}" for k, v in _fabric.NAMES.items()))
    print("plan       " + "  ".join(f"{n}. {label}" for n, label, _f in steps))
    if args.dry_run:
        print("\ndry run - nothing changed")
        return

    for number, label, filename in steps:
        print(f"\n=== {number}. {label}")
        runpy.run_path(str(HERE / filename), run_name="__main__")

    print("\nDone. Replay the match and verify:")
    print("  python ingest/replay_match.py --events ingest/data/events_69299.json --speed 10")
    print("  python fabric/deploy/08_verify.py")


if __name__ == "__main__":
    main()
