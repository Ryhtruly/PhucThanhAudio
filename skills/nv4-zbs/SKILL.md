---
name: nv4-zbs
description: Gửi thông báo Zalo ZNS chính thức từ Zalo OA Phúc Thanh Audio tới số điện thoại khách hàng (xác nhận ký hợp đồng, mã phiếu bảo hành RMA, cập nhật tiến độ công trình, thư cảm ơn).
---

# NV4: Gửi Thông Báo Khách Hàng Qua Zalo (ZNS)

Skill này cho phép Trợ lý hội thoại hoặc nhân viên CSKH/Vận hành kích hoạt gửi thông báo chăm sóc khách hàng tự động qua tài khoản Zalo OA chính thức của Phúc Thanh Audio.

## 1. Khi Nào Kích Hoạt Skill?
- Khi hệ thống cần thông báo tự động (sau khi tạo hợp đồng, báo giá hoặc tiếp nhận sửa chữa).
- Hoặc nhân viên yêu cầu gửi thông báo:
  - *"Gửi thông báo Zalo xác nhận mã hợp đồng HD-01 cho số 0908123456"*
  - *"Gửi tin Zalo cho khách hàng số 0918765432 báo kỹ thuật đang đến kiểm tra"*

## 2. Thông Tin Cần Cung Cấp
- **Phone:** Số điện thoại khách hàng nhận tin (Ví dụ: `0908123456`).
- **Template ID:** Mã mẫu thông báo ZNS đã đăng ký (Ví dụ: `584044`, `422511`, `584045`, `584042`, `274649`).
- **Template Data:** Dữ liệu tương ứng với các trường trong template (customer_name, order_code, money, service...).

## 3. Gọi Backend API

- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv4/zbs/send`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

### Body Mẫu:
```json
{
  "phone": "0908123456",
  "template_id": "584044",
  "template_data": {
    "customer_name": "Anh Tuấn",
    "contract_code": "HD-2026-0312345678",
    "amount": "275,000,000 đ",
    "download_link": "https://apiphucthanhaudio.wiai.vn/api/v1/contracts/HD-2026-0312345678/HD-2026-0312345678.docx"
  }
}
```

## 4. Cách Xử Lý Phản Hồi

Backend thực hiện kết nối tới cổng dịch vụ Zalo ZNS, ghi log và trả về:
```json
{
  "action": "ANSWER",
  "blocks": [
    "💬 **Thông báo Zalo ZNS:**",
    "• **Người nhận:** `0908123456`",
    "• **Mẫu thông báo:** `584044`",
    "• **Trạng thái:** Đã xếp hàng gửi thông báo thành công qua cổng Zalo ZNS"
  ],
  "data": {
    "status": "queued",
    "phone": "0908123456",
    "message_id": "zns_msg_98412"
  }
}
```
