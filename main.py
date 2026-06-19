import os
import json
from http.server import BaseHTTPRequestHandler

from telegram import Bot, Update

# NO importar bot.commands aquí arriba — solo cuando se necesite
BOT_TOKEN = os.getenv("BOT_TOKEN")

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            bot = Bot(token=BOT_TOKEN)
            update = Update.de_json(data, bot)
            
            if update.message and update.message.text:
                chat_id = update.message.chat_id
                text = update.message.text
                
                print(f"📩 {chat_id}: {text}")
                
                # Importar aquí, lazy, cuando ya están las variables
                from bot.commands import (
                    start, ayuda, resultados, partidos, clasificacion,
                    resumen, stats, suscribir, desuscribir
                )
                
                # Enrutar
                if text == '/start':
                    start(update, None)
                elif text == '/suscribir':
                    suscribir(update, None)
                elif text == '/desuscribir':
                    desuscribir(update, None)
                elif text in ['/ayuda', '/help']:
                    ayuda(update, None)
                elif text == '/resultados':
                    resultados(update, None)
                elif text == '/partidos':
                    partidos(update, None)
                elif text == '/clasificacion':
                    clasificacion(update, None)
                elif text == '/resumen':
                    resumen(update, None)
                elif text == '/stats':
                    stats(update, None)
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            
        except Exception as e:
            print(f"❌ Error: {e}")
            import traceback
            traceback.print_exc()
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook OK')

app = Handler