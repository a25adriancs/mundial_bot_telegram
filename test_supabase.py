from supabase import create_client
import os
from dotenv import load_dotenv

load_dotenv()

# Telegram
BOT_TOKEN = os.getenv("BOT_TOKEN")

# Supabase
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Test insert
client.table("subscribers").upsert({
    "chat_id": 123456789,
    "username": "test_user",
    "chat_type": "private",
    "active": True
}).execute()

# Test select
response = client.table("subscribers").select("*").execute()
print(response.data)

# Test notified
client.table("notified_matches").upsert({
    "match_id": "test_1"
}).execute()

response2 = client.table("notified_matches").select("*").execute()
print(response2.data)