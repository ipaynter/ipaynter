#!/usr/bin/env python3
"""Ivan is Ivan - Live Mixer local server (Mac / Linux).

Serves the mixer on http://localhost:8765 (this computer only) and relays
Stream Deck button presses to the mixer page.

  /api/cmd/<name>?k=<key>  Stream Deck "Website" action (GET in background)
  /api/poll                 mixer page picks up pending commands
  /api/info                 mixer page reads the control key
"""
import http.server
import json
import os
import re
import secrets
import threading
import webbrowser
from urllib.parse import urlparse, parse_qs

PORT = 8765
ROOT = os.path.dirname(os.path.abspath(__file__))
KEY_FILE = os.path.join(ROOT, "control-key.txt")

if os.path.exists(KEY_FILE):
    with open(KEY_FILE) as f:
        KEY = f.read().strip()
else:
    KEY = secrets.token_hex(8)
    with open(KEY_FILE, "w") as f:
        f.write(KEY)

ALLOWED_HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}
CMD_RE = re.compile(r"^[A-Za-z0-9]{1,24}$")
pending = []
lock = threading.Lock()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass

    def send_json(self, obj, status=200):
        body = json.dumps(obj).encode()
        self.send_response(status)
        self.send_header("Content-Type", "application/json")
        self.send_header("Cache-Control", "no-store")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_GET(self):
        # Blocks DNS-rebinding: only answer requests addressed to localhost.
        if self.headers.get("Host", "") not in ALLOWED_HOSTS:
            return self.send_error(403)
        url = urlparse(self.path)
        path = url.path

        if path == "/api/info":
            return self.send_json({"key": KEY})
        if path == "/api/poll":
            with lock:
                cmds = pending[:]
                pending.clear()
            return self.send_json(cmds)
        if path.startswith("/api/cmd/"):
            name = path[len("/api/cmd/"):]
            if parse_qs(url.query).get("k", [""])[0] != KEY:
                return self.send_json({"error": "bad key"}, 403)
            if not CMD_RE.match(name):
                return self.send_json({"error": "bad command"}, 400)
            with lock:
                if len(pending) < 50:
                    pending.append(name)
            return self.send_json({"ok": True, "cmd": name})
        if path.startswith("/api/") or path.endswith((".py", ".ps1", ".bat", ".sh", ".txt")):
            return self.send_error(404)
        return super().do_GET()


def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/"
    print(f"Ivan is Ivan - Live Mixer running at {url}")
    print("Keep this window open during the show. Press Ctrl+C to stop.")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
