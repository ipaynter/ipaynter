#!/usr/bin/env sh
# Ivan is Ivan - Live Mixer: start the local server and open Chrome.
cd "$(dirname "$0")" || exit 1
exec python3 serve.py
