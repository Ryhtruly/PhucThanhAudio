---
name: nv8-intake
description: Tiếp nhận đăng ký tư vấn & báo giá âm thanh chuyên nghiệp từ khách hàng, tính điểm ưu tiên, lưu trữ CSDL, cập nhật tiến trình cơ hội và phân bổ kỹ sư âm thanh liên hệ.
---

# NV8: Cổng Tiếp Nhận Đăng Ký Tư Vấn & Báo Giá (Public Intake)

Skill này hướng dẫn Trợ lý hội thoại tiếp nhận nhu cầu tư vấn giải pháp âm thanh, dự toán từ khách hàng tiềm năng qua Chat (Zalo / Telegram / Web Bot) tương tự như Form đăng ký trên website `https://phucthanhaudio.wiai.vn/intake`.

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
| `hoi_truong` | **Hội Trường & Sân Khấu** | Line Array, micro hội nghị cho sảnh tiệc cưới, UBND, trường học, tập đoàn. |
| `bar_club` | **Bar Club & Vũ Trường** | Beer Club, Vũ trường, DJ Bar, dàn âm thanh lưu diễn công suất lớn. |
| `pa_cafe` | **Cafe Acoustic & PA Shop** | Âm thanh nhạc nền (BGM) siêu thị, nhà hàng, spa, cafe hát acoustic. |

> 💡 *Trợ lý có thể gọi `GET https://apiphucthanhaudio.wiai.vn/api/nv8/intake/solutions` để lấy danh sách đầy đủ các gói và dịch vụ chi tiết.*

---

## 3. Thông Tin Cần Thu Thập

- **Customer Name (Tên Quán / Đơn Vị / Khách Hàng):** Bắt buộc. Nếu chưa có, hệ thống yêu cầu cung cấp.
- **Phone (Số điện thoại / Zalo):** Bắt buộc.
- **Package ID (`package_id`):** `karaoke_vip` | `hoi_truong` | `bar_club` | `pa_cafe` (mặc định: `karaoke_vip`).
- **Contact Name:** Người liên hệ (nếu khác tên quán).
- **Estimated Budget:** Ngân sách dự toán (Ví dụ: `250000000` = 250 triệu).
- **Scale Info:** Quy mô, diện tích, sức chứa (Ví dụ: *"Sảnh 600 khách, trần cao 5m"* hoặc *"4 phòng hát 35m2"*).
- **Address:** Khu vực hoặc địa chỉ thi công công trình.
- **Notes:** Ghi chú kỹ thuật hoặc thương hiệu yêu thích (SR Italy, LSS, Verity Audio, VietK...).

---

## 4. Gọi Backend API

- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv8/intake`
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
  "source": "Website Tiếp Nhận"
}
```

---

## 5. Cơ Chế Lưu Trữ & Đồng Bộ Hệ Thống

Khi gọi endpoint trên, Backend sẽ tự động:
1. **Tính toán Mức độ Ưu tiên (55 - 98 điểm):** Dựa vào ngân sách dự toán, loại khách B2B/cá nhân, quy mô công trình.
2. **Lưu vĩnh viễn vào CSDL SQLite (`phucthanh.db`):** Tạo khách hàng và Cơ hội bán hàng tương ứng.
3. **Xóa cache Redis tức thì:** Cập nhật ngay danh sách khách hàng mới nhất.
4. **Đồng bộ bảng Khách Hàng trên Airtable CRM:** Tự động xếp vào Cột 1 (**Tiếp Nhận Ban Đầu**).
5. **Hiển thị tức thì trên Web Quản Trị:** Quản lý và Kỹ sư sales thấy ngay hồ sơ tại tab **"Khách Hàng & Cơ Hội"** trên `https://phucthanhaudio.wiai.vn/`.

---

## 6. Cách Xử Lý Phản Hồi

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
    "• **Mức độ ưu tiên:** `85/100` (Ưu tiên: Cao)",
    "• **Cơ sở dữ liệu:** Đã lưu vào CSDL Doanh Nghiệp & Cột Tiếp Nhận Ban Đầu",
    "• **Thời gian phản hồi:** Kỹ sư âm thanh Phúc Thanh Audio sẽ liên hệ tư vấn trong vòng 15 phút!"
  ],
  "data": { ... }
}
```
Trợ lý xuất lần lượt các dòng trong `blocks[]` ra hội thoại mà không cần tính toán lại bất kỳ thông tin nào.
