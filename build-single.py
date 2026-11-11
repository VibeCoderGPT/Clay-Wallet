"""Build the self-contained single-file Clay-Wallet.html.

Inlines style.css, the vendored ethers/qrcode scripts, and the whole ES-module
app (app.js + chains.js + vault.js + background.js + three.module.js +
three.core.js) bundled into one IIFE with esbuild.

Requires node + esbuild in node_modules (run: pnpm install). Then:

    python build-single.py
"""

from __future__ import annotations

import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent
WEB = ROOT / "web"
OUT = ROOT / "Clay-Wallet.html"


def find_esbuild() -> tuple[pathlib.Path, bool]:
    """Locate esbuild: prefer the native binary, fall back to the node wrapper.

    Returns (path, is_native_binary).
    """
    native = sorted(
        ROOT.glob(
            "node_modules/.pnpm/@esbuild+win32-x64@*/node_modules/@esbuild/"
            "win32-x64/esbuild.exe"
        )
    )
    if native:
        return native[0], True
    store = sorted(ROOT.glob("node_modules/.pnpm/esbuild@*/node_modules/esbuild/bin/esbuild"))
    if store:
        return store[0], False
    for c in (
        ROOT / "node_modules" / "esbuild" / "bin" / "esbuild",
        ROOT / "node_modules" / ".bin" / "esbuild",
    ):
        if c.exists():
            return c, False
    sys.exit("esbuild not found in node_modules — run: pnpm install")


def bundle_app(esbuild: pathlib.Path, native: bool) -> str:
    cmd = (
        [str(esbuild)]
        if native
        else ["node", str(esbuild)]
    )
    cmd += [
        str(WEB / "app.js"),
        "--bundle", "--format=iife", "--platform=browser",
        "--external:ethers", "--external:QRCodeLib",
        "--minify", "--log-level=warning",
    ]
    proc = subprocess.run(cmd, capture_output=True, text=True)
    if proc.returncode != 0:
        sys.exit("esbuild failed:\n" + proc.stderr)
    return proc.stdout


def escape_script(js: str) -> str:
    # Prevent an inlined script from closing its own <script> tag.
    return js.replace("</script", "<\\/script")


def main() -> int:
    esbuild, native = find_esbuild()
    html = (WEB / "index.html").read_text(encoding="utf-8")
    css = (WEB / "style.css").read_text(encoding="utf-8")
    ethers = (WEB / "vendor" / "ethers.js").read_text(encoding="utf-8")
    qrcode = (WEB / "vendor" / "qrcode.js").read_text(encoding="utf-8")
    bundle = bundle_app(esbuild, native)

    html = html.replace(
        '<link rel="stylesheet" href="style.css">',
        "<style>\n" + css + "\n</style>",
    )

    # External-file links that don't make sense in a single file:
    html = html.replace('<link rel="manifest" href="/manifest.webmanifest">', "")
    html = html.replace('<link rel="apple-touch-icon" href="/icons/icon-192.png">', "")

    html = html.replace(
        '<script src="vendor/ethers.js"></script>',
        "<script>\n" + escape_script(ethers) + "\n</script>",
    )
    html = html.replace(
        '<script src="vendor/qrcode.js"></script>',
        "<script>\n" + escape_script(qrcode) + "\n</script>",
    )
    html = html.replace(
        '<script type="module" src="app.js"></script>',
        "<script>\n" + escape_script(bundle) + "\n</script>",
    )

    OUT.write_text(html, encoding="utf-8")
    print(f"wrote {OUT.name} ({OUT.stat().st_size / 1024 / 1024:.1f} MB)")
    return 0


if __name__ == "__main__":
    sys.exit(main())
