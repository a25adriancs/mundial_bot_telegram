from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from database.supabase_client import SupabaseDB

def get_db():
    return SupabaseDB()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🏆 *¡Bot del Mundial 2026!* ⚽\n\n"
        "📊 /resultados — Resultados\n"
        "📅 /partidos — Próximos partidos\n"
        "🏆 /clasificacion — Tablas\n"
        "📋 /resumen — Resumen\n"
        "🔔 /suscribir — Notificaciones\n"
        "❓ /ayuda — Ayuda",
        parse_mode="Markdown"
    )

async def suscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    username = update.effective_user.username if update.effective_user else None
    chat_type = update.effective_chat.type if update.effective_chat else "private"
    
    try:
        get_db().add_subscriber(chat_id, username, chat_type)
        text = "🔔 *¡SUSCRIPCIÓN ACTIVADA!*\n\nRecibirás resultados automáticamente."
    except Exception as e:
        text = f"❌ Error: {str(e)}"
    
    await update.message.reply_text(text, parse_mode="Markdown")

async def desuscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    try:
        get_db().remove_subscriber(chat_id)
        text = "🔕 *Notificaciones desactivadas.*"
    except Exception as e:
        text = f"❌ Error: {str(e)}"
    
    await update.message.reply_text(text, parse_mode="Markdown")

async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📋 *COMANDOS*\n\n"
        "/start — Iniciar\n"
        "/resultados — Resultados\n"
        "/partidos — Próximos partidos\n"
        "/clasificacion — Tablas\n"
        "/resumen — Resumen\n"
        "/suscribir — Activar notificaciones\n"
        "/desuscribir — Cancelar",
        parse_mode="Markdown"
    )

async def resultados(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "⚽ *RESULTADOS*\n\n"
        "🇩🇪 Alemania 7-1 Curazao\n"
        "🇸🇪 Suecia 5-1 Túnez\n"
        "🇨🇦 Canadá 6-0 Qatar\n\n"
        "💡 Conectando con API...",
        parse_mode="Markdown"
    )

async def partidos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📅 *PRÓXIMOS PARTIDOS*\n\n"
        "🕐 15:00 — USA vs Australia\n"
        "🕐 18:00 — Escocia vs Marruecos\n"
        "🕐 21:30 — Brasil vs Haití",
        parse_mode="Markdown"
    )

async def clasificacion(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🏆 *CLASIFICACIÓN*\n\n"
        "Grupo A: 🇲🇽 México (6pts)\n"
        "Grupo B: 🇨🇦 Canadá (4pts)",
        parse_mode="Markdown"
    )

async def resumen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📋 *RESUMEN DEL DÍA*\n\n"
        "🔥 Destacados:\n"
        "• 🇩🇪 Alemania goleó 7-1\n"
        "• 🇸🇪 Suecia 5-1 a Túnez",
        parse_mode="Markdown"
    )

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    try:
        subs = get_db().get_active_subscribers()
        text = f"📊 *ESTADÍSTICAS*\n\n🔔 Suscriptores: {len(subs)}"
    except Exception as e:
        text = f"❌ Error: {str(e)}"
    
    await update.message.reply_text(text, parse_mode="Markdown")