import os
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from app.core.config import settings
from app.api.v1.endpoints import router as api_v1_router

app = FastAPI(
    title=settings.PROJECT_NAME,
    version=settings.VERSION,
    description="Backend Service xử lý Tự động hóa & Tích hợp Airtable / ZBS WIFIM / VietQR cho Phúc Thanh Audio Group."
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount thư mục xuất file văn bản
os.makedirs(settings.OUTPUT_DIR, exist_ok=True)
app.mount("/output", StaticFiles(directory=settings.OUTPUT_DIR), name="output")

# Include Routers
from app.api.bot_endpoints import bot_router
app.include_router(api_v1_router, prefix=settings.API_V1_STR)
app.include_router(bot_router, prefix="/api")

@app.get("/")
def root():
    return {
        "status": "online",
        "service": settings.PROJECT_NAME,
        "version": settings.VERSION,
        "docs_url": "/docs",
        "airtable_base": settings.AIRTABLE_BASE_ID
    }
