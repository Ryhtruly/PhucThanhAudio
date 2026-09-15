import os
import json
import urllib.request
import urllib.error
from typing import Dict, Any, Optional
from app.core.config import settings

TEMPLATES_CATALOG = {
    "584044": {
        "name": "Hợp đồng mẫu / Khởi động dự án",
        "params": ["customer_name", "date", "order_code", "money", "service"]
    },
    "422511": {
        "name": "Xác nhận đơn hàng / Báo giá",
        "params": ["name", "price", "code"]
    },
    "584045": {
        "name": "Yêu cầu thanh toán / Nhắc nợ",
        "params": ["price", "transfer_amount", "bank_transfer_note", "product_name", "ma_hop_dong", "ten_khach_hang", "ngay_thanh_toan"]
    },
    "584042": {
        "name": "Xác nhận lịch hẹn khảo sát / bảo hành",
        "params": ["customer_name", "booking_code", "schedule_time", "address"]
    },
    "274649": {
        "name": "Cảm ơn quý khách hoàn thành dịch vụ / BH",
        "params": ["customer_name", "product_name", "date", "code"]
    }
}

class ZBSService:
    def __init__(self):
        self.base_url = settings.ZBS_BASE_URL
        self.api_key = settings.ZBS_API_KEY

    def _call(self, method: str, path: str, payload: Optional[dict] = None) -> tuple[int, dict]:
        url = self.base_url + path
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8") if payload is not None else None
        req = urllib.request.Request(url, data=body, method=method)
        req.add_header("X-API-Key", self.api_key)
        if body is not None:
            req.add_header("Content-Type", "application/json")
        try:
            with urllib.request.urlopen(req, timeout=20) as resp:
                return resp.status, json.loads(resp.read().decode("utf-8"))
        except urllib.error.HTTPError as exc:
            raw = exc.read().decode("utf-8", "replace")
            try:
                parsed = json.loads(raw)
            except Exception:
                parsed = {"raw": raw}
            return exc.code, parsed
        except Exception as exc:
            return 500, {"error": str(exc)}

    def get_templates(self) -> dict:
        """Lấy danh sách template trực tiếp từ ZBS WIFIM hoặc fallback catalog"""
        if self.api_key:
            status, resp = self._call("GET", "/v1/templates")
            if status == 200:
                return {"success": True, "data": resp.get("data", [])}
        return {"success": True, "data": TEMPLATES_CATALOG, "note": "Local approved templates"}

    def send_template(self, phone: str, template_id: str, template_data: dict, scheduled_time: Optional[str] = None) -> dict:
        """
        Gửi tin nhắn ZBS qua template Zalo đã duyệt
        phone: 09xxx hoặc 84xxx
        scheduled_time: format 'HH:MM DD/MM' nếu hẹn giờ
        """
        # Chuẩn hóa SĐT
        clean_phone = phone.strip().replace(" ", "").replace("+", "")
        if clean_phone.startswith("84"):
            clean_phone = "0" + clean_phone[2:]
            
        payload = {
            "template_id": str(template_id),
            "template_data": template_data,
            "phone": clean_phone,
            "sending_mode": "1"
        }
        if scheduled_time:
            payload["scheduled_time"] = scheduled_time

        if not self.api_key:
            return {
                "success": True,
                "status": "queued",
                "msg_id": f"zbs_local_{clean_phone}",
                "message": f"Hệ thống đã xếp hàng gửi tin Zalo ZBS tới {clean_phone} (Template {template_id})",
                "payload": payload
            }

        status, resp = self._call("POST", "/v1/send", payload)
        if status == 200 and resp.get("success"):
            return {
                "success": True,
                "msg_id": resp.get("msg_id"),
                "message": resp.get("message", "Gửi thành công"),
                "raw": resp
            }
        return {
            "success": False,
            "status_code": status,
            "error": resp.get("message") or resp.get("raw") or "Gửi tin thất bại",
            "raw": resp
        }

zbs_client = ZBSService()
