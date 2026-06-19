"""
Comandos del bot separados para reutilizar en webhook y GitHub Actions.
"""
import json
import os
from telegram import Update, InlineKeyboardButton, InlineKeyboardMarkup
from telegram.ext import ContextTypes

from api_client import CachedMundialAPI

SUBSCRIBERS_FILE = "subscribers.json"
NOTIFIED_FILE = "notified_matches.json"

def load_subscribers():
    if not os.path.exists(SUBSCRIBERS_FILE):
        return set()
    try:
        with open(SUBSCRIBERS_FILE, 'r') as f:
            return set(json.load(f).get("subscribers", []))
    except:
        return set()

def save_subscribers(subs):
    with open(SUBSCRIBERS_FILE, 'w') as f:
        json.dump({"subscribers": list(subs)}, f)

def load_notified():
    if not os.path.exists(NOTIFIED_FILE):
        return set()
    try:
        with open(NOTIFIED_FILE, 'r') as f:
            return set(json.load(f).get("notified", []))
    except:
        return set()

def save_notified(notified):
    with open(NOTIFIED_FILE, 'w') as f:
        json.dump({"notified": list(notified)}, f)

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
📊 /stats — Uso de API
🔔 /suscribir — Notificaciones automáticas
🔕 /desuscribir — Desactivar
❓ /ayuda — Ayuda

🔔 *Usa /suscribir para recibir resultados automáticamente*
"""
    await update.message.reply_text(welcome, parse_mode='Markdown')

async def ayuda(update: Update, context: ContextTypes.DEFAULT_TYPE):
    text = """
📋 *COMANDOS*

/resultados — Últimos resultados con goleadores
/partidos — Próximos partidos
/clasificacion — Tablas de los 12 grupos
/resumen — Resumen del día
/stats — Peticiones API usadas hoy

🔔 *NOTIFICACIONES:*
/suscribir — Recibir resultados automáticos
/desuscribir — Cancelar

💡 El bot consulta la API cada 15 min.
"""
    await update.message.reply_text(text, parse_mode='Markdown')

async def stats(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    count = api.get_request_count()
    remaining = 100 - count
    percentage = (count / 100) * 100
    bar = "█" * int(percentage / 5) + "░" * (20 - int(percentage / 5))
    
    text = f"""
📊 *ESTADÍSTICAS*

🌐 Requests: {count}/100
📊 {bar} {percentage:.0f}%
⏱ Intervalo: 15 min
🔔 Suscriptores: {len(load_subscribers())}
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
        await update.message.reply_text("⏳ Aún no hay resultados.")
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
        
        home_scorers = game.get("home_scorers_list", [])
        away_scorers = game.get("away_scorers_list", [])
        
        text += f"📅 *{date}* | Grupo {group}\n"
        text += f"🏟 {stadium}\n"
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
        await update.message.reply_text("🏁 ¡No hay más partidos!")
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
            text += f"  🕐 {time_str} | {home} vs {away} (G{g['group']})\n"
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
    
    text = "🏆 *CLASIFICACIÓN*\n" + "═" * 35 + "\n\n"
    for group in sorted(standings.keys()):
        teams = standings[group]
        text += f"📊 *GRUPO {group}*\n"
        text += "`Equipo        GF GC DG PTS`\n"
        text += "`" + "─" * 35 + "`\n"
        for i, team in enumerate(teams, 1):
            emoji = "🥇" if i == 1 else "🥈" if i == 2 else "🥉" if i == 3 else "  "
            name = team.get("team_id", "")[:13]
            pts = team.get("pts", 0)
            gf = team.get("gf", 0)
            ga = team.get("ga", 0)
            gd = team.get("gd", 0)
            text += f"`{emoji} {name:<13} {gf}  {ga} {gd:+2d}  {pts}`\n"
        text += "\n"
    
    text += "🥇🥈 Clasifican directo\n🥉 Mejores 3ros"
    await update.message.reply_text(text, parse_mode='Markdown')

async def resumen(update: Update, context: ContextTypes.DEFAULT_TYPE):
    api = CachedMundialAPI()
    try:
        games = await api.get_games_with_details(force_refresh=False)
    finally:
        await api.close()
    
    today = __import__('datetime').datetime.now().strftime("%m/%d/%Y")
    
    finished_today = [g for g in games if g.get("status") == "finished" and today in g.get("local_date", "")]
    upcoming_today = [g for g in games if g.get("status") == "upcoming" and today in g.get("local_date", "")]
    
    text = f"📋 *RESUMEN - {today}*\n\n"
    if finished_today:
        text += "⚽ *RESULTADOS:*\n"
        for g in finished_today:
            text += f"  {g['home_team_name']} {g['home_score']}-{g['away_score']} {g['away_team_name']}\n"
        text += "\n"
    if upcoming_today:
        text += "📅 *PRÓXIMOS:*\n"
        for g in upcoming_today:
            text += f"  {g['home_team_name']} vs {g['away_team_name']}\n"
        text += "\n"
    
    await update.message.reply_text(text, parse_mode='Markdown')

async def suscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    subs = load_subscribers()
    
    if chat_id in subs:
        await update.message.reply_text("🔔 *Ya estás suscrito.*", parse_mode='Markdown')
        return
    
    subs.add(chat_id)
    save_subscribers(subs)
    
    text = """
🔔 *¡SUSCRIPCIÓN ACTIVADA!*

Recibirás automáticamente:
✅ Resultados finales
✅ Resumen diario a las 9:00

Para cancelar: /desuscribir
"""
    await update.message.reply_text(text, parse_mode='Markdown')

async def desuscribir(update: Update, context: ContextTypes.DEFAULT_TYPE):
    chat_id = update.effective_chat.id
    subs = load_subscribers()
    
    if chat_id not in subs:
        await update.message.reply_text("🔕 *No estás suscrito.*", parse_mode='Markdown')
        return
    
    subs.discard(chat_id)
    save_subscribers(subs)
    await update.message.reply_text("🔕 *Notificaciones desactivadas.*", parse_mode='Markdown')