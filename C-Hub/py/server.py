#!/usr/bin/env python3
"""
Dev server for the Nova static site (port 8000).

- Serves clean protected routes: /register /login /dashboard (+ /index.html etc.)
- Sends `Cache-Control: no-cache` for HTML documents so the browser always
  revalidates pages after edits.
"""

import http.server
import os
from pathlib import Path
import socketserver

PORT = 8000
BIND = "127.0.0.1"

# Clean routes -> page files (the .html aliases keep direct links working)
ROUTES = {
    "/": "html/index.html",
    "/register": "html/index.html",
    "/login": "html/login.html",
    "/dashboard": "html/dashboard.html",
    "/index.html": "html/index.html",
    "/login.html": "html/login.html",
    "/dashboard.html": "html/dashboard.html",
}


class NovaHandler(http.server.SimpleHTTPRequestHandler):
    def do_GET(self):
        route = self.path.split("?", 1)[0].split("#", 1)[0]
        # Strip trailing slash: /login/ -> /login
        if len(route) > 1 and route.endswith("/"):
            route = route[:-1]
        if route in ROUTES:
            self.path = ROUTES[route] + self.path[len(route):]
        super().do_GET()

    def end_headers(self):
        if (self.headers.get("Accept") or "").find("text/html") != -1 or self.path.endswith(".html") or self.path == "/":
            self.send_header("Cache-Control", "no-cache, must-revalidate")
        super().end_headers()

    def log_message(self, fmt, *args):
        pass  # keep the log file quiet


class ReusableTCPServer(socketserver.TCPServer):
    allow_reuse_address = True


if __name__ == "__main__":
    os.chdir(Path(__file__).resolve().parent.parent)
    with ReusableTCPServer((BIND, PORT), NovaHandler) as httpd:
        print(f"Serving Nova on http://{BIND}:{PORT} (routes: /register /login /dashboard)")
        httpd.serve_forever()
