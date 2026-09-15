---
name: nv8-intake
description: Tiếp nhận đăng ký tư vấn & báo giá âm thanh chuyên nghiệp từ khách hàng/leads, tự động tính điểm Lead Score, lưu vĩnh viễn SQLite DB, đẩy sang Airtable CRM Pipeline và phân bổ kỹ sư âm thanh liên hệ.
---

# NV8: Đăng Ký Tư Vấn & Báo Giá Nhanh (Public Intake)

Skill này hướng dẫn Bot tiếp nhận nhu cầu tư vấn giải pháp âm thanh, khảo sát dự toán từ khách hàng tiềm năng qua Chat (Zalo / Telegram / Web Bot) tương tự như Form đăng ký trên website `https://phucthanhaudio.wiai.vn/intake`.

---

## 1. Khi Nào Kích Hoạt Skill?

Kích hoạt khi người dùng chat các câu có ý định cần tư vấn cấu hình, hỏi giá gói âm thanh hoặc muốn kỹ sư liên hệ:
- *"Mình muốn tư vấn dàn âm thanh cho quán Karaoke 5 phòng ở Quận 1, SĐT 0909123456"*
- *"Báo giá trọn gói âm thanh hội trường tiệc cưới 500 khách, ngân sách khoảng 300 triệu"*
- *"Quán Bar Lounge sắp khai trương cần tư vấn cấu hình loa Sub uy lực"*
- *"Tư vấn giúp hệ thống âm thanh nhạc nền BGM cho chuỗi cafe, SĐT 0918889999"*

---

## 2. Danh Mục 4 Nhóm Gói Giải Pháp Chuẩn

| Mã Gói (`package_id`) | Tên Gói Giải Pháp (`package_name`) | Quy Mô / Đối Tượng Phù Hợp |
|---|---|---|
| `karaoke_vip` | **Karaoke VIP & Lounge** | Chuỗi Karaoke kinh doanh chuyên nghiệp, biệt thự gia đình cao cấp, Acoustic Lounge. |
| `hoi_truong` | **Hội Trường & Nhà Thi Đấu** | Line Array, micro hội nghị cho sảnh tiệc cưới, UBND, trường học, tập đoàn. |
| `bar_club` | **Bar Club & Sân Khấu Biểu Diễn** | Beer Club, Vũ trường, DJ Bar, dàn âm thanh lưu diễn công suất khủng. |
| `pa_cafe` | **Cafe Acoustic & PA Shop** | Âm thanh nhạc nền (BGM) siêu thị, nhà hàng, spa, cafe hát với nhau. |

> 💡 *Bot có thể gọi `GET https://phucthanhaudio.wiai.vn/api/nv8/intake/solutions` để lấy danh sách đầy đủ các gói và dịch vụ chi tiết.*

---

## 3. Thông Tin Cần Thu Thập

- **Customer Name (Tên Quán / Đơn Vị / Khách Hàng):** Bắt buộc. Nếu chưa có, Bot phải hỏi lại.
- **Phone (Số điện thoại / Zalo):** Bắt buộc.
- **Package ID (`package_id`):** `karaoke_vip` | `hoi_truong` | `bar_club` | `pa_cafe` (mặc định: `karaoke_vip`).
- **Contact Name:** Người liên hệ (nếu khác tên quán).
- **Estimated Budget:** Ngân sách dự toán (Ví dụ: `250000000` = 250 triệu).
- **Scale Info:** Quy mô, diện tích, sức chứa (Ví dụ: *"Sảnh 600 khách, trần cao 5m"* hoặc *"4 phòng hát 35m2"*).
- **Address:** Khu vực hoặc địa chỉ thi công công trình.
- **Notes:** Ghi chú kỹ thuật hoặc thương hiệu yêu thích (SR Italy, LSS, Verity Audio, VietK...).

---

## 4. Gọi Backend API

- **Endpoint:** `POST https://phucthanhaudio.wiai.vn/api/nv8/intake`
- **Method:** `POST`
- **Headers:**
  ```http
  Content-Type: application/json
  ngrok-skip-browser-warning: true
  ```

### Body Mẫu:
```json
{
  "customer_name": "Karaoke King Club",
  "contact_name": "Anh Nam",
  "phone": "0909123456",
  "package_id": "karaoke_vip",
  "package_name": "Karaoke VIP & Lounge",
  "solution_type": "Dàn Karaoke Kinh Doanh Chuyên Nghiệp",
  "scale_info": "5 phòng hát kinh doanh diện tích 30 - 35m2",
  "estimated_budget": 250000000,
  "address": "120 Nguyễn Thị Thập, Quận 7, TP.HCM",
  "preferred_brand": "SR Italy, Verity Audio",
  "notes": "Cần khảo sát mặt bằng vào cuối tuần này",
  "source": "AI Bot Intake"
}
```

---

## 5. Cơ Chế Lưu Trữ & Đồng Bộ Hệ Thống

Khi Bot gọi endpoint trên, Backend sẽ tự động:
1. **Tính toán Lead Score (55 - 98 điểm):** Dựa vào ngân sách dự toán, loại khách B2B/cá nhân, quy mô công trình.
2. **Lưu vĩnh viễn vào SQLite Database (`phucthanh.db`):** Tạo khách hàng và Lead tương ứng.
3. **Đồng bộ bảng Lead & Pipeline trên Airtable CRM:** Tự động xếp vào Cột 1 (**Mới / New**) trên bảng Kanban quản trị.
4. **Hiển thị tức thì trên Web Quản Trị:** Quản lý và Kỹ sư sales thấy ngay hồ sơ tại tab **"Pipeline Bán Hàng"** trên `https://phucthanhaudio.wiai.vn/`.

---

## 6. Cách Bot Xử Lý Phản Hồi

Backend trả về JSON đồng nhất:
```json
{
  "action": "ANSWER",
  "blocks": [
    "📋 **Đã tiếp nhận Yêu Cầu Tư Vấn & Báo Giá thành công!**",
    "• **Mã hồ sơ:** `PT-202609-1234`",
    "• **Khách hàng:** Karaoke King Club (Anh Nam — 0909123456)",
    "• **Giải pháp:** Karaoke VIP & Lounge (Dàn Karaoke Kinh Doanh Chuyên Nghiệp)",
    "• **Dự toán ngân sách:** `250,000,000 đ`",
    "• **Điểm tiềm năng (Lead Score):** `85/100` (Ưu tiên cao)",
    "• **Cơ sở dữ liệu:** Đã lưu vào SQLite Database & Pipeline CRM (Cột Mới)",
    "• **Thời gian phản hồi:** Kỹ sư âm thanh Phúc Thanh Audio sẽ liên hệ tư vấn trong vòng 15 phút!"
  ],
  "data": { ... }
}
```
Bot chỉ cần in lần lượt các dòng trong `blocks[]` ra khung chat mà không cần tính toán lại bất kỳ thông tin nào.
