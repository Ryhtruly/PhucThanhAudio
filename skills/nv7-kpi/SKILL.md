---
name: nv7-kpi
description: Tự động tổng hợp và gửi báo cáo chỉ số kinh doanh, doanh thu hợp đồng, tỷ lệ chốt deal và phân bổ giải pháp cho CEO và Ban Giám Đốc.
---

# NV7: Báo Cáo KPI & Doanh Thu CEO

Skill này phục vụ nhu cầu điều hành của CEO và Ban Giám Đốc Phúc Thanh Audio: tổng hợp toàn bộ tình hình kinh doanh, doanh số thực tế, số lượng hợp đồng, báo giá phát hành và nhóm giải pháp bán chạy nhất.

## 1. Khi Nào Kích Hoạt Skill?
- Lịch Cron tự động của Bot lúc 7h30 sáng Thứ 2 hàng tuần gửi vào kênh riêng của Ban Giám Đốc / CEO Telegram.
- Hoặc khi CEO hỏi trực tiếp trong chat:
  - *"Báo cáo doanh thu và KPI tháng này thế nào?"*
  - *"Tình hình kinh doanh hiện tại của công ty"*
  - *"Doanh số hợp đồng đã ký được bao nhiêu rồi?"*

## 2. Gọi Backend API

- **Endpoint:** `GET https://phucthanhaudio.wiai.vn/api/nv7/kpi/report`
- **Headers:**
  - `ngrok-skip-browser-warning: true`
- **Method:** `GET`
- **Tham số:** Không cần tham số.

## 3. Cách Bot Xử Lý Phản Hồi

Backend tự động tính toán tổng doanh số từ các Hợp đồng có giá trị thực, thống kê deal Won, tổng hợp tỷ trọng danh mục giải pháp (Karaoke VIP, Bar/Lounge, Hội trường, Villa...) và trả về:
```json
{
  "action": "ANSWER",
  "blocks": [
    "📊 **Báo Cáo Điều Hành Doanh Thu (CEO) — Phúc Thanh Audio**",
    "• **Tổng doanh thu hợp đồng:** `3,850,000,000 đ` (~ 3.85 Tỷ)",
    "• **Tổng số Hợp đồng:** 14 hợp đồng",
    "• **Báo giá ISO phát hành:** 28 hồ sơ",
    "• **Deal chốt thành công (Won):** 8 khách hàng",
    "• **Nhóm giải pháp dẫn đầu:** **Karaoke VIP Kinh Doanh** (42%)",
    "• **Cập nhật:** 15/09/2026 08:00"
  ],
  "data": {
    "total_revenue": 3850000000,
    "total_contracts": 14,
    "total_quotes": 28,
    "won_deals": 8,
    "solution_breakdown": [
      { "name": "Karaoke VIP Kinh Doanh", "percent": 42 },
      { "name": "Bar & Lounge Cao Cấp", "percent": 28 },
      { "name": "Hội Trường & Sự Kiện", "percent": 18 },
      { "name": "Dàn Gia Đình Cao Cấp", "percent": 12 }
    ]
  }
}
```

- **Bot chỉ việc đẩy toàn bộ các dòng `blocks` ra khung chat** gửi trực tiếp cho CEO hoặc Ban Giám Đốc. Không cần phải tính toán lại bất kỳ dữ liệu nào.
