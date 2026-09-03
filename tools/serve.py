#!/usr/bin/env python3
"""Serve the shadowing tool locally.

A plain static server is not enough here:

* ONNX Runtime's multi-threaded wasm build needs SharedArrayBuffer, which the
  browser only hands out to a cross-origin-isolated page (COOP + COEP).
  Without these headers inference still runs, just single-threaded and slower.
* .wasm must arrive as application/wasm or streaming compilation is refused,
  and .mjs must be a JavaScript type or the worker's dynamic import fails.

Usage:  ./tools/serve.py [--port 8000] [--no-isolation]
"""

from __future__ import annotations

import argparse
import functools
import http.server
import os
import socketserver
import sys
import webbrowser
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent

EXTRA_TYPES = {
    ".js": "text/javascript",
    ".mjs": "text/javascript",
    ".json": "application/json",
    ".wasm": "application/wasm",
    ".onnx": "application/octet-stream",
    ".bin": "application/octet-stream",
    ".css": "text/css",
    ".html": "text/html",
}


class Handler(http.server.SimpleHTTPRequestHandler):
    isolate = True
    # Keep-alive matters: loading the model pulls the weights plus ~30 voice
    # files, and HTTP/1.0 would reconnect for every one of them.
    protocol_version = "HTTP/1.1"

    extensions_map = {
        **http.server.SimpleHTTPRequestHandler.extensions_map,
        **EXTRA_TYPES,
    }

    def end_headers(self) -> None:
        if self.isolate:
            self.send_header("Cross-Origin-Opener-Policy", "same-origin")
            self.send_header("Cross-Origin-Embedder-Policy", "require-corp")
            self.send_header("Cross-Origin-Resource-Policy", "same-origin")
        # The model files are large and immutable; everything else is source
        # under active editing, so keep it uncached.
        path = self.path.split("?", 1)[0]
        if path.startswith("/vendor/"):
            self.send_header("Cache-Control", "public, max-age=31536000, immutable")
        else:
            self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def log_message(self, fmt: str, *args) -> None:
        # Loading the model hits 30+ vendor files; that is not worth logging.
        if getattr(self, "path", "").startswith("/vendor/"):
            return
        super().log_message(fmt, *args)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--port", type=int, default=8000)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument(
        "--no-isolation",
        action="store_true",
        help="drop the COOP/COEP headers (slower wasm, but easier to debug)",
    )
    parser.add_argument("--no-browser", action="store_true")
    args = parser.parse_args()

    if not (ROOT / "index.html").exists():
        print(f"index.html が見つかりません: {ROOT}", file=sys.stderr)
        return 1

    if not (ROOT / "vendor" / "manifest.json").exists():
        print("注意: vendor/ が未準備です。先に ./tools/setup.sh を実行してください。\n")

    Handler.isolate = not args.no_isolation
    os.chdir(ROOT)

    socketserver.TCPServer.allow_reuse_address = True
    handler = functools.partial(Handler, directory=str(ROOT))

    try:
        with socketserver.ThreadingTCPServer((args.host, args.port), handler) as httpd:
            url = f"http://{args.host}:{args.port}/"
            print(f"シャドーイングツールを起動しました: {url}")
            print("停止するには Control-C\n")
            if not args.no_browser:
                webbrowser.open(url)
            httpd.serve_forever()
    except KeyboardInterrupt:
        print("\n停止しました")
    except OSError as error:
        print(f"起動できませんでした: {error}", file=sys.stderr)
        print(f"別のポートを試してください: ./tools/serve.py --port {args.port + 1}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
