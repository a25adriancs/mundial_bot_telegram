from http.server import BaseHTTPRequestHandler
import json
import os

# Verificar que el token está cargado
BOT_TOKEN = os.getenv("BOT_TOKEN", "NO_TOKEN")

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        # Log para debug
        print(f"Webhook received: {body.decode()}")
        print(f"Token loaded: {BOT_TOKEN[:10] if BOT_TOKEN != 'NO_TOKEN' else 'NO_TOKEN'}")
        
        self.send_response(200)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(f'Bot OK. Token: {BOT_TOKEN[:10] if BOT_TOKEN != "NO_TOKEN" else "MISSING"}'.encode())

# Vercel necesita esto
app = Handler