"""
Cliente de Supabase con lazy loading.
NO se conecta hasta que se llama a un método.
"""
import os
from supabase import create_client, Client

class SupabaseDB:
    _client = None
    
    @classmethod
    def _get_client(cls):
        if cls._client is None:
            url = os.getenv("SUPABASE_URL")
            key = os.getenv("SUPABASE_KEY")
            if not url or not key:
                print(f"ERROR: SUPABASE_URL={url}, SUPABASE_KEY={'set' if key else 'missing'}")
                raise ValueError("SUPABASE_URL and SUPABASE_KEY must be set")
            cls._client = create_client(url, key)
        return cls._client
    
    def add_subscriber(self, chat_id, username=None, chat_type="private"):
        try:
            self._get_client().table("subscribers").upsert({
                "chat_id": chat_id,
                "username": username,
                "chat_type": chat_type,
                "active": True
            }).execute()
            return True
        except Exception as e:
            print(f"Error add_subscriber: {e}")
            return False
    
    def remove_subscriber(self, chat_id):
        try:
            self._get_client().table("subscribers").update({"active": False}).eq("chat_id", chat_id).execute()
            return True
        except Exception as e:
            print(f"Error remove_subscriber: {e}")
            return False
    
    def get_active_subscribers(self):
        try:
            response = self._get_client().table("subscribers").select("*").eq("active", True).execute()
            return response.data or []
        except Exception as e:
            print(f"Error get_active_subscribers: {e}")
            return []
    
    def is_notified(self, match_id):
        try:
            response = self._get_client().table("notified_matches").select("*").eq("match_id", match_id).execute()
            return len(response.data) > 0
        except:
            return False
    
    def mark_notified(self, match_id):
        try:
            self._get_client().table("notified_matches").upsert({"match_id": match_id}).execute()
            return True
        except Exception as e:
            print(f"Error mark_notified: {e}")
            return False