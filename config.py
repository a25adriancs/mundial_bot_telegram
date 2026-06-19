import os
from dotenv import load_dotenv

load_dotenv()

# Telegram
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

# API Mundial
JWT_TOKEN = os.getenv("JWT_TOKEN")
WORLD_CUP_API_BASE = "https://worldcup26.ir"
API_HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

# Archivos locales (fallback)
SUBSCRIBERS_FILE = "subscribers.json"
NOTIFIED_FILE = "notified_matches.json"