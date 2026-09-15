---
name: nv1-contract
description: Tạo hợp đồng kinh tế mua bán thiết bị âm thanh tự động 1-click từ Mã số thuế (MST), tự sinh file Word .docx chuẩn pháp lý, lưu Airtable/SQLite và thông báo ZBS Zalo OA.
---

# NV1: Tạo Hợp Đồng Tự Động 1-Click

Skill này hướng dẫn Bot xử lý yêu cầu tạo hợp đồng kinh tế từ nhân viên Sales hoặc Kế toán.

## 1. Khi Nào Kích Hoạt Skill?
Kích hoạt khi người dùng chat các câu có ý định tạo/lập hợp đồng kinh tế, ví dụ:
- *"Lập hợp đồng cho công ty MST 0312345678, số điện thoại 0908123456"*
- *"Tạo hợp đồng âm thanh karaoke VIP cho khách hàng bên FPT"*
- *"Làm hợp đồng gấp cho quán Bar Vũng Tàu, MST 0300123456, giá 250 triệu"*

## 2. Thông Tin Cần Thu Thập
- **MST (Mã số thuế):** Bắt buộc. Nếu chưa có, Bot phải hỏi lại khách hàng.
- **Phone (Số điện thoại đại diện):** Bắt buộc.
- **Contract Type:** Loại hợp đồng (Ví dụ: "Cung cấp & Lắp đặt hệ thống âm thanh Karaoke", mặc định: "Cung cấp thiết bị âm thanh").
- **Items:** Danh sách thiết bị (Nếu không cung cấp, hệ thống dùng gói tiêu chuẩn).
- **Total Amount:** Tổng giá trị (nếu nhập số tiền gộp).
- **Sales Rep:** Tên nhân viên phụ trách (mặc định: "Nguyễn Văn Tuấn").

## 3. Gọi Backend API

- **Endpoint:** `POST https://perky-grasp-sponge.ngrok-free.dev/api/nv1/contract`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

### Body Mẫu:
```json
{
  "mst": "0312345678",
  "phone": "0908123456",
  "contract_type": "Cung cấp & Lắp đặt hệ thống âm thanh Lounge",
  "total_amount": 250000000,
  "items": [
    {
      "name": "Loa Full-range SR Italy HR-12",
      "qty": 4,
      "price": 32000000,
      "unit": "Cặp"
    },
    {
      "name": "Cục đẩy công suất Verity Audio V4.25",
      "qty": 2,
      "price": 28000000,
      "unit": "Cái"
    }
  ],
  "special_terms": "Bảo hành tận nơi 24 tháng, hỗ trợ cân chỉnh âm thanh định kỳ 6 tháng/lần",
  "sales_rep": "Nguyễn Văn Tuấn",
  "send_zbs": true
}
```

## 4. Cách Bot Xử Lý Phản Hồi

Backend sẽ trả về JSON theo chuẩn:
```json
{
  "action": "ANSWER",
  "blocks": [
    "✅ **Đã tạo Hợp Đồng thành công!**",
    "• **Mã HĐ:** `HD-2026-0312345678`",
    "• **Bên mua:** CÔNG TY TNHH GIẢI TRÍ ĐỈNH CAO (MST: `0312345678`)",
    "• **Tổng giá trị (kèm VAT):** `275,000,000 đ`",
    "• **Bằng chữ:** *Hai trăm bảy mươi lăm triệu đồng chẵn*",
    "• **Tải file Word .docx:** [Tải Hợp Đồng](https://perky-grasp-sponge.ngrok-free.dev/api/v1/contracts/HD-2026-0312345678/HD-2026-0312345678.docx)",
    "• **Trạng thái:** Chờ ký duyệt | ZBS thông báo: Đã gửi"
  ],
  "data": { ... }
}
```

- **Bot chỉ cần lấy `blocks` và in lần lượt ra màn hình chat** cho người dùng.
- Kèm theo link tải file Word để nhân viên tải về in ký hoặc gửi khách hàng.
