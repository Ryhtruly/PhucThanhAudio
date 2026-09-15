# BỘ SKILL CHO BOT TƯƠNG TÁC HỆ THỐNG PHÚC THANH AUDIO

Tài liệu hướng dẫn và tập hợp các Skills dành cho **AI Bot (Telegram / OpenClaw / Zalo Bot)** tương tác trực tiếp với Backend FastAPI của **Phúc Thanh Audio Group** qua đường hầm **ngrok công khai**.

---

## 1. Địa Chỉ Máy Chủ (Ngrok Base URL)

- **Base URL hiện tại:** `https://perky-grasp-sponge.ngrok-free.dev`
- **Môi trường nội bộ:** `http://localhost:8000`
- **Lưu ý:** Khi Bot gọi HTTP Request, nên kèm Header:
  ```http
  ngrok-skip-browser-warning: true
  Content-Type: application/json
  ```

---

## 2. Nguyên Tắc Phân Vai (Role Boundary)

- **CON BOT = Miệng + Tai + Tay:**
  - **Tai:** Lắng nghe tin nhắn từ khách hàng, KTV, Sales, hoặc CEO (NLU phân loại ý định, trích xuất thông tin như MST, SĐT, mã lỗi, tên thiết bị...).
  - **Não phụ:** Quyết định gọi skill nào, hỏi lại người dùng nếu thiếu thông tin bắt buộc (`action: "ASK"`).
  - **Tay:** Gọi HTTP API Backend FastAPI (`https://perky-grasp-sponge.ngrok-free.dev/api/...`).
  - **Miệng:** Nhận kết quả từ backend, hiển thị trực tiếp danh sách `blocks[]` markdown cho người dùng chat. Không tự chế biến số liệu hay tính thuế/tổng tiền.

- **HỆ THỐNG BACKEND = Não chính + Bộ nhớ + Màn hình:**
  - Thực hiện tra cứu MST qua VietQR/Thuế, sinh file Word .docx theo mẫu chuẩn ISO, ghi dữ liệu vào SQLite & Airtable, tích hợp ZBS WIFIM Zalo OA.

---

## 3. Chuẩn Giao Thức Gọi API & Dữ Liệu Phản Hồi

Tất cả các endpoint dành cho Bot đều trả về JSON đồng nhất:
```json
{
  "action": "ANSWER" | "ASK" | "ERROR",
  "blocks": [
    "Dòng 1 markdown...",
    "Dòng 2 markdown..."
  ],
  "data": { ... }
}
```
- Khi `action == "ANSWER"`: Bot xuất trực tiếp các dòng trong mảng `blocks` ra màn hình chat.
- Khi `action == "ASK"`: Bot hiển thị câu hỏi bổ sung để lấy thêm thông tin từ người dùng.
- Khi `action == "ERROR"`: Bot thông báo lỗi từ `blocks[0]` cho người dùng.

---

## 4. Danh Mục Các Skills (NV1 - NV7)

| Skill | Tên Kỹ Năng | Endpoint Trực Tiếp (Ngrok) | Method | Vai Trò Phục Vụ |
|---|---|---|---|---|
| [**nv1-contract**](./nv1-contract/SKILL.md) | Tạo Hợp Đồng Tự Động 1-Click | `https://perky-grasp-sponge.ngrok-free.dev/api/nv1/contract` | `POST` | Sales, Kế toán |
| [**nv2-quote**](./nv2-quote/SKILL.md) | Báo Giá Tự Động ISO | `https://perky-grasp-sponge.ngrok-free.dev/api/nv2/quote` | `POST` | Sales Kỹ Thuật |
| [**nv3-pipeline**](./nv3-pipeline/SKILL.md) | Quét Lead & Cập Nhật Pipeline | `https://perky-grasp-sponge.ngrok-free.dev/api/nv3/morning_scan`<br>`https://perky-grasp-sponge.ngrok-free.dev/api/nv3/deal/{id}` | `POST`<br>`PUT` | Sales, Trưởng phòng KD |
| [**nv4-zbs**](./nv4-zbs/SKILL.md) | Gửi Tin Nhắn Zalo ZBS WIFIM | `https://perky-grasp-sponge.ngrok-free.dev/api/nv4/zbs/send` | `POST` | CSKH, Marketing |
| [**nv5-warranty**](./nv5-warranty/SKILL.md) | Tiếp Nhận & Hoàn Thành Bảo Hành | `https://perky-grasp-sponge.ngrok-free.dev/api/nv5/warranty/start`<br>`https://perky-grasp-sponge.ngrok-free.dev/api/nv5/warranty/{id}/complete` | `POST`<br>`PUT` | Kỹ thuật viên (KTV), Khách hàng |
| [**nv6-inventory**](./nv6-inventory/SKILL.md) | Kiểm Tra Tồn Kho & Cảnh Báo Hết Hàng | `https://perky-grasp-sponge.ngrok-free.dev/api/nv6/stock/check` | `GET` | Thủ kho, Mua hàng |
| [**nv7-kpi**](./nv7-kpi/SKILL.md) | Báo Cáo KPI & Doanh Thu CEO | `https://perky-grasp-sponge.ngrok-free.dev/api/nv7/kpi/report` | `GET` | Ban Giám Đốc, CEO |
