"""Step 2 - apply DatabaseSchema.kql to the KQL database.

The schema file is a single `.execute database script` block, sent as one management command; the
engine runs the commands inside it in order and stops at the first failure.

Every command is idempotent, so re-running this step is safe.

Note the token audience: `https://kusto.fabric.microsoft.com` is not registered in every tenant.
The *cluster URI* is used as the resource instead.
"""

import json
import re

from _fabric import REPO, call, need

SCHEMA = REPO / "fabric" / "eventhouse" / "DatabaseSchema.kql"


def split_commands(text: str) -> list[str]:
    without_comments = "\n".join(
        line for line in text.splitlines() if not line.strip().startswith("//")
    )
    # DatabaseSchema.kql is one `.execute database script` block: the commands inside it also start
    # with a dot, so splitting would tear the script apart. Send it whole.
    if without_comments.lstrip().startswith(".execute database script"):
        return [without_comments.strip()]
    # Otherwise a new command always starts at the beginning of a line with a dot.
    parts = re.split(r"(?m)^(?=\.)", without_comments)
    return [part.strip() for part in parts if part.strip()]


def main() -> None:
    cluster = need("kusto_cluster")
    database = need("kql_database_name")

    commands = split_commands(SCHEMA.read_text(encoding="utf-8"))
    print(f"applying {len(commands)} commands to {database}")

    failures = 0
    for index, command in enumerate(commands):
        status, _headers, body = call(
            "POST",
            f"{cluster}/v1/rest/mgmt",
            {"db": database, "csl": command},
            resource=cluster,
        )
        headline = command.splitlines()[0][:88]
        if status == 200 and isinstance(body, dict) and body.get("Tables"):
            # .execute database script returns one row per inner command with its result.
            table = body["Tables"][0]
            names = [c["ColumnName"] for c in table["Columns"]]
            for row in table["Rows"]:
                record = dict(zip(names, row))
                result = record.get("Result", "")
                text = (record.get("CommandText") or "").strip().splitlines()[0][:80]
                print(f"      {result:10} {text}")
                if result and result != "Completed":
                    failures += 1
                    print("        " + str(record.get("Reason", ""))[:400])
        if status == 200:
            print(f"  [{index}] ok   {headline}")
        else:
            failures += 1
            print(f"  [{index}] FAIL {status} {headline}")
            print("        " + json.dumps(body)[:400])

    if failures:
        raise SystemExit(f"{failures} command(s) failed")
    print("schema applied")


if __name__ == "__main__":
    main()
