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
                chat_id = update.message.chat_id  # En grupo: ID negativo del grupo
                text = update.message.text
                user = update.message.from_user
                username = user.username if user else None
                chat_type = update.message.chat.type if update.message.chat else "private"
                
                print(f"Message from chat {chat_id} ({chat_type}): {text}", file=sys.stderr)
                
                # Solo procesar si es comando o si el bot está mencionado en grupo
                is_command = text.startswith('/')
                is_mention = f'@{bot.username}' in text if bot.username else False
                
                if is_command or (chat_type in ['group', 'supergroup'] and is_mention):
                    asyncio.run(self._handle_message(bot, chat_id, text, username, chat_type, user))
            
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
    
    async def _handle_message(self, bot, chat_id, text, username, chat_type, user):
        """Maneja el mensaje de forma async"""
        
        # En grupos, los comandos pueden ser /start@nombre_bot
        # Limpiar el comando
        if ' ' in text:
            text = text.split(' ')[0]
        
        # Comandos principales
        if text.startswith('/start'):
            await self._cmd_start(bot, chat_id, username, chat_type)
        
        elif text.startswith('/suscribir'):
            await self._cmd_suscribir(bot, chat_id, username, chat_type)
        
        elif text.startswith('/desuscribir'):
            await self._cmd_desuscribir(bot, chat_id)
        
        elif text.startswith('/ayuda') or text.startswith('/help'):
            await self._cmd_ayuda(bot, chat_id, chat_type)
        
        elif text.startswith('/resultados'):
            await self._cmd_resultados(bot, chat_id)
        
        elif text.startswith('/partidos'):
            await self._cmd_partidos(bot, chat_id)
        
        elif text.startswith('/clasificacion'):
            await self._cmd_clasificacion(bot, chat_id)
        
        elif text.startswith('/resumen'):
            await self._cmd_resumen(bot, chat_id)
        
        elif text.startswith('/stats'):
            await self._cmd_stats(bot, chat_id)
    
    async def _cmd_start(self, bot, chat_id, username, chat_type):
        """Comando /start - suscribe automáticamente"""
        try:
            from database.supabase_client import SupabaseDB
            db = SupabaseDB()
            db.add_subscriber(chat_id, username, chat_type)
            subscribed = True
        except Exception as e:
            print(f"Error subscribing: {e}", file=sys.stderr)
            subscribed = False
        
        # Texto según si es grupo o privado
        if chat_type in ['group', 'supergroup']:
            welcome = (
                "🏆 *¡Bot del Mundial 2026 añadido al grupo!* ⚽\n\n"
                "Este grupo está suscrito a las notificaciones automáticas.\n\n"
                "*Comandos:*\n"
                "📊 /resultados — Resultados\n"
                "📅 /partidos — Próximos partidos\n"
                "🏆 /clasificacion — Tablas\n"
                "📋 /resumen — Resumen\n"
                "📊 /stats — Estadísticas\n"
                "🔕 /desuscribir — Cancelar notificaciones\n"
                "❓ /ayuda — Ayuda"
            )
        else:
            welcome = (
                "🏆 *¡Bot del Mundial 2026!* ⚽\n\n"
                "¡Bienvenido! Ya estás suscrito a las notificaciones.\n\n"
                "*Comandos:*\n"
                "📊 /resultados — Resultados\n"
                "📅 /partidos — Próximos partidos\n"
                "🏆 /clasificacion — Tablas\n"
                "📋 /resumen — Resumen\n"
                "📊 /stats — Estadísticas\n"
                "🔕 /desuscribir — Cancelar\n"
                "❓ /ayuda — Ayuda"
            )
        
        await bot.send_message(chat_id=chat_id, text=welcome, parse_mode="Markdown")
    
    async def _cmd_suscribir(self, bot, chat_id, username, chat_type):
        try:
            from database.supabase_client import SupabaseDB
            db = SupabaseDB()
            db.add_subscriber(chat_id, username, chat_type)
            text = "🔔 *¡SUSCRIPCIÓN ACTIVADA!*\n\nYa estás suscrito."
        except Exception as e:
            text = f"❌ Error: {str(e)}"
        
        await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
    
    async def _cmd_desuscribir(self, bot, chat_id):
        try:
            from database.supabase_client import SupabaseDB
            db = SupabaseDB()
            db.remove_subscriber(chat_id)
            text = "🔕 *Notificaciones desactivadas.*"
        except Exception as e:
            text = f"❌ Error: {str(e)}"
        
        await bot.send_message(chat_id=chat_id, text=text, parse_mode="Markdown")
    
    async def _cmd_ayuda(self, bot, chat_id, chat_type):
        help_text = (
            "📋 *COMANDOS*\n\n"
            "/start — Iniciar y suscribirse\n"
            "/resultados — Resultados recientes\n"
            "/partidos — Próximos partidos\n"
            "/clasificacion — Tablas de grupos\n"
            "/resumen — Resumen del día\n"
            "/stats — Estadísticas\n"
            "/suscribir — Activar notificaciones\n"
            "/desuscribir — Cancelar notificaciones"
        )
        await bot.send_message(chat_id=chat_id, text=help_text, parse_mode="Markdown")
    
    async def _cmd_resultados(self, bot, chat_id):
        await bot.send_message(
            chat_id=chat_id,
            text="⚽ *RESULTADOS*\n\n🇩🇪 Alemania 7-1 Curazao\n🇸🇪 Suecia 5-1 Túnez\n🇨🇦 Canadá 6-0 Qatar",
            parse_mode="Markdown"
        )
    
    async def _cmd_partidos(self, bot, chat_id):
        await bot.send_message(
            chat_id=chat_id,
            text="📅 *PRÓXIMOS PARTIDOS*\n\n🕐 15:00 — USA vs Australia\n🕐 18:00 — Escocia vs Marruecos\n🕐 21:30 — Brasil vs Haití",
            parse_mode="Markdown"
        )
    
    async def _cmd_clasificacion(self, bot, chat_id):
        await bot.send_message(
            chat_id=chat_id,
            text="🏆 *CLASIFICACIÓN*\n\nGrupo A: 🇲🇽 México (6pts)\nGrupo B: 🇨🇦 Canadá (4pts)",
            parse_mode="Markdown"
        )
    
    async def _cmd_resumen(self, bot, chat_id):
        await bot.send_message(
            chat_id=chat_id,
            text="📋 *RESUMEN*\n\n🔥 Destacados:\n• 🇩🇪 Alemania goleó 7-1\n• 🇸🇪 Suecia 5-1 a Túnez",
            parse_mode="Markdown"
        )
    
    async def _cmd_stats(self, bot, chat_id):
        try:
            from database.supabase_client import SupabaseDB
            db = SupabaseDB()
            subs = db.get_active_subscribers()
            await bot.send_message(
                chat_id=chat_id,
                text=f"📊 *ESTADÍSTICAS*\n\n🔔 Suscriptores: {len(subs)}",
                parse_mode="Markdown"
            )
        except Exception as e:
            await bot.send_message(chat_id=chat_id, text=f"❌ Error: {str(e)}")
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook OK')

app = Handler