import json
try:
    import redis
except ImportError:
    redis = None
from typing import Any, Optional

class RedisService:
    def __init__(self, host: str = "localhost", port: int = 6379, db: int = 0):
        self._fallback_cache = {}
        self.is_connected = False
        self.client = None
        
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
            print(" Redis Connected successfully to localhost:6379/0")
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
