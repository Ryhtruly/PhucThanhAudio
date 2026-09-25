import os

try:
    from pydantic_settings import BaseSettings
except ImportError:
    try:
        from pydantic import BaseSettings
    except ImportError:
        class BaseSettings:
            def __init__(self, **kwargs):
                for k, v in kwargs.items():
                    setattr(self, k, v)

class Settings(BaseSettings):
    PROJECT_NAME: str = "Phúc Thanh Audio Automation API"
    VERSION: str = "1.0.0"
    API_V1_STR: str = "/api/v1"
    
    # Airtable Configuration
    AIRTABLE_API_KEY: str = os.getenv("AIRTABLE_API_KEY", "")
    AIRTABLE_BASE_ID: str = os.getenv("AIRTABLE_BASE_ID", "applSd5Z3mQyCsKxN")
    
    # ZBS WIFIM API Configuration
    ZBS_BASE_URL: str = os.getenv("ZBS_BASE_URL", "https://zbs.wifim.vn/api")
    ZBS_API_KEY: str = os.getenv("ZBS_API_KEY", "")
    
    # External APIs
    VIETQR_BUSINESS_API: str = os.getenv("VIETQR_BUSINESS_API", "https://api.vietqr.io/v2/business")
    
    # Paths
    BASE_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))
    INPUT_TEMPLATE_DIR: str = os.path.abspath(os.path.join(BASE_DIR, "..", "input"))
    OUTPUT_DIR: str = os.path.abspath(os.path.join(BASE_DIR, "output"))
    
    # Google Docs Template IDs
    GDOC_CONTRACT_TEMPLATE_ID: str = os.getenv("GDOC_CONTRACT_TEMPLATE_ID", "14WNK4q6Kqf9AsurGueLQAzNH6hjNVnSfzdzLusNIM5Q")
    GDOC_QUOTE_TEMPLATE_ID: str = os.getenv("GDOC_QUOTE_TEMPLATE_ID", "1_Ptl1QbzC8p8ckjBx65TmVFn5X4R9l28ai0O-wF2gqg")

    # Redis Cache Settings
    REDIS_HOST: str = os.getenv("REDIS_HOST", "localhost")
    REDIS_PORT: int = int(os.getenv("REDIS_PORT", "6379"))
    REDIS_DB: int = int(os.getenv("REDIS_DB", "0"))

    class Config:
        case_sensitive = True
        env_file = (
            os.path.join(os.path.dirname(__file__), "..", "..", ".env"),
            os.path.join(os.path.dirname(__file__), "..", "..", "..", ".env"),
            ".env"
        )
        extra = "ignore"

settings = Settings()
