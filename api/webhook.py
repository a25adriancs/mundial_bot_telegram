# api/webhook.py
import os
import json
import asyncio
from http.server import BaseHTTPRequestHandler

from telegram import Update
from telegram.ext import Application, CommandHandler

BOT_TOKEN = os.getenv("BOT_TOKEN")

app = Application.builder().token(BOT_TOKEN).build()

async def start(update, context):
    await update.message.reply_text("🏆 Bot Mundial 2026 activo!")

app.add_handler(CommandHandler("start", start))

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        content_length = int(self.headers.get('Content-Length', 0))
        body = self.rfile.read(content_length)
        
        try:
            data = json.loads(body)
            update = Update.de_json(data, app.bot)
            asyncio.get_event_loop().run_until_complete(app.process_update(update))
        except Exception as e:
            print(f"Error: {e}")
        
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'{"ok": true}')
    
    def do_GET(self):
        self.send_response(200)
        self.end_headers()
        self.wfile.write(b'Bot Mundial 2026 - Webhook OK')

app = Handler