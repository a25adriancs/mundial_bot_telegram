"""
Handlers de callback y errores.
"""
from telegram import Update
from telegram.ext import CallbackQueryHandler, ContextTypes

from bot.commands import resultados, partidos

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == "partidos":
        await partidos(update, context)
    elif query.data == "resultados":
        await resultados(update, context)

def setup_handlers(application):
    from telegram.ext import CommandHandler
    
    from bot.commands import (
        start, ayuda, resultados, partidos, clasificacion,
        resumen, stats, suscribir, desuscribir
    )
    
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
    application.add_handler(CallbackQueryHandler(button_callback))