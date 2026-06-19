"""
Script ejecutado por GitHub Actions cada 15 minutos.
Verifica resultados nuevos y envía notificaciones.
"""
import os
import json
import asyncio
from telegram import Bot

from config import BOT_TOKEN
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

async def main():
    bot = Bot(token=BOT_TOKEN)
    api = CachedMundialAPI()
    
    try:
        games = await api.get_games_with_details(force_refresh=True)
        
        notified = load_notified()
        subs = load_subscribers()
        
        if not subs:
            print("No hay suscriptores.")
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
            
            mensaje += "\n📊 /clasificacion para ver tablas"
            
            for chat_id in subs:
                try:
                    await bot.send_message(chat_id=chat_id, text=mensaje, parse_mode='Markdown')
                    print(f"✅ Enviado a {chat_id}")
                except Exception as e:
                    print(f"❌ Error a {chat_id}: {e}")
                    if "chat not found" in str(e).lower():
                        subs.discard(chat_id)
                        save_subscribers(subs)
        
        print(f"Total requests API hoy: {api.get_request_count()}")
        
    finally:
        await api.close()
        await bot.session.close()

if __name__ == "__main__":
    asyncio.run(main())