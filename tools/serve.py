#!/usr/bin/env python3
"""Statischer Testserver für Koboldkeller: wie `python3 -m http.server`, aber mit großer Verbindungs-Warteschlange.
Der Standard-Backlog von 5 lief bei parallelen Modul-Anfragen mehrerer Test-Browser über → einzelne Module kamen
erst nach TCP-Wiederholungen (≥ 30 s) an und die Checks liefen ins Timeout. Aufruf: python3 tools/serve.py [port]"""
import sys, socket, contextlib, http.server

class Server(http.server.ThreadingHTTPServer):
    address_family = socket.AF_INET6          # wie http.server: IPv6 + IPv4 (localhost → ::1 oder 127.0.0.1)
    request_queue_size = 256
    daemon_threads = True
    def server_bind(self):
        with contextlib.suppress(Exception):
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        return super().server_bind()

class Handler(http.server.SimpleHTTPRequestHandler):
    def log_message(self, fmt, *args):   # leise (nur Fehler)
        if len(args) > 1 and str(args[1]).startswith(("4", "5")):
            super().log_message(fmt, *args)

port = int(sys.argv[1]) if len(sys.argv) > 1 else 8731
with Server(("::", port), Handler) as httpd:
    print(f"Koboldkeller-Testserver auf http://localhost:{port}/", flush=True)
    httpd.serve_forever()
