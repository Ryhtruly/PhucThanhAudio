# BỘ KỸ NĂNG TÍCH HỢP HỆ THỐNG (API SKILLS) — PHÚC THANH AUDIO

Tài liệu hướng dẫn và tập hợp các Skills tích hợp dành cho **Trợ lý Hội thoại & Bot Nghiệp vụ (Zalo, Telegram, Webhook)** kết nối trực tiếp với Backend FastAPI của **Phúc Thanh Audio Group** trên máy chủ sản xuất.

---

## 1. Phân Định Tên Miền & Cổng Dịch Vụ (Domains & Ports)

Hệ thống được tách biệt rõ ràng giữa Cổng Giao diện Người dùng và Cổng Dịch vụ API:

- **Cổng Dịch Vụ API Backend:** **`https://apiphucthanhaudio.wiai.vn`** *(Cổng nội bộ Docker: 8000)*
  - Toàn bộ các yêu cầu HTTP POST, GET, PUT của Bot / Webhook **đều gọi tới domain này**.
  - Tài liệu Swagger API tương tác: `https://apiphucthanhaudio.wiai.vn/docs`
- **Cổng Quản Trị Web (Frontend ERP):** **`https://phucthanhaudio.wiai.vn/`** *(Cổng nội bộ Docker: 5173)*
  - Dành cho Giám đốc, Kế toán, Sales và Kỹ thuật viên truy cập làm việc trực tiếp trên trình duyệt.
  - Trang đăng ký tư vấn khách hàng công cộng: `https://phucthanhaudio.wiai.vn/intake`
- **Dịch vụ Bộ nhớ đệm Redis:** Chạy nội bộ kết nối trực tiếp (`redis:6379`), tối ưu tốc độ phản hồi danh mục < 15ms.
- **Bảo mật & Phân quyền Quản trị Web:**
  - Cổng Quản trị yêu cầu xác thực phiên bảo mật (session-based) trước khi truy cập Dashboard.
  - Thông tin tài khoản và mật khẩu quản trị được cấp phát riêng qua **Trình quản lý mật khẩu nội bộ** của công ty (không lưu trữ mật khẩu nhạy cảm trong tài liệu này).


---

## 2. Kiến Trúc Lưu Trữ & Xử Lý Dữ Liệu

Mọi thao tác tạo Hợp đồng, Báo giá, Tiếp nhận Bảo hành hoặc Quản lý Cơ hội bán hàng qua API **đều được xử lý đồng bộ và lưu trữ chuẩn hóa**:
1. **Lưu Cơ sở dữ liệu nội bộ SQLite (`phucthanh.db`):** Đảm bảo tốc độ truy xuất mili-giây, độc lập và ổn định tuyệt đối.
2. **Bộ nhớ đệm Redis Cache-Aside:** Tự động lưu cache (TTL 300s) và tự động xóa cache tức thời khi có giao dịch mới phát sinh (Mutation Invalidation).
3. **Đồng bộ Cơ sở dữ liệu Đám mây Airtable:** Tự động đẩy dữ liệu lên các bảng tương ứng trên Airtable.
4. **Chuẩn Hóa Kế Toán & Thuế GTGT (VAT):**
   - **Doanh thu thuần (Net Revenue):** Giá trị hàng hóa trước thuế VAT (ghi nhận chỉ tiêu tài chính kế toán VAS).
   - **Tổng thanh toán (Grand Total):** Giá trị sau thuế VAT (nghĩa vụ thanh toán trên Hợp đồng).
5. **Kết xuất Tài liệu Văn bản (.docx):** Sinh file Word chuẩn quy chế công ty lưu tại `/app/output/` và cho phép tải trực tiếp qua:
   `https://apiphucthanhaudio.wiai.vn/api/v1/contracts/{id}/{id}.docx`

---

## 3. Nguyên Tắc Phân Vai (Role Boundary)

- **TRỢ LÝ TÍCH HỢP (Front-end Bot):**
  - Tiếp nhận thông điệp từ Khách hàng, Kỹ thuật viên, Nhân viên Kinh doanh hoặc Ban Giám Đốc.
  - Phân tích ý định người dùng, trích xuất tham số bắt buộc (Mã số thuế, Số điện thoại, Model thiết bị, Ngân sách...).
  - Gọi HTTP API Backend FastAPI tại `https://apiphucthanhaudio.wiai.vn/api/...`
  - Trình bày danh sách `blocks[]` markdown kết quả cho người dùng. Không tự ý bịa đặt số liệu hay tự tính thuế.

- **HỆ THỐNG MÁY CHỦ TRUNG TÂM (Backend Central Engine):**
  - Tra cứu thông tin pháp nhân doanh nghiệp qua Cổng thuế / VietQR.
  - Tính toán tài chính, kết xuất tài liệu hợp đồng .docx, lưu trữ CSDL và gửi thông báo Zalo ZNS chính thức.

---

## 4. Chuẩn Giao Thức Gọi API & Dữ Liệu Phản Hồi

Tất cả các endpoint tích hợp đều trả về định dạng JSON đồng nhất:
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
- Khi `action == "ANSWER"`: Xuất trực tiếp các dòng trong mảng `blocks` ra hội thoại.
- Khi `action == "ASK"`: Hiển thị câu hỏi làm rõ để lấy thêm thông tin còn thiếu từ người dùng.
- Khi `action == "ERROR"`: Thông báo lỗi từ `blocks[0]` cho người dùng.

---

## 5. Danh Mục Các Skills Tích Hợp (NV1 - NV8)

> ⚠️ **Lưu ý quan trọng:** Tất cả URL API bên dưới đều sử dụng domain API chuẩn: **`https://apiphucthanhaudio.wiai.vn`**

| Skill | Tên Nghiệp Vụ | Endpoint Trực Tiếp | Method | Đối Tượng Sử Dụng |
|---|---|---|---|---|
| [**nv1-contract**](./nv1-contract/SKILL.md) | Quản Lý & Soạn Thảo Hợp Đồng Kinh Tế | `https://apiphucthanhaudio.wiai.vn/api/nv1/contract` | `POST` | Kinh Doanh, Kế Toán |
| [**nv2-quote**](./nv2-quote/SKILL.md) | Lập Báo Giá Dự Án Thiết Bị Âm Thanh | `https://apiphucthanhaudio.wiai.vn/api/nv2/quote` | `POST` | Kỹ Sư Giải Pháp, Sales |
| [**nv3-pipeline**](./nv3-pipeline/SKILL.md) | Quản Lý Khách Hàng & Cơ Hội Bán Hàng | `https://apiphucthanhaudio.wiai.vn/api/nv3/morning_scan`<br>`https://apiphucthanhaudio.wiai.vn/api/nv3/deal/{id}` | `POST`<br>`PUT` | Kinh Doanh, Trưởng Phòng |
| [**nv4-zbs**](./nv4-zbs/SKILL.md) | Gửi Thông Báo Khách Hàng Qua Zalo (ZNS) | `https://apiphucthanhaudio.wiai.vn/api/nv4/zbs/send` | `POST` | CSKH, Vận Hành |
| [**nv5-warranty**](./nv5-warranty/SKILL.md) | Tiếp Nhận Dịch Vụ & Bảo Hành (RMA) | `https://apiphucthanhaudio.wiai.vn/api/nv5/warranty/start`<br>`https://apiphucthanhaudio.wiai.vn/api/nv5/warranty/{id}/complete` | `POST`<br>`PUT` | Kỹ Thuật Viên, Khách Hàng |
| [**nv6-inventory**](./nv6-inventory/SKILL.md) | Quản Lý Kho & Cảnh Báo Hàng Dự Trữ | `https://apiphucthanhaudio.wiai.vn/api/nv6/stock/check` | `GET` | Thủ Kho, Kế Hoạch Cung Ứng |
| [**nv7-kpi**](./nv7-kpi/SKILL.md) | Tổng Quan Điều Hành & Báo Cáo Doanh Thu | `https://apiphucthanhaudio.wiai.vn/api/nv7/kpi/report` | `GET` | Ban Giám Đốc, CEO |
| [**nv8-intake**](./nv8-intake/SKILL.md) | Cổng Tiếp Nhận Đăng Ký Tư Vấn & Báo Giá | `https://apiphucthanhaudio.wiai.vn/api/nv8/intake`<br>`https://apiphucthanhaudio.wiai.vn/api/nv8/intake/solutions` | `POST`<br>`GET` | Khách Hàng, Tiếp Nhận Dự Án |

---

## 6. Danh Mục Endpoint RESTful V1 Tra Cứu & Thao Tác Nhanh

Các endpoint V1 phục vụ tra cứu danh sách, tạo/sửa/xóa trực tiếp từ Frontend hoặc hệ thống tích hợp:

| Thực Thể / Nghiệp Vụ | Endpoint V1 | Method | Chức Năng |
|---|---|---|---|
| **Hợp Đồng** | `/api/v1/contracts` | `GET` | Lấy danh sách toàn bộ hợp đồng kinh tế |
| **Báo Giá** | `/api/v1/quotes` | `GET` | Lấy danh sách toàn bộ bảng báo giá |
| **Báo Giá** | `/api/v1/quotes/{id}` | `PUT` / `DELETE` | Chỉnh sửa / Xóa báo giá dự án |
| **Leads & Cơ Hội** | `/api/v1/leads` | `GET` | Lấy danh sách toàn bộ Leads trong pipeline |
| **Thiết Bị / Sản Phẩm** | `/api/v1/products` | `GET` | Lấy danh mục sản phẩm và bảng giá |
| **Thiết Bị / Sản Phẩm** | `/api/v1/products/{sku_or_id}` | `PUT` / `DELETE` | Sửa / Xóa thiết bị (hỗ trợ cả SKU lẫn Record ID) |
| **Phiếu Bảo Hành (RMA)** | `/api/v1/warranties` | `GET` | Lấy danh sách phiếu tiếp nhận bảo hành |
| **Tồn Kho & Cảnh Báo** | `/api/v1/inventory/items` | `GET` | Báo cáo chi tiết tồn kho từng mã hàng |
| **Giao Dịch Kho** | `/api/v1/inventory/transaction` | `POST` | Ghi nhận phiếu nhập/xuất kho thiết bị |

