"""
Punto de entrada principal del bot.
Funciona como webhook en Vercel.
"""
import os
import json
import asyncio
from http.server import BaseHTTPRequestHandler

from telegram import Bot, Update

from config import BOT_TOKEN
from bot.handlers import setup_handlers
from services.notifications import NotificationService

# Inicializar bot
bot = Bot(token=BOT_TOKEN)
notifier = NotificationService()

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            update = Update.de_json(data, bot)
            
            if update.message and update.message.text:
                chat_id = update.message.chat_id
                text = update.message.text
                
                print(f"📩 {chat_id}: {text}")
                
                # Procesar comandos manualmente para Vercel
                if text == '/start':
                    bot.send_message(chat_id=chat_id, text="🏆 *¡Bot del Mundial 2026!* ⚽\n\n📊 /resultados — Resultados\n📅 /partidos — Próximos partidos\n🏆 /clasificacion — Tablas\n📋 /resumen — Resumen\n🔔 /suscribir — Notificaciones\n❓ /ayuda — Ayuda", parse_mode='Markdown')
                
                elif text == '/suscribir':
                    from database.supabase_client import SupabaseDB
                    db = SupabaseDB()
                    username = update.message.from_user.username if update.message.from_user else None
                    chat_type = update.message.chat.type if update.message.chat else "private"
                    db.add_subscriber(chat_id, username, chat_type)
                    bot.send_message(chat_id=chat_id, text="🔔 *¡SUSCRIPCIÓN ACTIVADA!*\n\nRecibirás resultados automáticamente.", parse_mode='Markdown')
                
                elif text == '/desuscribir':
                    from database.supabase_client import SupabaseDB
                    db = SupabaseDB()
                    db.remove_subscriber(chat_id)
                    bot.send_message(chat_id=chat_id, text="🔕 *Notificaciones desactivadas.*", parse_mode='Markdown')
                
                elif text == '/resultados':
                    bot.send_message(chat_id=chat_id, text="⚽ Cargando resultados...", parse_mode='Markdown')
                
                elif text == '/partidos':
                    bot.send_message(chat_id=chat_id, text="📅 Cargando próximos partidos...", parse_mode='Markdown')
                
                elif text in ['/ayuda', '/help']:
                    bot.send_message(chat_id=chat_id, text="📋 *COMANDOS*\n\n/start — Iniciar\n/resultados — Resultados\n/partidos — Próximos partidos\n/clasificacion — Tablas\n/resumen — Resumen\n/suscribir — Activar notificaciones\n/desuscribir — Cancelar", parse_mode='Markdown')
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            
        except Exception as e:
            print(f"❌ Error: {e}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook activo')

app = Handler