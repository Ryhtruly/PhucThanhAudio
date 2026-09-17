---
name: nv2-quote
description: Lập bảng báo giá dự án âm thanh chuyên nghiệp theo mẫu văn bản quy chuẩn, tự động tính toán thuế VAT, kết xuất tài liệu Word .docx và gửi kèm đường dẫn cho khách hàng hoặc nhân viên kinh doanh.
---

# NV2: Lập Báo Giá Dự Án Thiết Bị Âm Thanh

Skill này hướng dẫn Trợ lý hội thoại tiếp nhận yêu cầu lập báo giá dự án âm thanh từ nhân viên kinh doanh hoặc khách hàng và gọi Backend tạo bảng báo giá quy chuẩn hoàn chỉnh.

## 1. Khi Nào Kích Hoạt Skill?
Kích hoạt khi người dùng có ý định lập hoặc xin bảng báo giá:
- *"Báo giá cho anh Dũng bên Sky Bar Landmark 81 gói âm thanh gồm 4 cặp loa SR HR-12 và 2 đẩy công suất"*
- *"Tạo báo giá dự án hội trường UBND Phường Bến Nghé, SĐT 0912345678"*
- *"Gửi báo giá cấu hình karaoke gia đình cao cấp cho chị Mai"*

## 2. Thông Tin Cần Thu Thập
- **Company Name / Khách hàng:** Tên đơn vị hoặc cá nhân nhận báo giá.
- **Contact Name:** Người liên hệ trực tiếp.
- **Phone:** Số điện thoại để gửi Zalo ZNS / SMS.
- **Project Name:** Tên công trình/dự án (Ví dụ: "Hệ thống âm thanh hội trường 300 chỗ").
- **Discount / Chiết khấu:** (Tùy chọn) `discount`, `chiet_khau`, `discount_percent` hoặc viết tắt `ck`. Nếu $\le 100$ được hiểu là %, nếu $> 100$ được hiểu là số tiền VNĐ. Có thể truyền ở cấp độ toàn đơn hàng hoặc từng dòng thiết bị.
- **Include VAT:** Mặc định `true` (VAT 10%).

> [!NOTE]
> **Quy luật đơn giá của NV2:** Nếu tên thiết bị khớp với catalog có sẵn trong hệ thống, hệ thống sẽ ưu tiên lấy đơn giá niêm yết chuẩn của Phúc Thanh Audio; nếu tên thiết bị tùy biến/chưa có trong catalog, hệ thống áp dụng trực tiếp đơn giá client gửi lên.

## 3. Gọi Backend API

- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv2/quote`
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
  "discount_percent": 5,
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

## 4. Cách Xử Lý Phản Hồi

Backend tự động sinh mã báo giá kèm mili-giây chuẩn xác (ví dụ: `BG-20260917-143022123`), đảm bảo không bao giờ bị trùng lặp mã dù gọi liên tục nhiều yêu cầu trong cùng một giây, tính toán chiết khấu, VAT, sinh file Word .docx và xóa cache Redis tương ứng:
```json
{
  "action": "ANSWER",
  "blocks": [
    "📄 **Đã xuất Báo Giá thành công!**",
    "• **Mã Báo Giá:** `BG-20260917-143022123`",
    "• **Dự án:** Gói âm thanh Lounge & Rooftop Bar",
    "• **Khách hàng:** Công ty Cổ phần Giải trí SkyLight (Anh Nguyễn Hoàng Dũng - `0912345678`)",
    "• **Cộng tiền hàng:** `236,500,000 đ`",
    "• **Chiết khấu:** `-11,825,000 đ` (5%)",
    "• **Tổng trước VAT:** `224,675,000 đ`",
    "• **Thuế VAT (10%):** `22,467,500 đ`",
    "• **Tổng cộng thanh toán:** `247,142,500 đ`",
    "• **Bằng chữ:** *Hai trăm bốn mươi bảy triệu một trăm bốn mươi hai nghìn năm trăm đồng*",
    "• **Tải file Word .docx:** [Tải Báo Giá](https://apiphucthanhaudio.wiai.vn/api/v1/quotes/BG-20260917-143022123/BG-20260917-143022123.docx)",
    "• **Thông báo Zalo ZNS:** Đã kích hoạt"
  ],
  "data": { ... }
}
```

- **Trợ lý hiển thị trực tiếp các dòng trong `blocks`** và cung cấp liên kết tải file Word.

---

## 5. Thêm Thiết Bị Mới Vào Bảng Giá Qua Chat

Khi người dùng yêu cầu bổ sung thiết bị mới vào danh mục bảng giá (ví dụ: *"Thêm sản phẩm Loa Subwoofer SR SW-218 giá 45 triệu"*):
- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv2/product`
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
- Backend sẽ tự động lưu vào Cơ sở dữ liệu SQLite (`phucthanh.db`), xóa cache Redis và đồng bộ lên Airtable bảng `San pham & Bang gia`. Thiết bị sẽ hiển thị tức thì trên giao diện quản trị `https://phucthanhaudio.wiai.vn/`.
