# BỘ SKILL CHO BOT TƯƠNG TÁC HỆ THỐNG PHÚC THANH AUDIO

Tài liệu hướng dẫn và tập hợp các Skills dành cho **AI Bot (Telegram / OpenClaw / Zalo Bot)** tương tác trực tiếp với Backend FastAPI của **Phúc Thanh Audio Group** trên máy chủ đã deploy chính thức: **`https://phucthanhaudio.wiai.vn`**.

---

## 1. Thông Tin Máy Chủ & Cổng Dịch Vụ (Deployment Info)

- **Domain Máy Chủ:** `https://phucthanhaudio.wiai.vn`
- **Giao diện Quản Trị Web (Frontend):** `https://phucthanhaudio.wiai.vn/` *(Cổng nội bộ Docker: 5173)*
- **API Backend & Bot Endpoints:** `https://phucthanhaudio.wiai.vn/api/...` *(Cổng nội bộ Docker: 8000)*
- **Tài khoản đăng nhập Web Quản Trị:**
  - **Tài khoản / Email:** `admin@phucthanhaudio.vn` *(hoặc `admin`)*
  - **Mật khẩu:** `PhucThanh@2026` *(hoặc `admin123`)*

---

## 2. Cơ Chế Lưu Trữ Dữ Liệu Kép (Database Persistence)

Mọi thao tác tạo Hợp đồng, Báo giá, Tiếp nhận Bảo hành hoặc Quản lý Lead qua Bot API **đều được tự động lưu vĩnh viễn vào hệ thống**:
1. **Lưu SQLite Database nội bộ (`phucthanh.db`):** Đảm bảo dữ liệu tức thì, không phụ thuộc mạng ngoài.
2. **Đồng bộ Airtable Cloud:** Tự động ghi bản ghi lên các bảng tương ứng trên Airtable.
3. **Hiển thị trực tiếp trên Web Dashboard:** Màn hình quản trị tự động hợp nhất dữ liệu từ SQLite DB và Airtable, giúp bản ghi tạo từ Bot xuất hiện ngay trên giao diện web mà không bị thất lạc.
4. **Kết xuất file Word chuẩn ISO:** Lưu trực tiếp tại `/app/output/` và cho phép tải về với đường dẫn công khai `https://phucthanhaudio.wiai.vn/api/v1/contracts/{id}/{id}.docx`.

---

## 3. Nguyên Tắc Phân Vai (Role Boundary)

- **CON BOT = Miệng + Tai + Tay:**
  - **Tai:** Lắng nghe tin nhắn từ khách hàng, KTV, Sales, hoặc CEO (NLU phân loại ý định, trích xuất thông tin như MST, SĐT, mã lỗi, tên thiết bị...).
  - **Não phụ:** Quyết định gọi skill nào, hỏi lại người dùng nếu thiếu thông tin bắt buộc (`action: "ASK"`).
  - **Tay:** Gọi HTTP API Backend FastAPI (`https://phucthanhaudio.wiai.vn/api/...`).
  - **Miệng:** Nhận kết quả từ backend, hiển thị trực tiếp danh sách `blocks[]` markdown cho người dùng chat. Không tự chế biến số liệu hay tính thuế/tổng tiền.

- **HỆ THỐNG BACKEND = Não chính + Bộ nhớ + Màn hình:**
  - Thực hiện tra cứu MST qua VietQR/Thuế, sinh file Word .docx theo mẫu chuẩn ISO, ghi dữ liệu vào SQLite & Airtable, tích hợp ZBS WIFIM Zalo OA.

---

## 4. Chuẩn Giao Thức Gọi API & Dữ Liệu Phản Hồi

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

## 5. Danh Mục Các Skills (NV1 - NV8)

| Skill | Tên Kỹ Năng | Endpoint Trực Tiếp | Method | Vai Trò Phục Vụ |
|---|---|---|---|---|
| [**nv1-contract**](./nv1-contract/SKILL.md) | Tạo Hợp Đồng Tự Động 1-Click | `https://phucthanhaudio.wiai.vn/api/nv1/contract` | `POST` | Sales, Kế toán |
| [**nv2-quote**](./nv2-quote/SKILL.md) | Báo Giá Tự Động ISO | `https://phucthanhaudio.wiai.vn/api/nv2/quote` | `POST` | Sales Kỹ Thuật |
| [**nv3-pipeline**](./nv3-pipeline/SKILL.md) | Quét Lead & Cập Nhật Pipeline | `https://phucthanhaudio.wiai.vn/api/nv3/morning_scan`<br>`https://phucthanhaudio.wiai.vn/api/nv3/deal/{id}` | `POST`<br>`PUT` | Sales, Trưởng phòng KD |
| [**nv4-zbs**](./nv4-zbs/SKILL.md) | Gửi Tin Nhắn Zalo ZBS WIFIM | `https://phucthanhaudio.wiai.vn/api/nv4/zbs/send` | `POST` | CSKH, Marketing |
| [**nv5-warranty**](./nv5-warranty/SKILL.md) | Tiếp Nhận & Hoàn Thành Bảo Hành | `https://phucthanhaudio.wiai.vn/api/nv5/warranty/start`<br>`https://phucthanhaudio.wiai.vn/api/nv5/warranty/{id}/complete` | `POST`<br>`PUT` | Kỹ thuật viên (KTV), Khách hàng |
| [**nv6-inventory**](./nv6-inventory/SKILL.md) | Kiểm Tra Tồn Kho & Cảnh Báo Hết Hàng | `https://phucthanhaudio.wiai.vn/api/nv6/stock/check` | `GET` | Thủ kho, Mua hàng |
| [**nv7-kpi**](./nv7-kpi/SKILL.md) | Báo Cáo KPI & Doanh Thu CEO | `https://phucthanhaudio.wiai.vn/api/nv7/kpi/report` | `GET` | Ban Giám Đốc, CEO |
| [**nv8-intake**](./nv8-intake/SKILL.md) | Đăng Ký Tư Vấn & Báo Giá Nhanh | `https://phucthanhaudio.wiai.vn/api/nv8/intake`<br>`https://phucthanhaudio.wiai.vn/api/nv8/intake/solutions` | `POST`<br>`GET` | Khách hàng, Tiếp nhận Lead |

