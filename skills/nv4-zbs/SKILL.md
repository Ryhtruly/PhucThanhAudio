---
name: nv4-zbs
description: Gửi tin nhắn ZNS / Zalo Brandname Service thông qua cổng ZBS WIFIM tới số điện thoại khách hàng (thông báo ký hợp đồng, mã phiếu bảo hành RMA, cập nhật tiến độ công trình).
---

# NV4: Gửi Tin Nhắn Zalo ZBS WIFIM

Skill này cho phép Bot hoặc nhân viên CSKH/Marketing kích hoạt gửi tin nhắn Zalo OA chăm sóc khách hàng tự động qua hạ tầng **ZBS WIFIM** đã tích hợp sẵn trong hệ thống Phúc Thanh Audio.

## 1. Khi Nào Kích Hoạt Skill?
- Khi hệ thống cần thông báo tự động (sau khi tạo hợp đồng, báo giá hoặc tiếp nhận sửa chữa).
- Hoặc người dùng ra lệnh thủ công:
  - *"Bắn tin Zalo ZBS thông báo mã hợp đồng HD-01 cho số 0908123456"*
  - *"Gửi tin Zalo cho khách hàng số 0918765432 báo kỹ thuật đang đến kiểm tra"*

## 2. Thông Tin Cần Cung Cấp
- **Phone:** Số điện thoại khách hàng nhận tin (Ví dụ: `0908123456`).
- **Template ID:** Mã mẫu tin nhắn ZBS đã đăng ký (Ví dụ: `ZBS_CONTRACT_CONFIRM`, `ZBS_WARRANTY_UPDATE`, `ZBS_SURVEY_SCHEDULE`).
- **Template Data:** Dữ liệu tương ứng với các biến trong template.

## 3. Gọi Backend API

- **Endpoint:** `POST https://perky-grasp-sponge.ngrok-free.dev/api/nv4/zbs/send`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

### Body Mẫu:
```json
{
  "phone": "0908123456",
  "template_id": "ZBS_CONTRACT_CONFIRM",
  "template_data": {
    "customer_name": "Anh Tuấn",
    "contract_code": "HD-2026-0312345678",
    "amount": "275,000,000 đ",
    "download_link": "https://perky-grasp-sponge.ngrok-free.dev/hd/2026"
  }
}
```

## 4. Cách Bot Xử Lý Phản Hồi

Backend thực hiện kết nối tới API gateway ZBS WIFIM, ghi log và trả về:
```json
{
  "action": "ANSWER",
  "blocks": [
    "💬 **Thông báo Zalo ZBS WIFIM:**",
    "• **Người nhận:** `0908123456`",
    "• **Template ID:** `ZBS_CONTRACT_CONFIRM`",
    "• **Trạng thái:** Đã xếp hàng gửi tin thành công qua ZBS Gateway"
  ],
  "data": {
    "status": "queued",
    "phone": "0908123456",
    "message_id": "zbs_msg_98412"
  }
}
```
- Bot in nội dung xác nhận ra khung chat để người dùng yên tâm tin nhắn đã được chuyển đi.
