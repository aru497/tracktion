#!/usr/bin/env python3
"""Static server for Tracktion. chdir to an absolute root first so it works
even when the launch cwd is sandbox-restricted."""
import os, sys
from functools import partial
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler

ROOT = os.path.dirname(os.path.abspath(__file__))
os.chdir(ROOT)  # ensure a valid, permitted cwd before any getcwd() call
PORT = int(os.environ.get("PORT", "4173"))

Handler = partial(SimpleHTTPRequestHandler, directory=ROOT)
httpd = ThreadingHTTPServer(("127.0.0.1", PORT), Handler)
print(f"Tracktion on http://localhost:{PORT}")
sys.stdout.flush()
httpd.serve_forever()
