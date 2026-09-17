---
name: nv5-warranty
description: Tiếp nhận dịch vụ kỹ thuật, lập phiếu bảo hành thiết bị âm thanh (RMA), phân công Kỹ thuật viên (KTV) và cập nhật biên bản hoàn thành sửa chữa.
---

# NV5: Tiếp Nhận Dịch Vụ & Bảo Hành Thiết Bị (RMA)

Skill này giúp Kỹ thuật viên (KTV), lễ tân dịch vụ hoặc khách hàng tiếp nhận sự cố kỹ thuật thiết bị và theo dõi tiến độ sửa chữa trực tiếp qua hội thoại.

---

## Nghiệp Vụ 1: Tiếp Nhận Bảo Hành / Sự Cố (Start Warranty / RMA)

### Khi Nào Kích Hoạt?
Khi có thông báo lỗi kỹ thuật hoặc yêu cầu bảo hành:
- *"Amply karaoke của quán bị rè kênh trái, khách báo gấp ở Quận 1, SĐT 0903112233"*
- *"Tạo phiếu bảo hành cho loa SR HR-12 bị cháy treble, khách anh Hoàng 0918123456"*
- *"Khách hàng báo vang số Digisynthetic mất nguồn, cần thợ qua kiểm tra"*

### Gọi Backend API:
- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv5/warranty/start`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

### Body Mẫu:
```json
{
  "device_name": "Cục đẩy công suất Verity Audio V4.25",
  "model": "V4.25",
  "serial": "SN-2025-V425-998",
  "error_desc": "Kênh B bị mất tiếng, đèn Clip báo đỏ liên tục",
  "phone": "0903112233",
  "customer_name": "Anh Hoàng Minh",
  "urgency": "Cao",
  "ktv_name": "Trần Minh Đức",
  "send_zbs": true
}
```

### Phản Hồi Từ Hệ Thống:
```json
{
  "action": "ANSWER",
  "blocks": [
    "🔧 **Đã tạo Phiếu Bảo Hành & Sửa Chữa!**",
    "• **Mã phiếu RMA:** `BH-2026-0819`",
    "• **Thiết bị:** Cục đẩy công suất Verity Audio V4.25 (Model: `V4.25`)",
    "• **Mô tả lỗi:** Kênh B bị mất tiếng, đèn Clip báo đỏ liên tục",
    "• **Khách hàng:** Anh Hoàng Minh (`0903112233`)",
    "• **KTV phụ trách:** Trần Minh Đức",
    "• **Lịch xử lý:** Trong 24h làm việc"
  ],
  "data": { ... }
}
```
Hệ thống tự động ghi nhận vào CSDL, hiển thị tức thì trên màn hình Dịch Vụ & Bảo Hành tại `https://phucthanhaudio.wiai.vn/` và xóa cache Redis liên quan.

---

## Nghiệp Vụ 2: Nghiệm Thu Hoàn Thành Sửa Chữa (Complete Ticket)

### Khi Nào Kích Hoạt?
Khi KTV đã khắc phục xong sự cố tại công trình hoặc tại trung tâm kỹ thuật:
- *"Phiếu bảo hành BH-2026-0819 đã sửa xong, thay tụ nguồn kênh B"*
- *"Đã bàn giao xong thiết bị cho khách ở phiếu BH-01"*

### Gọi Backend API:
- **Endpoint:** `PUT https://apiphucthanhaudio.wiai.vn/api/nv5/warranty/{ticket_code}/complete?note=...`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`
- **Method:** `PUT`

### Phản Hồi Từ Hệ Thống:
```json
{
  "action": "ANSWER",
  "blocks": [
    "✅ **Đã hoàn thành Phiếu Bảo Hành `BH-2026-0819`!**",
    "• **Ghi chú nghiệm thu:** Đã thay thế linh kiện tụ nguồn kênh B, kiểm tra áp tải 2h liên tục ổn định",
    "• **Trạng thái:** Đã nghiệm thu và đóng phiếu trên hệ thống"
  ],
  "data": { "ticket_id": "BH-2026-0819", "status": "Hoan thanh" }
}
```
