"""Step 6 - point the Rayfin app at the semantic model.

Writes the two places the app reads the model id from, so nobody has to paste GUIDs by hand:

  * `.env.production.local` and `.env.development.local` at the repo root - VITE_PBI_DATASET_ID,
    which Vite reads for `vite build` and `vite` respectively. Not `.env.local`: `rayfin env`
    regenerates that file on every dev/build run.
  * `rayfin/rayfin.yml` - workspaceId and itemId of the `matchModel` connector, the server-side
    transport. Only the two GUID lines under that connector are touched.

Re-running is safe: both files are rewritten with the current ids.
"""

import re

from _fabric import REPO, need, tenant, workspace

ENV_FILES = [REPO / ".env.production.local", REPO / ".env.development.local"]
RAYFIN_YML = REPO / "rayfin" / "rayfin.yml"


def write_env_files(model_id: str) -> None:
    for path in ENV_FILES:
        lines = {}
        if path.exists():
            for line in path.read_text(encoding="utf-8").splitlines():
                if "=" in line and not line.lstrip().startswith("#"):
                    key, value = line.split("=", 1)
                    lines[key.strip()] = value.strip()
        lines["VITE_PBI_DATASET_ID"] = model_id
        lines.setdefault("VITE_PBI_TENANT_ID", tenant())
        body = "# Written by fabric/deploy/06_configure_app.py\n" + "".join(
            f"{key}={value}\n" for key, value in lines.items()
        )
        path.write_text(body, encoding="utf-8")
        print(f"wrote {path.name}: VITE_PBI_DATASET_ID={model_id}")


def patch_connector(model_id: str) -> None:
    text = RAYFIN_YML.read_text(encoding="utf-8")
    block = re.search(r"(?ms)^  matchModel:\n.*?(?=^  \S|\Z)", text)
    if not block:
        print("rayfin.yml has no matchModel connector - skipped (the app falls back to the host bridge)")
        return
    patched = re.sub(r"(workspaceId:\s*)\S+", rf"\g<1>{workspace()}", block.group(0), count=1)
    patched = re.sub(r"(itemId:\s*)\S+", rf"\g<1>{model_id}", patched, count=1)
    RAYFIN_YML.write_text(text.replace(block.group(0), patched), encoding="utf-8")
    print(f"patched rayfin.yml matchModel connector: workspace {workspace()}, model {model_id}")


def main() -> None:
    model_id = need("semantic_model_id")
    write_env_files(model_id)
    patch_connector(model_id)


if __name__ == "__main__":
    main()
