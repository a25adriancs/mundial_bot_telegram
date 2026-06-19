import aiohttp
import time
from typing import Optional, List, Dict, Tuple

from config import WORLD_CUP_API_BASE, API_HEADERS

class CachedMundialAPI:
    """
    Cliente oficial para worldcup26.ir con JWT auth y cache.
    Documentación: https://worldcup26.ir/api-docs/
    """
    
    def __init__(self):
        self.session: Optional[aiohttp.ClientSession] = None
        self._cache: Dict[str, Tuple[any, float]] = {}
        self._request_count = 0
    
    async def _get_session(self):
        if self.session is None or self.session.closed:
            self.session = aiohttp.ClientSession(headers=API_HEADERS)
        return self.session
    
    async def close(self):
        if self.session and not self.session.closed:
            await self.session.close()
    
    def _is_cache_valid(self, key: str, ttl: int = 600) -> bool:
        if key not in self._cache:
            return False
        _, timestamp = self._cache[key]
        return (time.time() - timestamp) < ttl
    
    def _get_from_cache(self, key: str):
        if self._is_cache_valid(key):
            data, _ = self._cache[key]
            print(f"✅ CACHE HIT: {key}")
            return data
        return None
    
    def _save_to_cache(self, key: str, data):
        self._cache[key] = (data, time.time())
        print(f"💾 CACHE GUARDADO: {key}")
    
    async def _api_get(self, endpoint: str) -> any:
        """Petición GET con autenticación JWT"""
        try:
            session = await self._get_session()
            url = f"{WORLD_CUP_API_BASE}{endpoint}"
            async with session.get(url, timeout=15) as resp:
                self._request_count += 1
                print(f"🌐 API REQUEST #{self._request_count} -> {url}")
                
                if resp.status == 401:
                    print("❌ Token JWT expirado o inválido")
                    return None
                if resp.status == 429:
                    print("❌ Rate limit alcanzado")
                    return None
                
                if resp.status == 200:
                    data = await resp.json()
                    return data
                return None
        except Exception as e:
            print(f"❌ Error API: {e}")
            return None
    
    async def get_all_games(self, force_refresh: bool = False) -> List[Dict]:
        cache_key = "games"
        if not force_refresh:
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached
        
        data = await self._api_get("/get/games")
        if data and "games" in data:
            games = data["games"]
            self._save_to_cache(cache_key, games)
            return games
        elif data and isinstance(data, list):
            self._save_to_cache(cache_key, data)
            return data
        return []
    
    async def get_all_groups(self, force_refresh: bool = False) -> List[Dict]:
        cache_key = "groups"
        if not force_refresh:
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached
        
        data = await self._api_get("/get/groups")
        if data and "groups" in data:
            groups = data["groups"]
            self._save_to_cache(cache_key, groups)
            return groups
        elif data and isinstance(data, list):
            self._save_to_cache(cache_key, data)
            return data
        return []
    
    async def get_all_teams(self, force_refresh: bool = False) -> List[Dict]:
        cache_key = "teams"
        if not force_refresh:
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached
        
        data = await self._api_get("/get/teams")
        if data and "teams" in data:
            teams = data["teams"]
            self._save_to_cache(cache_key, teams)
            return teams
        elif data and isinstance(data, list):
            self._save_to_cache(cache_key, data)
            return data
        return []
    
    async def get_all_stadiums(self, force_refresh: bool = False) -> List[Dict]:
        cache_key = "stadiums"
        if not force_refresh:
            cached = self._get_from_cache(cache_key)
            if cached is not None:
                return cached
        
        data = await self._api_get("/get/stadiums")
        if data and "stadiums" in data:
            stadiums = data["stadiums"]
            self._save_to_cache(cache_key, stadiums)
            return stadiums
        elif data and isinstance(data, list):
            self._save_to_cache(cache_key, data)
            return data
        return []
    
    async def get_standings_from_groups(self, force_refresh: bool = False) -> Dict[str, List[Dict]]:
        groups = await self.get_all_groups(force_refresh=force_refresh)
        standings = {}
        
        for group in groups:
            group_name = group.get("group", "")
            teams = group.get("teams", [])
            if group_name and teams:
                for team in teams:
                    team["pts"] = int(team.get("pts", 0))
                    team["gf"] = int(team.get("gf", 0))
                    team["ga"] = int(team.get("ga", 0))
                    team["gd"] = team["gf"] - team["ga"]
                
                teams.sort(key=lambda x: (x["pts"], x["gd"], x["gf"]), reverse=True)
                standings[group_name] = teams
        
        return standings
    
    async def get_games_with_details(self, force_refresh: bool = False) -> List[Dict]:
        games = await self.get_all_games(force_refresh=force_refresh)
        teams = await self.get_all_teams(force_refresh=False)
        stadiums = await self.get_all_stadiums(force_refresh=False)
        
        teams_by_id = {t.get("id"): t for t in teams}
        stadiums_by_id = {s.get("id"): s for s in stadiums}
        
        enriched_games = []
        for game in games:
            enriched = dict(game)
            
            home_id = game.get("home_team_id")
            away_id = game.get("away_team_id")
            stadium_id = game.get("stadium_id")
            
            if home_id and home_id in teams_by_id:
                enriched["home_team_name"] = teams_by_id[home_id].get("name_en", "")
                enriched["home_team_flag"] = teams_by_id[home_id].get("flag", "")
            else:
                enriched["home_team_name"] = game.get("home_team_name_en", "")
            
            if away_id and away_id in teams_by_id:
                enriched["away_team_name"] = teams_by_id[away_id].get("name_en", "")
                enriched["away_team_flag"] = teams_by_id[away_id].get("flag", "")
            else:
                enriched["away_team_name"] = game.get("away_team_name_en", "")
            
            if stadium_id and stadium_id in stadiums_by_id:
                enriched["stadium_name"] = stadiums_by_id[stadium_id].get("name_en", "")
                enriched["stadium_city"] = stadiums_by_id[stadium_id].get("city_en", "")
            else:
                enriched["stadium_name"] = ""
                enriched["stadium_city"] = ""
            
            finished = game.get("finished", "FALSE")
            time_elapsed = game.get("time_elapsed", "notstarted")
            
            if finished == "TRUE":
                enriched["status"] = "finished"
            elif time_elapsed not in ["notstarted", "null"]:
                enriched["status"] = "live"
            else:
                enriched["status"] = "upcoming"
            
            try:
                enriched["home_score"] = int(game.get("home_score", 0))
                enriched["away_score"] = int(game.get("away_score", 0))
            except:
                enriched["home_score"] = 0
                enriched["away_score"] = 0
            
            home_scorers = game.get("home_scorers", "null")
            away_scorers = game.get("away_scorers", "null")
            enriched["home_scorers_list"] = self._parse_scorers(home_scorers)
            enriched["away_scorers_list"] = self._parse_scorers(away_scorers)
            
            enriched_games.append(enriched)
        
        return enriched_games
    
    def _parse_scorers(self, scorers_str: str) -> List[str]:
        if scorers_str in ["null", "None", None, ""]:
            return []
        return [s.strip() for s in scorers_str.split(",") if s.strip()]
    
    def get_request_count(self) -> int:
        return self._request_count
    
    def reset_request_count(self):
        self._request_count = 0