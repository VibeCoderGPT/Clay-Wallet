"""Regenerate clay-wallet-web.zip — the deploy-ready package.

Zip layout (drag the extracted contents onto Cloudflare Pages / Netlify):

    index.html  style.css  app.js  chains.js  vault.js  background.js  ...
    GO-LIVE.md  README.md

Run: python build-zip.py
"""

from __future__ import annotations

import pathlib
import sys
import zipfile

ROOT = pathlib.Path(__file__).resolve().parent
WEB = ROOT / "web"
OUT = ROOT / "clay-wallet-web.zip"


def main() -> int:
    with zipfile.ZipFile(OUT, "w", zipfile.ZIP_DEFLATED) as z:
        for f in sorted(WEB.rglob("*")):
            if f.is_file():
                z.write(f, f.relative_to(WEB))
        for doc in ("GO-LIVE.md", "README.md"):
            z.writestr(doc, (ROOT / doc).read_text(encoding="utf-8"))
    print(f"wrote {OUT.name} ({OUT.stat().st_size / 1024:.0f} KB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
