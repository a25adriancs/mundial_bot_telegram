"""
Cliente de la API del Mundial con cache.
"""
import aiohttp
import time
from typing import List, Dict, Optional

from config import WORLD_CUP_API_BASE, API_HEADERS

class MundialAPI:
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self._cache = {}
        self._request_count = 0
    
    async def _get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(headers=API_HEADERS)
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    def _cache_get(self, key: str, ttl: int = 600):
        if key in self._cache:
            data, ts = self._cache[key]
            if time.time() - ts < ttl:
                return data
        return None
    
    def _cache_set(self, key: str, data):
        self._cache[key] = (data, time.time())
    
    async def _request(self, endpoint: str):
        try:
            session = await self._get_session()
            url = f"{WORLD_CUP_API_BASE}{endpoint}"
            async with session.get(url, timeout=15) as resp:
                self._request_count += 1
                if resp.status == 200:
                    return await resp.json()
                return None
        except Exception as e:
            print(f"API Error: {e}")
            return None
    
    async def get_games(self, force_refresh=False):
        key = "games"
        if not force_refresh:
            cached = self._cache_get(key)
            if cached: return cached
        
        data = await self._request("/get/games")
        if data and "games" in data:
            games = data["games"]
            self._cache_set(key, games)
            return games
        return []
    
    async def get_teams(self, force_refresh=False):
        key = "teams"
        if not force_refresh:
            cached = self._cache_get(key)
            if cached: return cached
        
        data = await self._request("/get/teams")
        if data and "teams" in data:
            teams = data["teams"]
            self._cache_set(key, teams)
            return teams
        return []
    
    async def get_stadiums(self, force_refresh=False):
        key = "stadiums"
        if not force_refresh:
            cached = self._cache_get(key)
            if cached: return cached
        
        data = await self._request("/get/stadiums")
        if data and "stadiums" in data:
            stadiums = data["stadiums"]
            self._cache_set(key, stadiums)
            return stadiums
        return []
    
    async def get_enriched_games(self, force_refresh=False):
        """Partidos con nombres de equipos y estadios"""
        games = await self.get_games(force_refresh)
        teams = await self.get_teams(False)
        stadiums = await self.get_stadiums(False)
        
        teams_by_id = {t.get("id"): t for t in teams}
        stadiums_by_id = {s.get("id"): s for s in stadiums}
        
        enriched = []
        for game in games:
            g = dict(game)
            home_id = game.get("home_team_id")
            away_id = game.get("away_team_id")
            stadium_id = game.get("stadium_id")
            
            if home_id and home_id in teams_by_id:
                g["home_team_name"] = teams_by_id[home_id].get("name_en", "")
                g["home_team_flag"] = teams_by_id[home_id].get("flag", "")
            
            if away_id and away_id in teams_by_id:
                g["away_team_name"] = teams_by_id[away_id].get("name_en", "")
                g["away_team_flag"] = teams_by_id[away_id].get("flag", "")
            
            if stadium_id and stadium_id in stadiums_by_id:
                g["stadium_name"] = stadiums_by_id[stadium_id].get("name_en", "")
                g["stadium_city"] = stadiums_by_id[stadium_id].get("city_en", "")
            
            # Estado
            finished = game.get("finished", "FALSE")
            time_elapsed = game.get("time_elapsed", "notstarted")
            if finished == "TRUE":
                g["status"] = "finished"
            elif time_elapsed not in ["notstarted", "null"]:
                g["status"] = "live"
            else:
                g["status"] = "upcoming"
            
            # Scores
            try:
                g["home_score"] = int(game.get("home_score", 0))
                g["away_score"] = int(game.get("away_score", 0))
            except:
                g["home_score"] = 0
                g["away_score"] = 0
            
            # Goleadores
            g["home_scorers_list"] = self._parse_scorers(game.get("home_scorers", "null"))
            g["away_scorers_list"] = self._parse_scorers(game.get("away_scorers", "null"))
            
            enriched.append(g)
        
        return enriched
    
    def _parse_scorers(self, scorers_str):
        if scorers_str in ["null", "None", None, ""]:
            return []
        return [s.strip() for s in scorers_str.split(",") if s.strip()]
    
    def get_request_count(self):
        return self._request_count