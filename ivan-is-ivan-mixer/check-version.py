#!/usr/bin/env python3
"""Release check: the version must be identical everywhere it appears.
Run before every release:  python3 check-version.py"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.abspath(__file__))


def read(name):
    with open(os.path.join(ROOT, name), encoding="utf-8") as f:
        return f.read()


version = read("VERSION").strip()
found = {
    "VERSION": [version],
    "app.js APP_VERSION": re.findall(r"const APP_VERSION = '([^']+)'", read("app.js")),
    "index.html ?v= (css + js)": re.findall(r'\?v=([0-9][^"]*)"', read("index.html")),
    "CHANGELOG.md newest entry": re.findall(r"^## v(\S+)", read("CHANGELOG.md"), re.M)[:1],
}
ok = re.fullmatch(r"\d+\.\d+\.\d+", version) is not None
for where, values in found.items():
    good = bool(values) and all(v == version for v in values)
    ok = ok and good
    print(f"{'OK ' if good else 'BAD'}  {where}: {', '.join(values) or 'missing'}")
print(f"\nVersion {version}: {'consistent' if ok else 'NOT consistent — fix before releasing'}")
sys.exit(0 if ok else 1)
