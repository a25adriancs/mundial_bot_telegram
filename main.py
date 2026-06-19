import os
import json
import sys
from http.server import BaseHTTPRequestHandler

# Log de inicio para debug
print(f"=== BOT STARTING ===", file=sys.stderr)
print(f"BOT_TOKEN exists: {bool(os.getenv('BOT_TOKEN'))}", file=sys.stderr)
print(f"SUPABASE_URL exists: {bool(os.getenv('SUPABASE_URL'))}", file=sys.stderr)

from telegram import Bot, Update

BOT_TOKEN = os.getenv("BOT_TOKEN")

class Handler(BaseHTTPRequestHandler):
    def log_message(self, format, *args):
        # Log todo a stderr para Vercel
        print(f"{self.address_string()} - {format % args}", file=sys.stderr)
    
    def do_POST(self):
        print("=== POST REQUEST RECEIVED ===", file=sys.stderr)
        
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        print(f"Body: {body[:200]}", file=sys.stderr)
        
        try:
            data = json.loads(body)
            bot = Bot(token=BOT_TOKEN)
            update = Update.de_json(data, bot)
            
            if update.message:
                chat_id = update.message.chat_id
                text = update.message.text
                print(f"Message from {chat_id}: {text}", file=sys.stderr)
                
                # Responder inmediatamente sin Supabase para test
                bot.send_message(
                    chat_id=chat_id,
                    text=f"Recibido: {text}\n\nTu chat ID: `{chat_id}`",
                    parse_mode="Markdown"
                )
            else:
                print("No message in update", file=sys.stderr)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            
        except Exception as e:
            print(f"ERROR: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        print("=== GET REQUEST ===", file=sys.stderr)
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot OK - Webhook activo')

app = Handler