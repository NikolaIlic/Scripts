"""Step 7 - build the React app and deploy it as a Fabric App item with the Rayfin CLI.

Runs, from the repo root:

    npm install                       (only when node_modules is missing)
    npx rayfin login                  (only when not signed in; opens a browser once)
    npx rayfin up --workspace-id <workspace> --tenant <tenant> --yes

`rayfin up` creates the Fabric App item on first run, provisions the SQL database from the
entities in rayfin/data (Prediction, ScoutingNote, WatchedMatch), publishes the GraphQL API,
builds the app and uploads it as static hosting. The item id is kept in
rayfin/.deployments.json, so later runs update the same item instead of creating a new one.
"""

import shutil
import subprocess
import sys
from pathlib import Path

from _fabric import REPO, tenant, workspace


def tool(name: str) -> str:
    found = shutil.which(name) or shutil.which(name + ".cmd")
    if not found:
        sys.exit(f"{name} not found on PATH - install Node.js 20+ (https://nodejs.org) and re-run.")
    return found


def run(args: list[str], check: bool = True) -> int:
    print("  $ " + " ".join([Path(args[0]).stem] + args[1:]))
    result = subprocess.run(args, cwd=REPO)
    if check and result.returncode != 0:
        sys.exit(f"command failed with exit code {result.returncode}")
    return result.returncode


def main() -> None:
    npm, npx = tool("npm"), tool("npx")

    if not (REPO / "node_modules").exists():
        run([npm, "install", "--no-audit", "--no-fund"])

    signed_in = subprocess.run(
        [npx, "rayfin", "login", "status"], cwd=REPO, capture_output=True, text=True
    )
    if signed_in.returncode != 0:
        run([npx, "rayfin", "login", "--tenant", tenant()])

    run([npx, "rayfin", "up", "--workspace-id", workspace(), "--tenant", tenant(), "--yes"])
    print("app deployed - open the workspace in Fabric and select the app item")


if __name__ == "__main__":
    main()
