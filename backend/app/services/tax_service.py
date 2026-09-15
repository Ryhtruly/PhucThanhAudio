import requests
from app.core.config import settings

def lookup_tax_info(mst: str) -> dict:
    """
    Tra cứu mã số thuế doanh nghiệp từ VietQR API
    Endpoint: https://api.vietqr.io/v2/business/{mst}
    """
    mst_clean = mst.strip().replace(" ", "").replace("-", "")
    if not mst_clean:
        return {"success": False, "error": "Mã số thuế không được để trống"}
        
    url = f"{settings.VIETQR_BUSINESS_API}/{mst_clean}"
    try:
        res = requests.get(url, timeout=10)
        if res.status_code == 200:
            data = res.json()
            if data.get("code") == "00" and "data" in data:
                b = data["data"]
                return {
                    "success": True,
                    "mst": mst_clean,
                    "company_name": b.get("name", "").strip(),
                    "address": b.get("address", "").strip(),
                    "short_name": b.get("shortName", "").strip(),
                    "representative": "", # VietQR thường có tên đại diện nếu có
                    "raw": b
                }
            else:
                return {"success": False, "error": data.get("desc", "Mã số thuế không tồn tại")}
        else:
            return {"success": False, "error": f"Lỗi gọi API VietQR (HTTP {res.status_code})"}
    except Exception as e:
        return {"success": False, "error": f"Không thể kết nối dịch vụ tra MST: {str(e)}"}
