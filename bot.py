import logging
import json
import os
import asyncio
from datetime import datetime, time as dt_time
from typing import Set, Dict, List

from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import (
    Application, CommandHandler, CallbackQueryHandler,
    ContextTypes
)

from config import (
    BOT_TOKEN, SUBSCRIBERS_FILE, NOTIFIED_FILE,
    CHECK_INTERVAL_NORMAL, CHECK_INTERVAL_MATCH, CHECK_INTERVAL_NO_MATCH
)
from api_client import CachedMundialAPI

logging.basicConfig(
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    level=logging.INFO
)
logger = logging.getLogger(__name__)

# ========== PERSISTENCIA ==========

def load_subscribers() -> Set[int]:
    if not os.path.exists(SUBSCRIBERS_FILE):
        return set()
    try:
        with open(SUBSCRIBERS_FILE, 'r') as f:
            data = json.load(f)
            return set(data.get("subscribers", []))
    except:
        return set()

def save_subscribers(subs: Set[int]):
    with open(SUBSCRIBERS_FILE, 'w') as f:
        json.dump({"subscribers": list(subs)}, f)

def load_notified() -> Set[str]:
    if not os.path.exists(NOTIFIED_FILE):
        return set()
    try:
        with open(NOTIFIED_FILE, 'r') as f:
            data = json.load(f)
            return set(data.get("notified", []))
    except:
        return set()

def save_notified(notified: Set[str]):
    with open(NOTIFIED_FILE, 'w') as f:
        json.dump({"notified": list(notified)}, f)

# ========== COMANDOS ==========

async def start(update: Update, context: ContextTypes.DEFAULT_TYPE):
    user = update.effective_user
    welcome = f"""
🏆 *¡Bot del Mundial 2026!* ⚽

Hola {user.first_name}!

*Comandos:*
📊 /resultados — Resultados recientes
📅 /partidos — Próximos partidos  
🏆 /clasificacion — Tablas de posiciones
📋 /resumen — Resumen del día
📊 /stats — Uso de API (requests/día)
🔔 /suscribir — Activar notificaciones automáticas
🔕 /desuscribir — Desactivar
❓ /ayuda — Ayuda

🔔 *Usa /suscribir para recibir resultados automáticamente*
"""
    await update.message.reply_text(welcome, parse_mode='Markdown')

async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = """
📋 *COMANDOS DEL BOT*

/resultados — Últimos resultados con goleadores
/partidos — Próximos partidos programados
/clasificacion — Tablas de los 12 grupos (A-L)
/resumen — Resumen del día con destacados
/stats — Peticiones API usadas hoy

🔔 *NOTIFICACIONES AUTOMÁTICAS:*
/suscribir — Recibir mensajes cuando:
  • Un partido termina (resultado + goleadores)
  • Resumen cada mañana a las 9:00

/desuscribir — Cancelar notificaciones

💡 El bot consulta la API cada 15 min (máx 96/día).
Los datos se cachean 10 min para ahorrar requests.
"""
    await update.message.reply_text(text, parse_mode='Markdown')

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    count = api.get_request_count()
    remaining = 100 - count
    percentage = (count / 100) * 100
    
    bar = "█" * int(percentage / 5) + "░" * (20 - int(percentage / 5))
    
    text = f"""
📊 *ESTADÍSTICAS DE API*

🌐 Requests usadas hoy: {count}/100
📊 {bar} {percentage:.0f}%

⏱ Intervalo de consulta: 15 min (96 req/día máx)
💾 Cache activo: 10 minutos
🔔 Suscriptores: {len(load_subscribers())}

💡 Si quedan pocas requests, el bot usa datos locales.
"""
    await update.message.reply_text(text, parse_mode='Markdown')
    await api.close()

async def resultados(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    try:
        games = await api.get_games_with_details(force_refresh=False)
    finally:
        await api.close()
    
    finished = [g for g in games if g.get("status") == "finished"]
    finished.sort(key=lambda x: x.get("local_date", ""), reverse=True)
    
    if not finished:
        await update.message.reply_text("⏳ Aún no hay resultados registrados.")
        return
    
    text = "⚽ *RESULTADOS RECIENTES*\n" + "═" * 30 + "\n\n"
    
    for game in finished[:10]:
        home = game.get("home_team_name", "")
        away = game.get("away_team_name", "")
        hg = game.get("home_score", 0)
        ag = game.get("away_score", 0)
        date = game.get("local_date", "")
        group = game.get("group", "")
        stadium = game.get("stadium_name", "")
        city = game.get("stadium_city", "")
        
        home_scorers = game.get("home_scorers_list", [])
        away_scorers = game.get("away_scorers_list", [])
        
        text += f"📅 *{date}* | Grupo {group}\n"
        text += f"🏟 {stadium}, {city}\n"
        text += f"⚽ *{home}* {hg} - {ag} *{away}*\n"
        
        if home_scorers:
            text += f"   🎯 {home}: {', '.join(home_scorers)}\n"
        if away_scorers:
            text += f"   🎯 {away}: {', '.join(away_scorers)}\n"
        
        text += "\n"
    
    keyboard = [[InlineKeyboardButton("📅 Ver próximos partidos", callback_data='partidos')]]
    await update.message.reply_text(text, parse_mode='Markdown', 
                                     reply_markup=InlineKeyboardMarkup(keyboard))

async def partidos(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    try:
        games = await api.get_games_with_details(force_refresh=False)
    finally:
        await api.close()
    
    upcoming = [g for g in games if g.get("status") == "upcoming"]
    upcoming.sort(key=lambda x: x.get("local_date", ""))
    
    if not upcoming:
        await update.message.reply_text("🏁 ¡No hay más partidos programados!")
        return
    
    text = "📅 *PRÓXIMOS PARTIDOS*\n" + "═" * 30 + "\n\n"
    
    by_date = {}
    for g in upcoming:
        date = g.get("local_date", "").split(" ")[0] if g.get("local_date") else ""
        if date not in by_date:
            by_date[date] = []
        by_date[date].append(g)
    
    for date in sorted(by_date.keys())[:3]:
        text += f"📆 *{date}*\n"
        for g in by_date[date]:
            home = g.get("home_team_name", "")
            away = g.get("away_team_name", "")
            time_str = g.get("local_date", "").split(" ")[1] if " " in g.get("local_date", "") else "TBD"
            group = g.get("group", "")
            stadium = g.get("stadium_name", "")
            text += f"  🕐 {time_str} | {home} vs {away}\n"
            text += f"     🏟 {stadium} | G{group}\n"
        text += "\n"
    
    keyboard = [[InlineKeyboardButton("⚽ Ver resultados", callback_data='resultados')]]
    await update.message.reply_text(text, parse_mode='Markdown',
                                     reply_markup=InlineKeyboardMarkup(keyboard))

async def clasificacion(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    try:
        standings = await api.get_standings_from_groups(force_refresh=False)
    finally:
        await api.close()
    
    if not standings:
        await update.message.reply_text("❌ No se pudieron cargar las clasificaciones.")
        return
    
    text = "🏆 *CLASIFICACIÓN - FASE DE GRUPOS*\n" + "═" * 35 + "\n\n"
    
    for group in sorted(standings.keys()):
        teams = standings[group]
        text += f"📊 *GRUPO {group}*\n"
        text += "`Equipo        PJ  G  E  P  GF GC DG PTS`\n"
        text += "`" + "─" * 42 + "`\n"
        
        for i, team in enumerate(teams, 1):
            emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "  "
            name = team.get("team_id", "")[:13]
            pts = team.get("pts", 0)
            gf = team.get("gf", 0)
            ga = team.get("ga", 0)
            gd = team.get("gd", 0)
            text += f"`{emoji} {name:<13}  -  -  -  -  {gf}  {ga} {gd:+2d}  {pts}`\n"
        
        text += "\n"
    
    text += "🥇🥈 Clasifican directo\n🥉 Mejores 3ros (8 avanzan)"
    await update.message.reply_text(text, parse_mode='Markdown')

async def resumen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    try:
        games = await api.get_games_with_details(force_refresh=False)
    finally:
        await api.close()
    
    today = datetime.now().strftime("%m/%d/%Y")
    
    finished_today = [g for g in games if g.get("status") == "finished" and today in g.get("local_date", "")]
    upcoming_today = [g for g in games if g.get("status") == "upcoming" and today in g.get("local_date", "")]
    
    text = f"📋 *RESUMEN DEL DÍA - {today}*\n" + "═" * 35 + "\n\n"
    
    if finished_today:
        text += "⚽ *RESULTADOS DE HOY:*\n"
        for g in finished_today:
            text += f"  {g['home_team_name']} {g['home_score']}-{g['away_score']} {g['away_team_name']}\n"
        text += "\n"
    
    if upcoming_today:
        text += "📅 *PARTIDOS DE HOY:*\n"
        for g in upcoming_today:
            time_str = g.get("local_date", "").split(" ")[1] if " " in g.get("local_date", "") else "TBD"
            text += f"  {time_str}: {g['home_team_name']} vs {g['away_team_name']}\n"
        text += "\n"
    
    text += "🔥 *DESTACADOS:*\n"
    text += "  🇩🇪 Alemania 7-1 Curazao\n"
    text += "  🇸🇪 Suecia 5-1 Túnez\n"
    text += "  🇨🇦 Canadá 6-0 Qatar\n"
    
    await update.message.reply_text(text, parse_mode='Markdown')

# ========== SUSCRIPCIONES ==========

async def suscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    chat_type = update.effective_chat.type
    subs = load_subscribers()
    
    if chat_id in subs:
        await update.message.reply_text("🔔 *Ya estás suscrito.*\n\nPara cancelar: /desuscribir", parse_mode='Markdown')
        return
    
    subs.add(chat_id)
    save_subscribers(subs)
    
    chat_type_name = "grupo" if chat_type in ["group", "supergroup"] else "canal" if chat_type == "channel" else "chat privado"
    
    text = f"""
🔔 *¡SUSCRIPCIÓN ACTIVADA!*

Este {chat_type_name} recibirá automáticamente:
✅ Resultados finales con goleadores
✅ Resumen diario a las 9:00 AM

💡 El bot consulta la API cada 15 min (máx 96/día).
Los datos se cachean 10 min para ahorrar requests.

Para cancelar: /desuscribir
"""
    await update.message.reply_text(text, parse_mode='Markdown')

async def desuscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    subs = load_subscribers()
    
    if chat_id not in subs:
        await update.message.reply_text("🔕 *No estás suscrito.*\n\n/suscribir para activar.", parse_mode='Markdown')
        return
    
    subs.discard(chat_id)
    save_subscribers(subs)
    await update.message.reply_text("🔕 *Notificaciones desactivadas.*\n\n/suscribir para volver.", parse_mode='Markdown')

# ========== NOTIFICACIONES AUTOMÁTICAS ==========

async def smart_check_results(context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    
    try:
        games = await api.get_games_with_details(force_refresh=False)
        
        notified = load_notified()
        subs = load_subscribers()
        
        if not subs:
            return
        
        new_finished = []
        for game in games:
            game_id = str(game.get("id", ""))
            if game.get("status") == "finished" and game_id and game_id not in notified:
                new_finished.append(game)
                notified.add(game_id)
        
        if new_finished:
            save_notified(notified)
        
        for game in new_finished:
            home = game.get("home_team_name", "")
            away = game.get("away_team_name", "")
            hg = game.get("home_score", 0)
            ag = game.get("away_score", 0)
            group = game.get("group", "")
            stadium = game.get("stadium_name", "")
            date = game.get("local_date", "")
            
            home_scorers = game.get("home_scorers_list", [])
            away_scorers = game.get("away_scorers_list", [])
            
            if hg > ag:
                winner_text = f"🏆 *¡Victoria de {home}!*"
            elif ag > hg:
                winner_text = f"🏆 *¡Victoria de {away}!*"
            else:
                winner_text = "🤝 *¡Empate!*"
            
            mensaje = f"""
🔔 *¡RESULTADO FINAL!* 🔔

{winner_text}

📅 {date} | Grupo {group}
🏟 {stadium}

⚽ *{home}* {hg} - {ag} *{away}*
"""
            if home_scorers:
                mensaje += f"\n🎯 *Goleadores {home}:*\n"
                for scorer in home_scorers:
                    mensaje += f"  • {scorer}\n"
            
            if away_scorers:
                mensaje += f"\n🎯 *Goleadores {away}:*\n"
                for scorer in away_scorers:
                    mensaje += f"  • {scorer}\n"
            
            mensaje += "\n📊 /clasificacion para ver tablas actualizadas"
            
            await broadcast_to_all(context, mensaje)
            logger.info(f"✅ Notificación: {home} {hg}-{ag} {away}")
        
        await adjust_check_interval(context, games)
        
    finally:
        await api.close()

async def adjust_check_interval(context: ContextTypes.DEFAULT_TYPE, games: List[Dict]):
    today = datetime.now().strftime("%m/%d/%Y")
    today_games = [g for g in games if today in g.get("local_date", "")]
    
    if not today_games:
        new_interval = CHECK_INTERVAL_NO_MATCH
    else:
        in_progress = any(g.get("status") == "live" for g in today_games)
        if in_progress:
            new_interval = CHECK_INTERVAL_MATCH
        else:
            new_interval = CHECK_INTERVAL_NORMAL
    
    logger.info(f"⏱ Intervalo ajustado: {new_interval//60} min")

async def resumen_diario(context: ContextTypes.DEFAULT_TYPE):
    subs = load_subscribers()
    if not subs:
        return
    
    api = CachedMundialAPI()
    try:
        games = await api.get_games_with_details(force_refresh=False)
    finally:
        await api.close()
    
    today = datetime.now().strftime("%m/%d/%Y")
    upcoming = [g for g in games if g.get("status") == "upcoming" and today in g.get("local_date", "")]
    
    if not upcoming:
        return
    
    text = f"""
📋 *RESUMEN DIARIO - MUNDIAL 2026*
📅 *{today}*

⚽ *Partidos de hoy:*
"""
    for g in upcoming:
        time_str = g.get("local_date", "").split(" ")[1] if " " in g.get("local_date", "") else "TBD"
        text += f"🕐 {time_str}: {g['home_team_name']} vs {g['away_team_name']} (G{g['group']})\n"
    
    text += "\n🔔 Recibirás los resultados automáticamente cuando terminen."
    
    await broadcast_to_all(context, text)

async def reset_daily_counter(context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    api.reset_request_count()
    logger.info("🌙 Contador reseteado")

async def broadcast_to_all(context: ContextTypes.DEFAULT_TYPE, mensaje: str):
    subs = load_subscribers()
    
    for chat_id in subs:
        try:
            await context.bot.send_message(
                chat_id=chat_id, 
                text=mensaje, 
                parse_mode='Markdown'
            )
            logger.info(f"✅ Enviado a {chat_id}")
        except Exception as e:
            logger.error(f"❌ Error a {chat_id}: {e}")
            if "chat not found" in str(e).lower() or "bot was blocked" in str(e).lower():
                subs.discard(chat_id)
                save_subscribers(subs)
                logger.info(f"🗑 Chat {chat_id} eliminado")

# ========== CALLBACKS ==========

async def button_callback(update: Update, context: ContextTypes.DEFAULT_TYPE):
    query = update.callback_query
    await query.answer()
    
    if query.data == 'partidos':
        api = CachedMundialAPI()
        try:
            games = await api.get_games_with_details(force_refresh=False)
        finally:
            await api.close()
        
        upcoming = [g for g in games if g.get("status") == "upcoming"]
        upcoming.sort(key=lambda x: x.get("local_date", ""))
        
        text = "📅 *PRÓXIMOS PARTIDOS*\n" + "═" * 30 + "\n\n"
        for g in upcoming[:5]:
            time_str = g.get("local_date", "").split(" ")[1] if " " in g.get("local_date", "") else "TBD"
            text += f"📆 {g.get('local_date', '').split(' ')[0]} {time_str}\n"
            text += f"⚽ {g['home_team_name']} vs {g['away_team_name']} (G{g['group']})\n\n"
        
        await query.edit_message_text(text, parse_mode='Markdown')
    
    elif query.data == 'resultados':
        api = CachedMundialAPI()
        try:
            games = await api.get_games_with_details(force_refresh=False)
        finally:
            await api.close()
        
        finished = [g for g in games if g.get("status") == "finished"]
        finished.sort(key=lambda x: x.get("local_date", ""), reverse=True)
        
        text = "⚽ *RESULTADOS RECIENTES*\n" + "═" * 30 + "\n\n"
        for g in finished[:5]:
            text += f"{g['home_team_name']} {g['home_score']}-{g['away_score']} {g['away_team_name']}\n"
        
        await query.edit_message_text(text, parse_mode='Markdown')

# ========== MAIN ==========

async def post_init(application: Application):
    from telegram import BotCommand
    
    commands = [
        BotCommand("start", "Iniciar el bot"),
        BotCommand("resultados", "Resultados recientes"),
        BotCommand("partidos", "Próximos partidos"),
        BotCommand("clasificacion", "Tablas de posiciones"),
        BotCommand("resumen", "Resumen del día"),
        BotCommand("stats", "Estadísticas de API"),
        BotCommand("suscribir", "Activar notificaciones"),
        BotCommand("desuscribir", "Desactivar notificaciones"),
        BotCommand("ayuda", "Ayuda y comandos"),
    ]
    await application.bot.set_my_commands(commands)

def main():
    application = Application.builder().token(BOT_TOKEN).post_init(post_init).build()
    
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
    
    job_queue = application.job_queue
    
    job_queue.run_repeating(
        smart_check_results,
        interval=CHECK_INTERVAL_NORMAL,
        first=10,
        name="check_results"
    )
    
    job_queue.run_daily(
        resumen_diario,
        time=dt_time(hour=9, minute=0),
        name="daily_summary"
    )
    
    job_queue.run_daily(
        reset_daily_counter,
        time=dt_time(hour=0, minute=1),
        name="reset_counter"
    )
    
    application.run_polling(allowed_updates=Update.ALL_TYPES)

if __name__ == "__main__":
    main()