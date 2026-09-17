---
name: nv2-quote
description: Xuất bảng báo giá thiết bị âm thanh chuyên nghiệp chuẩn ISO, tự động tính toán thuế VAT, chiết khấu và sinh file Word .docx gửi kèm link cho khách hàng hoặc Sales.
---

# NV2: Báo Giá Tự Động ISO Thiết Bị Âm Thanh

Skill này hướng dẫn Bot tiếp nhận yêu cầu báo giá dự án âm thanh từ Sales hoặc khách hàng và gọi Backend tạo bảng báo giá ISO hoàn chỉnh.

## 1. Khi Nào Kích Hoạt Skill?
Kích hoạt khi người dùng có ý định xin/lập báo giá:
- *"Báo giá cho anh Dũng bên Sky Bar Landmark 81 gói âm thanh gồm 4 cặp loa SR HR-12 và 2 đẩy công suất"*
- *"Tạo báo giá dự án hội trường UBND Phường Bến Nghé, SĐT 0912345678"*
- *"Gửi báo giá bộ karaoke gia đình cao cấp cho chị Mai"*

## 2. Thông Tin Cần Thu Thập
- **Company Name / Khách hàng:** Tên đơn vị hoặc cá nhân nhận báo giá.
- **Contact Name:** Người liên hệ trực tiếp.
- **Phone:** Số điện thoại để gửi Zalo / SMS.
- **Project Name:** Tên công trình/dự án (Ví dụ: "Hệ thống âm thanh hội trường 300 chỗ").
- **Items:** Danh sách thiết bị (Tên, Số lượng, Đơn giá dự kiến, Thương hiệu).
- **Include VAT:** Mặc định `true` (8% hoặc 10%).

## 3. Gọi Backend API

- **Endpoint:** `POST https://phucthanhaudio.wiai.vn/api/nv2/quote`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

### Body Mẫu:
```json
{
  "company_name": "Công ty Cổ phần Giải trí SkyLight",
  "contact_name": "Anh Nguyễn Hoàng Dũng",
  "phone": "0912345678",
  "email": "dung.nh@skylight.vn",
  "project_name": "Gói âm thanh Lounge & Rooftop Bar",
  "items": [
    {
      "name": "Loa Full-range SR Italy HR-12",
      "qty": 4,
      "price": 32000000,
      "brand": "SR Italy",
      "unit": "Cặp"
    },
    {
      "name": "Subwoofer Verity Audio SUB-218",
      "qty": 2,
      "price": 45000000,
      "brand": "Verity Audio",
      "unit": "Cái"
    },
    {
      "name": "Vang số kỹ thuật số DSP Digisynthetic",
      "qty": 1,
      "price": 18500000,
      "brand": "Digisynthetic",
      "unit": "Bộ"
    }
  ],
  "include_vat": true,
  "sales_rep": "Nguyễn Văn Tuấn",
  "send_zbs": true
}
```

## 4. Cách Bot Xử Lý Phản Hồi

Backend xử lý tính toán tổng tiền, VAT, tạo mã `BG-xxxx`, sinh file Word chuẩn ISO và trả về:
```json
{
  "action": "ANSWER",
  "blocks": [
    "📄 **Đã xuất Báo Giá ISO thành công!**",
    "• **Mã Báo Giá:** `BG-2026-0812`",
    "• **Dự án:** Gói âm thanh Lounge & Rooftop Bar",
    "• **Khách hàng:** Công ty Cổ phần Giải trí SkyLight (Anh Nguyễn Hoàng Dũng - 0912345678)",
    "• **Tổng cộng:** `239,800,000 đ`",
    "• **Tải file Word .docx:** [Tải Báo Giá](https://phucthanhaudio.wiai.vn/api/v1/quotes/BG-2026-0812/BG-2026-0812.docx)",
    "• **Thông báo ZBS:** Đã kích hoạt"
  ],
  "data": { ... }
}
```

- **Bot render trực tiếp các dòng trong `blocks`** và cung cấp link tải báo giá Word cho người yêu cầu.

---

## 5. Thêm Thiết Bị Mới Vào Bảng Giá Qua Chat

Khi người dùng yêu cầu thêm sản phẩm mới vào danh mục bảng giá (ví dụ: *"Thêm sản phẩm Loa Subwoofer SR SW-218 giá 45 triệu"*):
- **Endpoint:** `POST https://phucthanhaudio.wiai.vn/api/nv2/product`
- **Method:** `POST`
- **Body Mẫu:**
  ```json
  {
    "name": "Loa Subwoofer Kép SR SW-218",
    "sale_price": 45000000,
    "brand": "SR Made in Italy",
    "category": "Loa",
    "unit": "Cặp",
    "stock_quantity": 5
  }
  ```
- Backend sẽ tự động lưu vào SQLite Database (`phucthanh.db`) và đồng bộ lên Airtable bảng `San pham & Bang gia`. Thiết bị sẽ lập tức hiển thị trên giao diện Quote Studio của Web Quản Trị.

