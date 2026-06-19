"""
Servicio de notificaciones.
"""
from telegram import Bot

from database.supabase_client import SupabaseDB
from services.api_football import MundialAPI

class NotificationService:
    def __init__(self):
        self.db = SupabaseDB()
        self.api = MundialAPI()
    
    async def check_and_notify(self, bot: Bot):
        """Verifica resultados nuevos y envía notificaciones"""
        try:
            games = await self.api.get_enriched_games(force_refresh=True)
            subscribers = self.db.get_active_subscribers()
            
            if not subscribers:
                print("No hay suscriptores activos")
                return
            
            new_finished = []
            for game in games:
                match_id = str(game.get("id", ""))
                if game.get("status") == "finished" and match_id and not self.db.is_notified(match_id):
                    new_finished.append(game)
                    self.db.mark_notified(match_id)
            
            for game in new_finished:
                await self._send_game_notification(bot, game, subscribers)
            
            print(f"Requests API: {self.api.get_request_count()}")
            
        finally:
            await self.api.close()
    
    async def _send_game_notification(self, bot: Bot, game: dict, subscribers: list):
        """Envía notificación de un partido a todos los suscriptores"""
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
            winner = f"🏆 *¡Victoria de {home}!*"
        elif ag > hg:
            winner = f"🏆 *¡Victoria de {away}!*"
        else:
            winner = "🤝 *¡Empate!*"
        
        text = f"""
🔔 *¡RESULTADO FINAL!* 🔔

{winner}

📅 {date} | Grupo {group}
🏟 {stadium}

⚽ *{home}* {hg} - {ag} *{away}*
"""
        if home_scorers:
            text += f"\n🎯 *Goleadores {home}:*\n"
            for s in home_scorers:
                text += f"  • {s}\n"
        
        if away_scorers:
            text += f"\n🎯 *Goleadores {away}:*\n"
            for s in away_scorers:
                text += f"  • {s}\n"
        
        text += "\n📊 /clasificacion para ver tablas"
        
        for sub in subscribers:
            try:
                await bot.send_message(
                    chat_id=sub["chat_id"],
                    text=text,
                    parse_mode="Markdown"
                )
                print(f"✅ Enviado a {sub['chat_id']}")
            except Exception as e:
                print(f"❌ Error a {sub['chat_id']}: {e}")
                if "chat not found" in str(e).lower():
                    self.db.remove_subscriber(sub["chat_id"])