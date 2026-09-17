import os
import json
try:
    import redis
except ImportError:
    redis = None
from typing import Any, Optional
from app.core.config import settings

class RedisService:
    def __init__(self, host: Optional[str] = None, port: Optional[int] = None, db: Optional[int] = None):
        self._fallback_cache = {}
        self.is_connected = False
        self.client = None
        
        host = host or os.getenv("REDIS_HOST", getattr(settings, "REDIS_HOST", "localhost"))
        port = int(port or os.getenv("REDIS_PORT", getattr(settings, "REDIS_PORT", 6379)))
        db = int(db if db is not None else os.getenv("REDIS_DB", getattr(settings, "REDIS_DB", 0)))

        if redis is None:
            # Fallback memory cache khi chưa cài thư viện redis
            return

        try:
            self.client = redis.Redis(
                host=host, 
                port=port, 
                db=db, 
                decode_responses=True,
                socket_connect_timeout=2
            )
            self.client.ping()
            self.is_connected = True
            print(f" Redis Connected successfully to {host}:{port}/{db}")
        except Exception as e:
            print(f"[Redis Warning] Cannot connect to Redis ({e}). Running with fallback memory cache.")
            self.client = None
            self.is_connected = False

    def get(self, key: str) -> Optional[Any]:
        if self.is_connected and self.client:
            try:
                val = self.client.get(key)
                if val:
                    return json.loads(val)
            except Exception as e:
                print(f"[Redis Get Error] {e}")
        return self._fallback_cache.get(key)

    def set(self, key: str, value: Any, expire_seconds: int = 300) -> bool:
        serialized = json.dumps(value, ensure_ascii=False)
        if self.is_connected and self.client:
            try:
                self.client.setex(key, expire_seconds, serialized)
                return True
            except Exception as e:
                print(f"[Redis Set Error] {e}")
        self._fallback_cache[key] = value
        return True

    def delete(self, pattern_or_key: str):
        if self.is_connected and self.client:
            try:
                if "*" in pattern_or_key:
                    keys = self.client.keys(pattern_or_key)
                    if keys:
                        self.client.delete(*keys)
                else:
                    self.client.delete(pattern_or_key)
            except Exception as e:
                print(f"[Redis Delete Error] {e}")
        else:
            self._fallback_cache.pop(pattern_or_key, None)

    def get_info(self) -> dict:
        if self.is_connected and self.client:
            try:
                info = self.client.info()
                return {
                    "status": "connected",
                    "version": info.get("redis_version"),
                    "used_memory_human": info.get("used_memory_human"),
                    "connected_clients": info.get("connected_clients"),
                    "total_keys": self.client.dbsize()
                }
            except Exception as e:
                pass
        return {
            "status": "fallback_memory",
            "total_keys": len(self._fallback_cache)
        }

redis_client = RedisService()
