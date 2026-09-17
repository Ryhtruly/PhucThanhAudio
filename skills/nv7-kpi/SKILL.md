---
name: nv7-kpi
description: Tổng hợp chỉ số kinh doanh, doanh thu thuần trước thuế VAT, số lượng hợp đồng đã ký và phân bổ doanh số theo nhóm giải pháp cho Ban Giám Đốc.
---

# NV7: Tổng Quan Điều Hành & Báo Cáo Doanh Thu

Skill này phục vụ nhu cầu điều hành của CEO và Ban Giám Đốc Phúc Thanh Audio: tổng hợp toàn bộ tình hình kinh doanh, doanh số thực tế, số lượng hợp đồng, báo giá phát hành và nhóm giải pháp chiếm tỷ trọng lớn nhất.

## 1. Khi Nào Kích Hoạt Skill?
- Lịch tự động lúc 7h30 sáng Thứ 2 hàng tuần gửi vào kênh riêng của Ban Giám Đốc / CEO Telegram.
- Hoặc khi CEO hỏi trực tiếp trong chat:
  - *"Báo cáo doanh thu và KPI tháng này thế nào?"*
  - *"Tình hình kinh doanh hiện tại của công ty"*
  - *"Doanh số hợp đồng đã ký được bao nhiêu rồi?"*

## 2. Gọi Backend API

- **Endpoint:** `GET https://apiphucthanhaudio.wiai.vn/api/nv7/kpi/report`
- **Headers:**
  - `ngrok-skip-browser-warning: true`
- **Method:** `GET`
- **Tham số:** Không cần tham số.

## 3. Cách Xử Lý Phản Hồi

Backend tự động tính toán tổng doanh số từ các Hợp đồng có giá trị thực (chuẩn hóa doanh thu thuần trước thuế VAS), thống kê số hợp đồng đã ký, tổng hợp tỷ trọng danh mục giải pháp (Karaoke VIP, Bar/Lounge, Hội trường, Villa...) và trả về:
```json
{
  "action": "ANSWER",
  "blocks": [
    "📊 **Báo Cáo Điều Hành Doanh Thu — Phúc Thanh Audio**",
    "• **Tổng doanh thu thuần:** `3,850,000,000 đ` (~ 3.85 Tỷ)",
    "• **Tổng số Hợp đồng phát hành:** 14 hợp đồng",
    "• **Báo giá dự án phát hành:** 28 hồ sơ",
    "• **Hợp đồng đã ký:** 8 khách hàng",
    "• **Nhóm giải pháp dẫn đầu:** **Karaoke VIP & Lounge** (42%)",
    "• **Cập nhật:** 17/09/2026"
  ],
  "data": {
    "total_revenue": 3850000000,
    "total_contracts": 14,
    "total_quotes": 28,
    "won_deals": 8,
    "solution_breakdown": [
      { "name": "Karaoke VIP & Lounge", "percent": 42 },
      { "name": "Bar & Vũ Trường", "percent": 28 },
      { "name": "Hội Trường & Hội Thảo", "percent": 18 },
      { "name": "Dàn Gia Đình Cao Cấp", "percent": 12 }
    ]
  }
}
```

- **Trợ lý hiển thị toàn bộ các dòng `blocks` ra khung chat** gửi trực tiếp cho Ban Giám Đốc.
- Ban Giám Đốc có thể truy cập Web Quản Trị tại `https://phucthanhaudio.wiai.vn/` để xem trực quan biểu đồ xu hướng và ma trận danh mục sản phẩm.
