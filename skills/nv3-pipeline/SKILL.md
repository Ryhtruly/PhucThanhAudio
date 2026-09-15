---
name: nv3-pipeline
description: Tự động quét cơ hội kinh doanh (Leads) mới vào mỗi buổi sáng, nhắc việc chăm sóc khách hàng và cập nhật giai đoạn Pipeline (New, Qualified, Đàm phán, Won, Lost) từ lệnh chat.
---

# NV3: Quét Lead & Cập Nhật Pipeline Bán Hàng

Skill này phục vụ 2 nghiệp vụ chính của Sales:
1. **Quét tự động định kỳ (Morning Scan):** Vào đầu giờ sáng (8h00 - 8h30), Bot tự động quét và điểm danh các cơ hội kinh doanh mới hoặc lead nóng cần chốt.
2. **Cập nhật giai đoạn cơ hội (Update Deal):** Nhân viên chat với Bot để chuyển đổi trạng thái lead (Ví dụ: Chuyển sang Gặp Demo, Đàm phán, hoặc Chốt Won).

---

## Nghiệp Vụ 1: Quét Lead Sáng Nay (Morning Scan)

### Khi Nào Kích Hoạt?
- Lịch Cron tự động của Bot lúc 8h00 sáng mỗi ngày làm việc.
- Hoặc Sales chat hỏi:
  - *"Sáng nay có lead nào mới không?"*
  - *"Quét danh sách khách hàng cần gọi hôm nay"*
  - *"Tình hình pipeline bán hàng hiện tại"*

### Gọi API Backend:
- **Endpoint:** `POST https://phucthanhaudio.wiai.vn/api/nv3/morning_scan`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`
- **Body:** `{}` (Không cần tham số)

### Phản Hồi Từ Hệ Thống:
```json
{
  "action": "ANSWER",
  "blocks": [
    "🌅 **Báo cáo Pipeline Sáng Nay — Phúc Thanh Audio**",
    "• **Tổng số cơ hội:** 12 khách hàng",
    "• **Deal đã chốt (Won):** 5 deal",
    "• **Cần xử lý gấp:** 2 lead mới trong hôm nay",
    "",
    "**Danh sách Lead ưu tiên:**",
    "1. **Karaoke Họa Mi** (Anh Tuấn - `0908123456`) — Dự toán: `450,000,000 đ` [Điểm: 85]",
    "2. **Bar Havana Club** (Chị Thảo - `0918765432`) — Dự toán: `800,000,000 đ` [Điểm: 92]"
  ],
  "data": { ... }
}
```

---

## Nghiệp Vụ 2: Cập Nhật Trạng Thái Deal (Update Deal Stage)

### Khi Nào Kích Hoạt?
Khi Sales thông báo tiến độ giao dịch:
- *"Chuyển deal Karaoke Họa Mi sang Đàm phán"*
- *"Deal anh Tuấn 0908123456 đã chốt Won rồi nhé"*
- *"Đổi trạng thái deal rec123abc sang Won"*

### Quy Tắc Chuyển Giai Đoạn:
Hệ thống hỗ trợ 5 giai đoạn:
- `New`: Khách hàng mới gửi thông tin
- `Qualified`: Đã khảo sát công trình & demo âm thanh
- `Dam phan`: Đang thương thảo hợp đồng / báo giá
- `Won`: Ký hợp đồng thành công 🎉
- `Lost`: Thất bại / Hủy dự án

### Gọi API Backend:
- **Endpoint:** `PUT https://phucthanhaudio.wiai.vn/api/nv3/deal/{deal_id_hoac_sdt}`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

```json
{
  "stage": "Won",
  "notes": "Khách đồng ý cấu hình loa SR HR-12, chốt ký hợp đồng 450tr"
}
```

### Phản Hồi Từ Hệ Thống:
```json
{
  "action": "ANSWER",
  "blocks": [
    "🎯 **Cập nhật trạng thái cơ hội thành công!**",
    "• **Mã Lead:** `0908123456`",
    "• **Giai đoạn mới:** Ký Hợp Đồng Thành Công (Won) 🎉",
    "👉 *Deal đã chuyển thành công, bạn có thể gọi NV1 để tạo Hợp đồng ngay!*"
  ],
  "data": { "deal_id": "0908123456", "stage": "Won", "updated": true }
}
```
