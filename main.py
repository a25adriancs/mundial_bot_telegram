import os
import json
import sys
import asyncio
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
                username = update.message.from_user.username if update.message.from_user else None
                chat_type = update.message.chat.type if update.message.chat else "private"
                
                print(f"Message from {chat_id}: {text}", file=sys.stderr)
                
                asyncio.run(self._handle_message(bot, chat_id, text, username, chat_type))
            
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
    
    async def _handle_message(self, bot, chat_id, text, username, chat_type):
        """Maneja el mensaje de forma async"""
        
        if text == '/start':
            # Suscribir automáticamente
            try:
                from database.supabase_client import SupabaseDB
                db = SupabaseDB()
                db.add_subscriber(chat_id, username, chat_type)
                subscribed = True
            except Exception as e:
                print(f"Error subscribing: {e}", file=sys.stderr)
                subscribed = False
            
            # Mensaje de bienvenida
            welcome_text = (
                "🏆 *¡Bot del Mundial 2026!* ⚽\n\n"
                "¡Bienvenido! Ya estás suscrito a las notificaciones automáticas.\n\n"
                "*Comandos disponibles:*\n"
                "📊 /resultados — Resultados recientes\n"
                "📅 /partidos — Próximos partidos\n"
                "🏆 /clasificacion — Tablas de posiciones\n"
                "📋 /resumen — Resumen del día\n"
                "📊 /stats — Estadísticas de API\n"
                "🔕 /desuscribir — Cancelar notificaciones\n"
                "❓ /ayuda — Ver esta ayuda\n\n"
                "🔔 *Recibirás automáticamente:*\n"
                "✅ Resultados de partidos finalizados\n"
                "✅ Resumen diario a las 9:00 AM"
            )
            
            await bot.send_message(chat_id=chat_id, text=welcome_text, parse_mode="Markdown")
        
        elif text == '/suscribir':
            try:
                from database.supabase_client import SupabaseDB
                db = SupabaseDB()
                db.add_subscriber(chat_id, username, chat_type)
                await bot.send_message(
                    chat_id=chat_id,
                    text="🔔 *¡SUSCRIPCIÓN ACTIVADA!*\n\n"
                         "Ya estás suscrito a las notificaciones automáticas.\n\n"
                         f"Tu chat ID: `{chat_id}`",
                    parse_mode="Markdown"
                )
            except Exception as e:
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"❌ Error al suscribir: {str(e)}"
                )
        
        elif text == '/desuscribir':
            try:
                from database.supabase_client import SupabaseDB
                db = SupabaseDB()
                db.remove_subscriber(chat_id)
                await bot.send_message(
                    chat_id=chat_id,
                    text="🔕 *Notificaciones desactivadas.*\n\n"
                         "Para volver a activar: /suscribir",
                    parse_mode="Markdown"
                )
            except Exception as e:
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"❌ Error: {str(e)}"
                )
        
        elif text in ['/ayuda', '/help']:
            await bot.send_message(
                chat_id=chat_id,
                text="📋 *COMANDOS*\n\n"
                     "/start — Iniciar y suscribirse\n"
                     "/resultados — Resultados recientes\n"
                     "/partidos — Próximos partidos\n"
                     "/clasificacion — Tablas de grupos\n"
                     "/resumen — Resumen del día\n"
                     "/stats — Estadísticas de API\n"
                     "/suscribir — Activar notificaciones\n"
                     "/desuscribir — Cancelar notificaciones",
                parse_mode="Markdown"
            )
        
        elif text == '/resultados':
            await bot.send_message(
                chat_id=chat_id,
                text="⚽ *RESULTADOS*\n\n"
                     "🇩🇪 Alemania 7-1 Curazao\n"
                     "🇸🇪 Suecia 5-1 Túnez\n"
                     "🇨🇦 Canadá 6-0 Qatar\n\n"
                     "💡 Conectando con API en vivo...",
                parse_mode="Markdown"
            )
        
        elif text == '/partidos':
            await bot.send_message(
                chat_id=chat_id,
                text="📅 *PRÓXIMOS PARTIDOS*\n\n"
                     "🕐 15:00 — USA vs Australia\n"
                     "🕐 18:00 — Escocia vs Marruecos\n"
                     "🕐 21:30 — Brasil vs Haití",
                parse_mode="Markdown"
            )
        
        elif text == '/clasificacion':
            await bot.send_message(
                chat_id=chat_id,
                text="🏆 *CLASIFICACIÓN*\n\n"
                     "Grupo A: 🇲🇽 México (6pts)\n"
                     "Grupo B: 🇨🇦 Canadá (4pts)",
                parse_mode="Markdown"
            )
        
        elif text == '/resumen':
            await bot.send_message(
                chat_id=chat_id,
                text="📋 *RESUMEN DEL DÍA*\n\n"
                     "🔥 Destacados:\n"
                     "• 🇩🇪 Alemania goleó 7-1\n"
                     "• 🇸🇪 Suecia 5-1 a Túnez",
                parse_mode="Markdown"
            )
        
        elif text == '/stats':
            try:
                from database.supabase_client import SupabaseDB
                db = SupabaseDB()
                subs = db.get_active_subscribers()
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"📊 *ESTADÍSTICAS*\n\n"
                         f"🔔 Suscriptores: {len(subs)}",
                    parse_mode="Markdown"
                )
            except Exception as e:
                await bot.send_message(
                    chat_id=chat_id,
                    text=f"❌ Error: {str(e)}"
                )
        
        else:
            await bot.send_message(
                chat_id=chat_id,
                text=f"Recibido: {text}\n\nUsa /ayuda para ver los comandos."
            )
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook OK')

app = Handler