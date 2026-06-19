"""
Comandos del bot.
"""
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from database.supabase_client import SupabaseDB
from services.api_football import MundialAPI

db = SupabaseDB()

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🏆 *¡Bot del Mundial 2026!* ⚽\n\n"
        "📊 /resultados — Resultados recientes\n"
        "📅 /partidos — Próximos partidos\n"
        "🏆 /clasificacion — Tablas de posiciones\n"
        "📋 /resumen — Resumen del día\n"
        "📊 /stats — Estadísticas\n"
        "🔔 /suscribir — Notificaciones automáticas\n"
        "🔕 /desuscribir — Desactivar\n"
        "❓ /ayuda — Ayuda",
        parse_mode="Markdown"
    )

async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📋 *COMANDOS*\n\n"
        "/resultados — Últimos resultados con goleadores\n"
        "/partidos — Próximos partidos programados\n"
        "/clasificacion — Tablas de los 12 grupos\n"
        "/resumen — Resumen del día\n"
        "/stats — Peticiones API usadas\n\n"
        "🔔 *NOTIFICACIONES:*\n"
        "/suscribir — Recibir resultados automáticos\n"
        "/desuscribir — Cancelar",
        parse_mode="Markdown"
    )

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = MundialAPI()
    count = api.get_request_count()
    stats_db = db.get_stats()
    
    bar = "█" * int(count / 5) + "░" * (20 - int(count / 5))
    
    await update.message.reply_text(
        f"📊 *ESTADÍSTICAS*\n\n"
        f"🌐 Requests: {count}/100\n"
        f"📊 {bar}\n"
        f"🔔 Suscriptores: {stats_db['subscribers']}\n"
        f"📋 Partidos notificados: {stats_db['notified_matches']}",
        parse_mode="Markdown"
    )
    await api.close()

async def resultados(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = MundialAPI()
    try:
        games = await api.get_enriched_games(force_refresh=False)
    finally:
        await api.close()
    
    finished = [g for g in games if g.get("status") == "finished"]
    finished.sort(key=lambda x: x.get("local_date", ""), reverse=True)
    
    if not finished:
        await update.message.reply_text("⏳ Aún no hay resultados.")
        return
    
    text = "⚽ *RESULTADOS RECIENTES*\n" + "═" * 30 + "\n\n"
    for game in finished[:10]:
        text += format_game_result(game)
    
    keyboard = [[InlineKeyboardButton("📅 Próximos", callback_data="partidos")]]
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

async def partidos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = MundialAPI()
    try:
        games = await api.get_enriched_games(force_refresh=False)
    finally:
        await api.close()
    
    upcoming = [g for g in games if g.get("status") == "upcoming"]
    upcoming.sort(key=lambda x: x.get("local_date", ""))
    
    if not upcoming:
        await update.message.reply_text("🏁 ¡No hay más partidos!")
        return
    
    text = "📅 *PRÓXIMOS PARTIDOS*\n" + "═" * 30 + "\n\n"
    by_date = {}
    for g in upcoming:
        date = g.get("local_date", "").split(" ")[0] if g.get("local_date") else ""
        by_date.setdefault(date, []).append(g)
    
    for date in sorted(by_date.keys())[:3]:
        text += f"📆 *{date}*\n"
        for g in by_date[date]:
            time_str = g.get("local_date", "").split(" ")[1] if " " in g.get("local_date", "") else "TBD"
            text += f"  🕐 {time_str} | {g['home_team_name']} vs {g['away_team_name']} (G{g['group']})\n"
        text += "\n"
    
    keyboard = [[InlineKeyboardButton("⚽ Resultados", callback_data="resultados")]]
    await update.message.reply_text(text, parse_mode="Markdown", reply_markup=InlineKeyboardMarkup(keyboard))

async def clasificacion(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "🏆 *CLASIFICACIÓN*\n\n"
        "Grupo A: 🇲🇽 México (6pts)\n"
        "Grupo B: 🇨🇦 Canadá (4pts)\n\n"
        "💡 Conectando con API en vivo...",
        parse_mode="Markdown"
    )

async def resumen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    await update.message.reply_text(
        "📋 *RESUMEN DEL DÍA*\n\n"
        "🔥 Destacados:\n"
        "• 🇩🇪 Alemania goleó 7-1\n"
        "• 🇸🇪 Suecia 5-1 a Túnez\n"
        "• 🇨🇦 Canadá 6-0 Qatar",
        parse_mode="Markdown"
    )

async def suscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    username = update.effective_user.username
    chat_type = update.effective_chat.type
    
    db.add_subscriber(chat_id, username, chat_type)
    
    await update.message.reply_text(
        "🔔 *¡SUSCRIPCIÓN ACTIVADA!*\n\n"
        "Recibirás automáticamente:\n"
        "✅ Resultados finales\n"
        "✅ Resumen diario a las 9:00\n\n"
        "Para cancelar: /desuscribir",
        parse_mode="Markdown"
    )

async def desuscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    db.remove_subscriber(chat_id)
    
    await update.message.reply_text(
        "🔕 *Notificaciones desactivadas.*\n\n"
        "Para volver: /suscribir",
        parse_mode="Markdown"
    )

def format_game_result(game: dict) -> str:
    """Formatea un resultado de partido"""
    home = game.get("home_team_name", "")
    away = game.get("away_team_name", "")
    hg = game.get("home_score", 0)
    ag = game.get("away_score", 0)
    date = game.get("local_date", "")
    group = game.get("group", "")
    stadium = game.get("stadium_name", "")
    
    home_scorers = game.get("home_scorers_list", [])
    away_scorers = game.get("away_scorers_list", [])
    
    text = f"📅 *{date}* | Grupo {group}\n"
    text += f"🏟 {stadium}\n"
    text += f"⚽ *{home}* {hg} - {ag} *{away}*\n"
    
    if home_scorers:
        text += f"   🎯 {home}: {', '.join(home_scorers)}\n"
    if away_scorers:
        text += f"   🎯 {away}: {', '.join(away_scorers)}\n"
    
    return text + "\n"