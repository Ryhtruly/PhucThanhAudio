---
name: nv3-pipeline
description: Quản lý khách hàng và tiến trình cơ hội kinh doanh (CRM), nhắc việc chăm sóc khách hàng và cập nhật 5 giai đoạn bán hàng (Tiếp nhận ban đầu, Khảo sát hiện trạng, Đàm phán & báo giá, Ký kết hợp đồng, Thất bại).
---

# NV3: Quản Lý Khách Hàng & Cơ Hội Bán Hàng (CRM)

Skill này phục vụ 2 nghiệp vụ quản trị khách hàng của đội ngũ Kinh doanh:
1. **Quét cơ hội định kỳ (Morning Scan):** Vào đầu giờ sáng (8h00 - 8h30), hệ thống điểm danh các cơ hội kinh doanh mới hoặc khách hàng trọng điểm cần liên hệ.
2. **Cập nhật giai đoạn cơ hội (Update Stage):** Nhân viên cập nhật tiến độ giao dịch qua hội thoại (chuyển sang Khảo sát hiện trạng, Đàm phán, hoặc Ký kết hợp đồng).

---

## Nghiệp Vụ 1: Điểm Danh Cơ Hội Bán Hàng (Morning Scan)

### Khi Nào Kích Hoạt?
- Lịch tự động lúc 8h00 sáng mỗi ngày làm việc.
- Hoặc nhân viên kinh doanh hỏi:
  - *"Sáng nay có khách hàng nào mới cần liên hệ không?"*
  - *"Danh sách cơ hội cần gọi chăm sóc hôm nay"*
  - *"Tình hình tiến độ bán hàng hiện tại"*

### Gọi API Backend:
- **Endpoint:** `POST https://apiphucthanhaudio.wiai.vn/api/nv3/morning_scan`
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`
- **Body:** `{}` (Không cần tham số)

### Phản Hồi Từ Hệ Thống:
```json
{
  "action": "ANSWER",
  "blocks": [
    "🌅 **Báo cáo Cơ Hội Bán Hàng — Phúc Thanh Audio**",
    "• **Tổng số cơ hội:** 12 khách hàng",
    "• **Hợp đồng đã ký:** 5 dự án",
    "• **Cần xử lý trong ngày:** 2 khách hàng mới tiếp nhận",
    "",
    "**Danh sách khách hàng ưu tiên cao:**",
    "1. **Karaoke Họa Mi** (Anh Tuấn - `0908123456`) — Dự toán: `450,000,000 đ` [Ưu tiên: Cao]",
    "2. **Bar Havana Club** (Chị Thảo - `0918765432`) — Dự toán: `800,000,000 đ` [Ưu tiên: Cao]"
  ],
  "data": { ... }
}
```

---

## Nghiệp Vụ 2: Cập Nhật Giai Đoạn Bán Hàng (Update Deal Stage)

### Khi Nào Kích Hoạt?
Khi nhân viên kinh doanh thông báo tiến trình giao dịch:
- *"Chuyển khách hàng Karaoke Họa Mi sang giai đoạn Đàm phán"*
- *"Dự án anh Tuấn 0908123456 đã chốt ký hợp đồng rồi nhé"*
- *"Đổi trạng thái cơ hội sang Ký kết hợp đồng"*

### Quy Tắc 5 Giai Đoạn Bán Hàng Chuẩn:
- `New`: **Tiếp Nhận Ban Đầu** (Khách hàng gửi thông tin/đăng ký)
- `Qualified`: **Khảo Sát Hiện Trạng** (Đã khảo sát thực địa & tư vấn giải pháp)
- `Dam phan`: **Đàm Phán & Báo Giá** (Đang thương thảo điều khoản/bảng giá)
- `Won`: **Ký Kết Hợp Đồng** (Hoàn tất chốt hợp đồng — **Hệ thống tự động khởi tạo Hợp đồng kinh tế và xuất file Word .docx**)
- `Lost`: **Thất Bại / Hủy Bỏ** (Dự án dừng hoặc khách hủy)

### Gọi API Backend:
- **Endpoint:** `PUT https://apiphucthanhaudio.wiai.vn/api/nv3/deal/{deal_id_hoac_sdt}` (hoặc `PATCH https://apiphucthanhaudio.wiai.vn/api/v1/leads/{lead_id}/stage`)
- **Headers:**
  - `Content-Type: application/json`
  - `ngrok-skip-browser-warning: true`

```json
{
  "stage": "Won",
  "notes": "Khách đồng ý cấu hình loa SR HR-12, chốt ký hợp đồng 450tr"
}
```

### Phản Hồi Từ Hệ Thống:
Khi chuyển sang `Won`, hệ thống sẽ:
1. Cập nhật trạng thái lead trong SQLite và Airtable.
2. Tự động gọi hàm `auto_create_contract_for_won_lead` để sinh mã hợp đồng kinh tế (ví dụ: `HD-20260917-085304695`).
3. Sinh file Word `.docx` chuẩn mẫu hợp đồng kinh tế Phúc Thanh Audio.
4. Cập nhật ngay vào tab **Quản Lý Hợp Đồng** và biểu đồ **KPI Doanh Thu** trên Web Quản Trị `https://phucthanhaudio.wiai.vn/`.

```json
{
  "action": "ANSWER",
  "blocks": [
    "🎯 **Cập nhật trạng thái cơ hội thành công!**",
    "• **Mã Khách Hàng:** `0908123456`",
    "• **Giai đoạn mới:** Ký Kết Hợp Đồng (Won)",
    "• **Mã Hợp Đồng Tự Động Sinh:** `HD-20260917-085304695`",
    "• **Tài liệu Hợp đồng:** Đã kết xuất file Word .docx và lưu trữ trên hệ thống"
  ],
  "data": { "deal_id": "0908123456", "stage": "Won", "created_contract_code": "HD-20260917-085304695" }
}
```
Mọi thay đổi trạng thái sẽ đồng thời tự động xóa cache Redis (`leads_list_v1`, `kpi_summary`, `contracts_list`) để giao diện Web tại `https://phucthanhaudio.wiai.vn/` cập nhật tức thì.
