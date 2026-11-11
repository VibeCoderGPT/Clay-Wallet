"""Local preview server for Clay Wallet.

Standard library only — serves the static app out of ``web/``.

    python server.py                 # http://127.0.0.1:8777
    python server.py --port 9000
    python server.py --no-browser
"""

from __future__ import annotations

import argparse
import mimetypes
import os
import sys
import threading
import webbrowser
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from urllib.parse import urlparse

WEB_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "web")

# Match the production security headers (see web/_headers).
SECURITY_HEADERS = {
    "X-Frame-Options": "DENY",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=(), payment=()",
    "Cross-Origin-Opener-Policy": "same-origin",
    "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data:; connect-src 'self' https:; object-src 'none'; base-uri 'self'; form-action 'none'",
}


class Handler(BaseHTTPRequestHandler):
    server_version = "ClayWallet/1.0"

    def _send_file(self, rel_path: str) -> None:
        safe = os.path.normpath(rel_path).lstrip("\\/")
        full = os.path.join(WEB_DIR, safe)
        if not os.path.abspath(full).startswith(os.path.abspath(WEB_DIR)):
            self._send_json({"error": "forbidden"}, 403)
            return
        if not os.path.isfile(full):
            self._send_json({"error": "not found", "path": safe}, 404)
            return
        ctype, _ = mimetypes.guess_type(full)
        if ctype is None:
            ctype = "application/octet-stream"
        with open(full, "rb") as fh:
            body = fh.read()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        for k, v in SECURITY_HEADERS.items():
            self.send_header(k, v)
        self.end_headers()
        self.wfile.write(body)

    def _send_json(self, obj, status: int = 200) -> None:
        import json
        body = json.dumps(obj).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self) -> None:  # noqa: N802
        route = urlparse(self.path).path
        if route in ("/", "/index.html"):
            self._send_file("index.html")
            return
        self._send_file(route.lstrip("/") or "index.html")

    def log_message(self, fmt, *args):  # quieter console
        sys.stderr.write("  %s\n" % (fmt % args))


def main(argv=None) -> int:
    parser = argparse.ArgumentParser(description="Clay Wallet preview server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8777)
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args(argv)

    url = f"http://{args.host}:{args.port}/"
    print("=" * 56)
    print("  CLAY WALLET  —  soft & squishy crypto wallet (demo)")
    print("=" * 56)
    print(f"  url   : {url}")
    print("  ctrl-c to stop\n")

    if not args.no_browser:
        threading.Timer(1.0, lambda: webbrowser.open(url)).start()

    httpd = ThreadingHTTPServer((args.host, args.port), Handler)
    try:
        httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n  stopped")
    finally:
        httpd.server_close()
    return 0


if __name__ == "__main__":
    sys.exit(main())
