---
name: nv6-inventory
description: Tra cứu tình trạng tồn kho, định giá tài sản kho thiết bị âm thanh và cảnh báo các sản phẩm dưới ngưỡng an toàn cần nhập hàng.
---

# NV6: Kiểm Tra Tồn Kho & Cảnh Báo Thiết Bị Sắp Hết

Skill này giúp Thủ kho, Nhân viên mua hàng hoặc Quản lý kiểm tra nhanh sức khỏe kho hàng thiết bị âm thanh chuyên dụng của Phúc Thanh Audio.

## 1. Khi Nào Kích Hoạt Skill?
- Lịch Cron tự động của Bot lúc 8h30 sáng hàng ngày để cảnh báo hàng sắp hết.
- Hoặc người dùng hỏi trực tiếp trong chat:
  - *"Kiểm tra tồn kho xem có món nào sắp hết hàng không?"*
  - *"Kho hiện tại còn bao nhiêu tiền hàng?"*
  - *"Báo cáo số lượng SKU và tình trạng tồn kho"*

## 2. Gọi Backend API

- **Endpoint:** `GET https://phucthanhaudio.wiai.vn/api/nv6/stock/check`
- **Headers:**
  - `ngrok-skip-browser-warning: true`
- **Method:** `GET`
- **Tham số:** Không cần tham số.

## 3. Cách Bot Xử Lý Phản Hồi

Backend quét toàn bộ bảng sản phẩm trong Database SQLite, tính tổng giá trị vốn tồn kho, so sánh số lượng thực tế với `min_threshold` và trả về:
```json
{
  "action": "ANSWER",
  "blocks": [
    "📦 **Báo Cáo Tồn Kho Thiết Bị Âm Thanh — Phúc Thanh Audio**",
    "• **Tổng giá trị tồn kho:** `1,450,000,000 đ`",
    "• **Tổng số mặt hàng (SKU):** 48 thiết bị",
    "• **Cảnh báo cần nhập gấp:** 2 thiết bị",
    "",
    "⚠️ **Danh sách thiết bị sắp hết hàng:**",
    "1. **Loa Subwoofer Verity SUB-218** (`SP-002`) — Tồn: **1** / Ngưỡng min: 3 (Verity Audio)",
    "2. **Micro Không Dây Sennheiser EW-100** (`SP-015`) — Tồn: **2** / Ngưỡng min: 5 (Sennheiser)"
  ],
  "data": {
    "total_value": 1450000000,
    "sku_count": 48,
    "low_stock_count": 2,
    "items": [ ... ]
  }
}
```

- **Bot render toàn bộ nội dung trong mảng `blocks`** cho người hỏi.
- Nếu `low_stock_count == 0`, hệ thống tự động thông báo: `"✅ Tất cả thiết bị đều ở mức tồn an toàn."`

---

## 4. Thêm Thiết Bị Mới Vào Kho & Bảng Giá

Khi người dùng (Thủ kho, Quản lý) muốn bổ sung một thiết bị mới vào kho (ví dụ: *"Nhập thiết bị mới Loa Line Array SR HR-12, giá bán 35 triệu, tồn kho 10 cái"*):
- **Endpoint:** `POST https://phucthanhaudio.wiai.vn/api/nv6/stock/product`
- **Method:** `POST`
- **Body Mẫu:**
  ```json
  {
    "name": "Loa Line Array SR HR-12",
    "brand": "SR Made in Italy",
    "category": "Loa",
    "unit": "Cái",
    "sale_price": 35000000,
    "import_price": 27000000,
    "stock_quantity": 10
  }
  ```
Backend tự động cấp mã SKU (`PT-xxxx`), lưu vào CSDL SQLite nội bộ và đồng bộ lên bảng giá Airtable.

