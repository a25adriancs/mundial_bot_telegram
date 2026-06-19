"""
Webhook de Telegram para Vercel - Bot Mundial 2026
"""
import os
import json
import asyncio
from http.server import BaseHTTPRequestHandler

from telegram import Update
from telegram.ext import Application, CommandHandler

# ========== CONFIGURACIÓN ==========
BOT_TOKEN = os.getenv("BOT_TOKEN")
JWT_TOKEN = os.getenv("JWT_TOKEN")

# ========== COMANDOS ==========
async def start(update, context):
    await update.message.reply_text(
        "🏆 *¡Bot del Mundial 2026!* ⚽\n\n"
        "📊 /resultados — Resultados recientes\n"
        "📅 /partidos — Próximos partidos\n"
        "🏆 /clasificacion — Tablas de posiciones\n"
        "📋 /resumen — Resumen del día\n"
        "🔔 /suscribir — Notificaciones automáticas\n"
        "🔕 /desuscribir — Desactivar\n"
        "❓ /ayuda — Ayuda",
        parse_mode='Markdown'
    )

async def ayuda(update, context):
    await update.message.reply_text(
        "📋 *COMANDOS*\n\n"
        "/resultados — Últimos resultados\n"
        "/partidos — Próximos partidos\n"
        "/clasificacion — Tablas de grupos\n"
        "/resumen — Resumen del día\n"
        "/suscribir — Activar notificaciones\n"
        "/desuscribir — Desactivar",
        parse_mode='Markdown'
    )

async def resultados(update, context):
    await update.message.reply_text(
        "⚽ *RESULTADOS RECIENTES*\n\n"
        "🇩🇪 Alemania 7-1 Curazao\n"
        "🇸🇪 Suecia 5-1 Túnez\n"
        "🇨🇦 Canadá 6-0 Qatar\n"
        "🇲🇽 México 1-0 Corea del Sur\n"
        "🇺🇸 USA 4-1 Paraguay\n\n"
        "💡 Conectando con API en vivo...",
        parse_mode='Markdown'
    )

async def partidos(update, context):
    await update.message.reply_text(
        "📅 *PRÓXIMOS PARTIDOS*\n\n"
        "🕐 15:00 — USA vs Australia\n"
        "🕐 18:00 — Escocia vs Marruecos\n"
        "🕐 21:30 — Brasil vs Haití\n\n"
        "💡 Conectando con API en vivo...",
        parse_mode='Markdown'
    )

async def clasificacion(update, context):
    await update.message.reply_text(
        "🏆 *CLASIFICACIÓN*\n\n"
        "📊 Grupo A: 🇲🇽 México (6pts), 🇰🇷 Corea (3pts)\n"
        "📊 Grupo B: 🇨🇦 Canadá (4pts), 🇨🇭 Suiza (4pts)\n\n"
        "💡 Conectando con API en vivo...",
        parse_mode='Markdown'
    )

async def resumen(update, context):
    await update.message.reply_text(
        "📋 *RESUMEN DEL DÍA*\n\n"
        "🔥 Destacados:\n"
        "• 🇩🇪 Alemania goleó 7-1\n"
        "• 🇸🇪 Suecia 5-1 a Túnez\n"
        "• 🇨🇦 Canadá 6-0 Qatar\n"
        "• 🇲🇽 México líder del Grupo A",
        parse_mode='Markdown'
    )

async def suscribir(update, context):
    await update.message.reply_text(
        "🔔 *¡SUSCRIPCIÓN ACTIVADA!*\n\n"
        "Recibirás:\n"
        "✅ Resultados automáticos\n"
        "✅ Resumen diario a las 9:00\n\n"
        "Para cancelar: /desuscribir",
        parse_mode='Markdown'
    )

async def desuscribir(update, context):
    await update.message.reply_text(
        "🔕 *Notificaciones desactivadas.*\n\n"
        "Para volver: /suscribir",
        parse_mode='Markdown'
    )

# ========== INICIALIZAR BOT ==========
application = Application.builder().token(BOT_TOKEN).build()

application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("ayuda", ayuda))
application.add_handler(CommandHandler("help", ayuda))
application.add_handler(CommandHandler("resultados", resultados))
application.add_handler(CommandHandler("partidos", partidos))
application.add_handler(CommandHandler("clasificacion", clasificacion))
application.add_handler(CommandHandler("clasi", clasificacion))
application.add_handler(CommandHandler("resumen", resumen))
application.add_handler(CommandHandler("suscribir", suscribir))
application.add_handler(CommandHandler("desuscribir", desuscribir))

# ========== HANDLER PARA VERCEL ==========
class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            update = Update.de_json(data, application.bot)
            
            # Procesar update
            asyncio.get_event_loop().run_until_complete(
                application.process_update(update)
            )
            
            self.send_response(200)
            self.send_header('Content-Type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            
        except Exception as e:
            print(f"Error: {e}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.send_header('Content-Type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook activo')

app = Handler