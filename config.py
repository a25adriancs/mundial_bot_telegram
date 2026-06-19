import os
from dotenv import load_dotenv

load_dotenv()

BOT_TOKEN = os.getenv("BOT_TOKEN")
JWT_TOKEN = os.getenv("JWT_TOKEN")

WORLD_CUP_API_BASE = "https://worldcup26.ir"
API_HEADERS = {
    "Authorization": f"Bearer {JWT_TOKEN}",
    "Content-Type": "application/json"
}

SUBSCRIBERS_FILE = "subscribers.json"
NOTIFIED_FILE = "notified_matches.json"

CHECK_INTERVAL_NORMAL = 900
CHECK_INTERVAL_MATCH = 300
CHECK_INTERVAL_NO_MATCH = 1800