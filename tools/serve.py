# Copyright (c) 2026 Third Shift (thirdshift.ca). All rights reserved. See LICENSE.
"""Local preview server for site/ that behaves like Cloudflare Pages.

- applies the response headers from site/_headers (so the Content-Security-Policy is tested locally)
- serves /privacy from privacy.html (Pages drops the .html)
- answers unknown paths with 404.html and a real 404 status
- never serves _headers itself

Usage:  python tools/serve.py [port]      (default 8914)
"""

import fnmatch
import http.server
import os
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "site"))
LOCAL_ONLY_DROPS = ("upgrade-insecure-requests",)   # would push http://localhost requests to https
SKIP_HEADERS = ("strict-transport-security",)       # meaningless over plain http


def load_rules(path):
    rules, current = [], None
    if not os.path.exists(path):
        return rules
    with open(path, encoding="utf-8") as fh:
        for raw in fh:
            line = raw.rstrip("\n")
            if not line.strip() or line.lstrip().startswith("#"):
                continue
            if not line[0].isspace():
                current = (line.strip(), [])
                rules.append(current)
            elif current is not None and ":" in line:
                name, value = line.strip().split(":", 1)
                name, value = name.strip(), value.strip()
                if name.lower() in SKIP_HEADERS:
                    continue
                if name.lower() == "content-security-policy":
                    value = "; ".join(p.strip() for p in value.split(";") if p.strip() not in LOCAL_ONLY_DROPS)
                current[1].append((name, value))
    return rules


RULES = load_rules(os.path.join(ROOT, "_headers"))


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        super().__init__(*args, directory=ROOT, **kwargs)

    def _url_path(self):
        return self.path.split("?", 1)[0].split("#", 1)[0]

    def end_headers(self):
        path = self._url_path()
        for pattern, headers in RULES:
            if fnmatch.fnmatch(path, pattern):
                for name, value in headers:
                    self.send_header(name, value)
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def translate_path(self, path):
        url_path = path.split("?", 1)[0].split("#", 1)[0]
        if os.path.basename(url_path) == "_headers":
            return os.path.join(ROOT, "__never__")
        resolved = super().translate_path(path)
        if not os.path.exists(resolved) and not os.path.splitext(resolved)[1] and os.path.exists(resolved + ".html"):
            return resolved + ".html"
        return resolved

    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, "404.html")
        if code == 404 and os.path.exists(page):
            with open(page, "rb") as fh:
                body = fh.read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(body)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(body)
            return
        super().send_error(code, message, explain)

    def log_message(self, fmt, *args):
        sys.stderr.write("%s %s\n" % (self.log_date_time_string(), fmt % args))


if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8914
    http.server.ThreadingHTTPServer.allow_reuse_address = True
    server = http.server.ThreadingHTTPServer(("127.0.0.1", port), Handler)
    print(f"Serving {ROOT} on http://localhost:{port} with _headers applied", flush=True)
    server.serve_forever()
