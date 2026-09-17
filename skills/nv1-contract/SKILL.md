---
name: nv1-contract
description: Soạn thảo và khởi tạo hợp đồng kinh tế mua bán thiết bị âm thanh từ Mã số thuế (MST), tra cứu pháp nhân, sinh file Word .docx quy chuẩn, lưu trữ CSDL và gửi thông báo Zalo ZNS.
---

# NV1: Quản Lý & Soạn Thảo Hợp Đồng Kinh Tế

Skill này hướng dẫn Trợ lý hội thoại xử lý yêu cầu khởi tạo hợp đồng kinh tế từ nhân viên Kinh doanh hoặc Kế toán.

## 1. Khi Nào Kích Hoạt Skill?
Kích hoạt khi người dùng có nhu cầu lập hoặc khởi tạo hợp đồng kinh tế, ví dụ:
- *"Lập hợp đồng cho công ty MST 0312345678, số điện thoại 0908123456"*
- *"Tạo hợp đồng âm thanh karaoke VIP cho khách hàng bên FPT"*
- *"Làm hợp đồng cho quán Bar Vũng Tàu, MST 0300123456, giá 250 triệu"*

## 2. Thông Tin Cần Thu Thập
- **MST (Mã số thuế):** Bắt buộc. Nếu chưa có, hệ thống yêu cầu cung cấp để tra cứu pháp nhân chính thức.
- **Phone (Số điện thoại đại diện):** Bắt buộc.
- **Contract Type:** Loại hợp đồng (Ví dụ: "Cung cấp & Lắp đặt hệ thống âm thanh", mặc định: "Cung cấp thiết bị âm thanh").
- **Items:** Danh sách thiết bị (Nếu không cung cấp, hệ thống áp dụng danh mục gói giải pháp chuẩn).
- **Total Amount:** Tổng giá trị hợp đồng (nếu nhập số tiền trọn gói).
- **Include VAT (`include_vat`):** Xuất hóa đơn thuế GTGT (mặc định: `true`).
- **Price Includes VAT (`price_includes_vat`):** Đơn giá đã bao gồm VAT hay chưa (mặc định: `false` - giá chưa VAT + 10%).
- **Sales Rep:** Nhân viên phụ trách (mặc định: "Nguyễn Văn Tuấn").

## 3. Gọi Backend API

- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv1/contract`
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
  "include_vat": true,
  "price_includes_vat": false,
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

## 4. Cách Xử Lý Phản Hồi

Backend tự động tính thuế, tra cứu tên doanh nghiệp theo cổng thuế quốc gia, sinh file Word .docx, lưu vào SQLite + Airtable và cập nhật ngay lập tức vào Redis Cache:
```json
{
  "action": "ANSWER",
  "blocks": [
    "✅ **Đã tạo Hợp Đồng thành công!**",
    "• **Mã HĐ:** `HD-2026-0312345678`",
    "• **Bên mua:** CÔNG TY TNHH GIẢI TRÍ ĐỈNH CAO (MST: `0312345678`)",
    "• **Tổng giá trị (kèm VAT):** `275,000,000 đ`",
    "• **Bằng chữ:** *Hai trăm bảy mươi lăm triệu đồng chẵn*",
    "• **Tải file Word .docx:** [Tải Hợp Đồng](https://apiphucthanhaudio.wiai.vn/api/v1/contracts/HD-2026-0312345678/HD-2026-0312345678.docx)",
    "• **Trạng thái:** Chờ ký duyệt | Zalo ZNS: Đã gửi"
  ],
  "data": { ... }
}
```

- **Trợ lý xuất trực tiếp nội dung trong `blocks`** ra khung chat.
- Cung cấp link tải file Word để nhân viên in ấn, trình ký hoặc gửi đối tác.
