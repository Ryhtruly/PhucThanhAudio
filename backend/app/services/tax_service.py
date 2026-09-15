import requests
from app.core.config import settings
from app.services.redis_service import RedisService

redis_cache = RedisService()

def lookup_tax_info(mst: str) -> dict:
    """
    Tra cứu mã số thuế doanh nghiệp từ VietQR API
    Endpoint: https://api.vietqr.io/v2/business/{mst}
    """
    mst_clean = mst.strip().replace(" ", "").replace("-", "")
    if not mst_clean:
        return {"success": False, "error": "Mã số thuế không được để trống"}

    # 1. Kiểm tra Cache trước
    cache_key = f"tax_info:{mst_clean}"
    cached = redis_cache.get(cache_key)
    if cached:
        return cached

    url = f"{settings.VIETQR_BUSINESS_API}/{mst_clean}"
    try:
        res = requests.get(url, timeout=12, headers={"User-Agent": "PhucThanhAudio/1.0"})
        if res.status_code == 200:
            data = res.json()
            if data.get("code") == "00" and isinstance(data.get("data"), dict):
                b = data["data"]
                result = {
                    "success": True,
                    "mst": mst_clean,
                    "company_name": b.get("name", "").strip(),
                    "address": b.get("address", "").strip(),
                    "short_name": b.get("shortName", "").strip(),
                    "representative": "",
                    "raw": b
                }
                # Lưu cache 7 ngày (604800 giây)
                redis_cache.set(cache_key, result, expire_seconds=604800)
                return result
            else:
                return {"success": False, "error": data.get("desc", "Mã số thuế không tồn tại")}
        else:
            return {"success": False, "error": f"Lỗi gọi API VietQR (HTTP {res.status_code})"}
    except requests.exceptions.Timeout:
        return {"success": False, "error": "Cổng tra cứu VietQR phản hồi chậm (Timeout)"}
    except Exception as e:
        return {"success": False, "error": f"Không thể kết nối dịch vụ tra MST: {str(e)}"}
