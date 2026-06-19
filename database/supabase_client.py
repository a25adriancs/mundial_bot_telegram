"""
Cliente de Supabase para guardar suscriptores y notificaciones.
"""
import os
from supabase import create_client, Client

from config import SUPABASE_URL, SUPABASE_KEY

class SupabaseDB:
    def __init__(self):
        self.client: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # ========== SUSCRIPTORES ==========
    
    def add_subscriber(self, chat_id: int, username: str = None, chat_type: str = "private"):
        """Añade un suscriptor"""
        try:
            self.client.table("subscribers").upsert({
                "chat_id": chat_id,
                "username": username,
                "chat_type": chat_type,
                "active": True
            }).execute()
            return True
        except Exception as e:
            print(f"Error adding subscriber: {e}")
            return False
    
    def remove_subscriber(self, chat_id: int):
        """Elimina un suscriptor"""
        try:
            self.client.table("subscribers").update({"active": False}).eq("chat_id", chat_id).execute()
            return True
        except Exception as e:
            print(f"Error removing subscriber: {e}")
            return False
    
    def get_active_subscribers(self):
        """Obtiene todos los suscriptores activos"""
        try:
            response = self.client.table("subscribers").select("*").eq("active", True).execute()
            return response.data or []
        except Exception as e:
            print(f"Error getting subscribers: {e}")
            return []
    
    # ========== NOTIFICADOS ==========
    
    def is_notified(self, match_id: str) -> bool:
        """Verifica si un partido ya fue notificado"""
        try:
            response = self.client.table("notified_matches").select("*").eq("match_id", match_id).execute()
            return len(response.data) > 0
        except:
            return False
    
    def mark_notified(self, match_id: str):
        """Marca un partido como notificado"""
        try:
            self.client.table("notified_matches").upsert({"match_id": match_id}).execute()
            return True
        except Exception as e:
            print(f"Error marking notified: {e}")
            return False
    
    # ========== ESTADÍSTICAS ==========
    
    def get_stats(self):
        """Estadísticas de uso"""
        try:
            subs = self.client.table("subscribers").select("*").eq("active", True).execute()
            notified = self.client.table("notified_matches").select("*").execute()
            return {
                "subscribers": len(subs.data),
                "notified_matches": len(notified.data)
            }
        except:
            return {"subscribers": 0, "notified_matches": 0}