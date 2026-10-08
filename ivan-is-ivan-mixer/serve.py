#!/usr/bin/env python3
"""Late Night with Ivan - DJ Board local server (Mac / Linux).

Serves the mixer on http://localhost:8765 (this computer only) and:
  /api/cmd/<name>?k=<key>  Stream Deck "Website" action (GET in background)
  /api/poll                mixer page picks up pending commands
  /api/info                mixer page reads the control key and app version
  /api/save  (POST)        mixer saves its data to data/mixer-data.json (+ daily copy)
  /api/load                mixer restores from the disk copy
  /api/channel?h=|c=       a creator's channel ID and profile picture
  /api/feed?c=<channelId>  a creator's latest uploads (YouTube's public RSS feed)
  /api/playlist?list=<id>  the video IDs of a public or unlisted playlist, in order
  /api/overlay (POST)      stores a picture or short video for the share page (data/overlays)
  /overlay/<name>          serves a stored overlay
"""
import datetime
import glob
import http.server
import json
import os
import re
import secrets
import shutil
import hashlib
import threading
import urllib.request
import webbrowser
from urllib.parse import urlparse, parse_qs

PORT = 8765
ROOT = os.path.dirname(os.path.abspath(__file__))
# Your data (songs, backups, overlays, Stream Deck key): the LNWI_DATA folder, else "data" here.
DATA_DIR = os.path.abspath(os.environ.get("LNWI_DATA") or os.path.join(ROOT, "data"))
os.makedirs(DATA_DIR, exist_ok=True)
DATA_FILE = os.path.join(DATA_DIR, "mixer-data.json")
OVERLAY_DIR = os.path.join(DATA_DIR, "overlays")
KEY_FILE = os.path.join(DATA_DIR, "control-key.txt")
OLD_KEY = os.path.join(ROOT, "control-key.txt")  # versions before 4.0 kept it next to the app
if not os.path.exists(KEY_FILE) and os.path.exists(OLD_KEY):
    shutil.copyfile(OLD_KEY, KEY_FILE)
MAX_OVERLAY = 100 * 1024 * 1024
OVERLAY_MIME = {"png": "image/png", "jpg": "image/jpeg", "gif": "image/gif", "webp": "image/webp",
                "mp4": "video/mp4", "webm": "video/webm"}
OVERLAY_RE = re.compile(r"^/overlay/([a-f0-9]{24})\.(png|jpg|gif|webp|mp4|webm)$")


def media_type(b):
    """The overlay's type, from its first bytes (never from its name)."""
    if len(b) < 12:
        return None
    if b[:4] == b"\x89PNG":
        return "png"
    if b[:3] == b"\xff\xd8\xff":
        return "jpg"
    if b[:4] == b"GIF8":
        return "gif"
    if b[:4] == b"RIFF" and b[8:12] == b"WEBP":
        return "webp"
    if b[4:8] == b"ftyp":
        return "mp4"
    if b[:4] == b"\x1a\x45\xdf\xa3":
        return "webm"
    return None
try:
    with open(os.path.join(ROOT, "VERSION")) as f:
        VERSION = f.read().strip()
except OSError:
    VERSION = "unknown"
MAX_BODY = 20 * 1024 * 1024
KEEP_DAILY = 30

if os.path.exists(KEY_FILE):
    with open(KEY_FILE) as f:
        KEY = f.read().strip()
else:
    KEY = secrets.token_hex(8)
    with open(KEY_FILE, "w") as f:
        f.write(KEY)

ALLOWED_HOSTS = {f"localhost:{PORT}", f"127.0.0.1:{PORT}"}
CMD_RE = re.compile(r"^[A-Za-z0-9]{1,24}$")
HANDLE_RE = re.compile(r"^[\w.\-]{3,30}$")
CHANNEL_RE = re.compile(r"^UC[\w-]{22}$")
pending = []
lock = threading.Lock()


def youtube_get(url):
    """Fetch a youtube.com page. Only called with URLs built from validated IDs."""
    req = urllib.request.Request(url, headers={
        "User-Agent": "Mozilla/5.0 (LateNightWithIvan)",
        "Accept-Language": "en",
        "Cookie": "CONSENT=YES+1; SOCS=CAI",
    })
    with urllib.request.urlopen(req, timeout=10) as r:
        return r.read()


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def log_message(self, *args):
        pass

    def send_body(self, body, ctype, status=200):
        self.send_response(status)
        self.send_header("Content-Type", ctype)
        self.send_header("Cache-Control", "no-store")
        self.send_header("X-Content-Type-Options", "nosniff")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def send_json(self, obj, status=200):
        self.send_body(json.dumps(obj).encode(), "application/json", status)

    def host_ok(self):
        # Blocks DNS-rebinding: only answer requests addressed to localhost.
        if self.headers.get("Host", "") in ALLOWED_HOSTS:
            return True
        self.send_error(403)
        return False

    def do_POST(self):
        if not self.host_ok():
            return
        path = urlparse(self.path).path
        if path not in ("/api/save", "/api/overlay"):
            return self.send_error(404)
        # Custom header means other websites cannot send this (browser preflight blocks them).
        if self.headers.get("X-Key") != KEY:
            return self.send_json({"error": "bad key"}, 403)
        if path == "/api/overlay":
            length = int(self.headers.get("Content-Length") or 0)
            if length <= 0 or length > MAX_OVERLAY:
                return self.send_json({"error": "too big (100 MB max)"}, 400)
            body = self.rfile.read(length)
            kind = media_type(body)
            if not kind:
                return self.send_json({"error": "only PNG, JPG, GIF, WEBP, MP4 or WEBM"}, 400)
            name = hashlib.sha256(body).hexdigest()[:24] + "." + kind
            os.makedirs(OVERLAY_DIR, exist_ok=True)
            dest = os.path.join(OVERLAY_DIR, name)
            if not os.path.exists(dest):
                with open(dest, "wb") as f:
                    f.write(body)
            return self.send_json({"name": name, "type": OVERLAY_MIME[kind]})
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > MAX_BODY:
            return self.send_json({"error": "bad size"}, 400)
        body = self.rfile.read(length)
        try:
            json.loads(body)
        except ValueError:
            return self.send_json({"error": "bad json"}, 400)
        os.makedirs(DATA_DIR, exist_ok=True)
        tmp = DATA_FILE + ".tmp"
        with open(tmp, "wb") as f:
            f.write(body)
        os.replace(tmp, DATA_FILE)
        daily = os.path.join(DATA_DIR, f"backup-{datetime.date.today().isoformat()}.json")
        with open(daily, "wb") as f:
            f.write(body)
        for old in sorted(glob.glob(os.path.join(DATA_DIR, "backup-*.json")))[:-KEEP_DAILY]:
            os.remove(old)
        return self.send_json({"ok": True})

    def do_GET(self):
        if not self.host_ok():
            return
        url = urlparse(self.path)
        path = url.path
        q = parse_qs(url.query)

        m = OVERLAY_RE.match(path)
        if m:
            f = os.path.join(OVERLAY_DIR, m.group(1) + "." + m.group(2))
            if not os.path.exists(f):
                return self.send_error(404)
            with open(f, "rb") as fh:
                return self.send_body(fh.read(), OVERLAY_MIME[m.group(2)])
        if path == "/api/info":
            return self.send_json({"key": KEY, "version": VERSION})
        if path == "/api/poll":
            with lock:
                cmds = pending[:]
                pending.clear()
            return self.send_json(cmds)
        if path.startswith("/api/cmd/"):
            name = path[len("/api/cmd/"):]
            if q.get("k", [""])[0] != KEY:
                return self.send_json({"error": "bad key"}, 403)
            if not CMD_RE.match(name):
                return self.send_json({"error": "bad command"}, 400)
            with lock:
                if len(pending) < 50:
                    pending.append(name)
            return self.send_json({"ok": True, "cmd": name})
        if path == "/api/load":
            if not os.path.exists(DATA_FILE):
                return self.send_json({})
            with open(DATA_FILE, "rb") as f:
                return self.send_body(f.read(), "application/json")
        if path == "/api/channel":
            # Channel ID + profile picture, from an @handle (h) or a channel ID (c).
            handle = q.get("h", [""])[0].lstrip("@")
            ch = q.get("c", [""])[0]
            if CHANNEL_RE.match(ch):
                url = f"https://www.youtube.com/channel/{ch}"
            elif HANDLE_RE.match(handle):
                url = f"https://www.youtube.com/@{handle}"
            else:
                return self.send_json({"error": "bad channel"}, 400)
            try:
                page = youtube_get(url).decode("utf-8", "replace")
            except Exception:
                return self.send_json({"error": "Could not reach YouTube"}, 502)
            m = (re.search(r'<link rel="canonical" href="https://www\.youtube\.com/channel/(UC[\w-]{22})"', page)
                 or re.search(r'"externalId":"(UC[\w-]{22})"', page)
                 or re.search(r'"channelId":"(UC[\w-]{22})"', page))
            if not m:
                return self.send_json({"error": "Channel not found"})
            out = {"channelId": m.group(1)}
            img = re.search(r'<meta property="og:image" content="(https://yt3\.(?:ggpht|googleusercontent)\.com/[^"<>\s]+)"', page)
            if img:
                out["avatar"] = img.group(1).replace("&amp;", "&")
            return self.send_json(out)
        if path == "/api/feed":
            ch = q.get("c", [""])[0]
            if not CHANNEL_RE.match(ch):
                return self.send_json({"error": "bad channel id"}, 400)
            try:
                xml = youtube_get(f"https://www.youtube.com/feeds/videos.xml?channel_id={ch}")
            except Exception:
                return self.send_json({"error": "Could not reach YouTube"}, 502)
            return self.send_body(xml, "application/xml")
        if path == "/api/playlist":
            pl = q.get("list", [""])[0]
            if not re.match(r"^[\w-]{10,80}$", pl):
                return self.send_json({"error": "bad playlist id"}, 400)
            ids = []
            try:
                page = youtube_get(f"https://www.youtube.com/playlist?list={pl}").decode("utf-8", "replace")
                pat = r'"playlistVideoRenderer":\{"videoId":"([\w-]{11})"|"videoId":"([\w-]{11})","playlistId":"' + re.escape(pl) + '"'
                for m in re.finditer(pat, page):
                    v = m.group(1) or m.group(2)
                    if v not in ids:
                        ids.append(v)
            except Exception:
                pass
            if not ids:  # fall back to the public feed (latest 15)
                try:
                    xml = youtube_get(f"https://www.youtube.com/feeds/videos.xml?playlist_id={pl}").decode("utf-8", "replace")
                    for v in re.findall(r"<yt:videoId>([\w-]{11})</yt:videoId>", xml):
                        if v not in ids:
                            ids.append(v)
                except Exception:
                    return self.send_json({"error": "Could not reach YouTube"}, 502)
            return self.send_json({"ids": ids[:300]})
        if (path.startswith("/api/") or path.startswith("/data/")
                or path.endswith((".py", ".ps1", ".bat", ".sh", ".txt"))):
            return self.send_error(404)
        return super().do_GET()


def main():
    server = http.server.ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
    url = f"http://localhost:{PORT}/"
    print(f"Late Night with Ivan - DJ Board v{VERSION} running at {url}")
    print("Keep this window open during the show. Press Ctrl+C to stop.")
    threading.Timer(0.8, lambda: webbrowser.open(url)).start()
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass


if __name__ == "__main__":
    main()
