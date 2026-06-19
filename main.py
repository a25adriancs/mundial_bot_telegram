import os
import json
import sys
from http.server import BaseHTTPRequestHandler

# Log para debug
print(f"BOT_TOKEN exists: {bool(os.getenv('BOT_TOKEN'))}", file=sys.stderr)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        print(f"POST body: {body[:200]}", file=sys.stderr)
        
        # Siempre 200
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'OK')

app = Handler