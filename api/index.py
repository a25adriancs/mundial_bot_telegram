"""
Webhook de Telegram para Vercel.
Recibe mensajes de Telegram y responde inmediatamente.
"""
import os
import json
import asyncio
from http.server import BaseHTTPRequestHandler

# Importar antes de telegram para evitar problemas
from telegram import Update
from telegram.ext import Application, CommandHandler

from config import BOT_TOKEN
from bot_commands import (
    start, ayuda, resultados, partidos, clasificacion, 
    resumen, stats, suscribir, desuscribir
)

# Crear aplicación global (se reutiliza entre peticiones)
application = Application.builder().token(BOT_TOKEN).build()

# Registrar handlers
application.add_handler(CommandHandler("start", start))
application.add_handler(CommandHandler("ayuda", ayuda))
application.add_handler(CommandHandler("help", ayuda))
application.add_handler(CommandHandler("resultados", resultados))
application.add_handler(CommandHandler("partidos", partidos))
application.add_handler(CommandHandler("clasificacion", clasificacion))
application.add_handler(CommandHandler("clasi", clasificacion))
application.add_handler(CommandHandler("resumen", resumen))
application.add_handler(CommandHandler("stats", stats))
application.add_handler(CommandHandler("suscribir", suscribir))
application.add_handler(CommandHandler("desuscribir", desuscribir))

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        """Recibe webhook de Telegram"""
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            update = Update.de_json(data, application.bot)
            
            # Procesar update de forma asíncrona
            asyncio.get_event_loop().run_until_complete(
                application.process_update(update)
            )
            
            self.send_response(200)
            self.send_header('Content-type', 'application/json')
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
            
        except Exception as e:
            print(f"Error: {e}")
            self.send_response(200)
            self.end_headers()
            self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        """Health check"""
        self.send_response(200)
        self.send_header('Content-type', 'text/plain')
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook activo')