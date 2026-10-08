#!/usr/bin/env sh
# Late Night with Ivan - DJ Board: start the local server and open Chrome.
cd "$(dirname "$0")" || exit 1
exec python3 serve.py
