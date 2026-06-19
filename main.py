import os
import json
import sys
from http.server import BaseHTTPRequestHandler

from telegram import Bot, Update

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
                
                print(f"Message from {chat_id}: {text}", file=sys.stderr)
                
                # Responder según el comando
                if text == '/start':
                    bot.send_message(
                        chat_id=chat_id,
                        text="🏆 *¡Bot del Mundial 2026!* ⚽\n\n"
                             "📊 /resultados — Resultados\n"
                             "📅 /partidos — Próximos partidos\n"
                             "🏆 /clasificacion — Tablas\n"
                             "📋 /resumen — Resumen\n"
                             "🔔 /suscribir — Notificaciones\n"
                             "❓ /ayuda — Ayuda",
                        parse_mode="Markdown"
                    )
                
                elif text == '/suscribir':
                    bot.send_message(
                        chat_id=chat_id,
                        text=f"🔔 *SUSCRIPCIÓN*\n\n"
                             f"Tu chat ID: `{chat_id}`\n\n"
                             f"Guarda este número para las notificaciones automáticas.",
                        parse_mode="Markdown"
                    )
                
                elif text == '/desuscribir':
                    bot.send_message(
                        chat_id=chat_id,
                        text="🔕 *Notificaciones desactivadas.*",
                        parse_mode="Markdown"
                    )
                
                elif text in ['/ayuda', '/help']:
                    bot.send_message(
                        chat_id=chat_id,
                        text="📋 *COMANDOS*\n\n"
                             "/start — Iniciar\n"
                             "/resultados — Resultados\n"
                             "/partidos — Próximos partidos\n"
                             "/clasificacion — Tablas\n"
                             "/resumen — Resumen\n"
                             "/suscribir — Tu ID para notificaciones\n"
                             "/desuscribir — Cancelar",
                        parse_mode="Markdown"
                    )
                
                else:
                    # Cualquier otro mensaje
                    bot.send_message(
                        chat_id=chat_id,
                        text=f"Recibido: {text}\n\nUsa /ayuda para ver los comandos."
                    )
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            
        except Exception as e:
            print(f"Error: {e}", file=sys.stderr)
            import traceback
            traceback.print_exc(file=sys.stderr)
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook OK')

app = Handler