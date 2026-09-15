# PHÂN ĐỊNH VAI TRÒ HỆ THỐNG — PHÚC THANH AUDIO

---

## TỔNG QUAN 1 DÒNG

```
CON BOT  = Miệng + Tai + Tay          (giao tiếp qua chat, thực thi lệnh)
HỆ THỐNG = Não + Bộ nhớ + Màn hình   (backend xử lý nghiệp vụ + Web UI quản lý)

Hệ Thống gồm 2 phần:
  ├─ Backend (FastAPI)  → Logic, dữ liệu, tích hợp bên ngoài
  └─ Web UI (React)    → Màn hình quản lý cho nội bộ (CEO, Sales, KTV)
```

---

## SƠ ĐỒ KIẾN TRÚC TỔNG THỂ

```
┌────────────────────────────┐   ┌──────────────────────────────┐
│       CON BOT (Telegram)   │   │      WEB UI (React/Vite)     │
│                            │   │                              │
│  • Nhận chat KH/NV         │   │  • Dashboard KPI (CEO)       │
│  • LLM hiểu ý định         │   │  • Quản lý Lead & Pipeline   │
│  • OpenClaw gọi tool       │   │  • Quản lý Báo giá & HĐ     │
│  • Render trả lời          │   │  • Quản lý Phiếu Bảo hành   │
│  • Cron nhắc việc          │   │  • Quản lý Tồn kho           │
└──────────┬─────────────────┘   └──────────────┬───────────────┘
           │  HTTP REST API                      │  HTTP REST API
           │  { action, blocks[], data }         │  (CRUD, filter, export)
           └────────────────┬────────────────────┘
                            ▼
           ┌─────────────────────────────────────┐
           │       BACKEND (FastAPI - Port 8000)  │
           │                                     │
           │  • Bộ nhớ khách hàng (theo SĐT)    │
           │  • Logic 6 nghiệp vụ (state machine)│
           │  • Giao tiếp Airtable (DB trung tâm)│
           │  • Tra MST.vn, DauThau.info         │
           │  • Tạo file HĐ/BG (Google Docs)     │
           │  • Bắn thông báo (Telegram, ZBS)    │
           │  • Báo cáo KPI                      │
           └────────┬────────────────┬───────────┘
                    │                │
         ┌──────────▼──┐    ┌────────▼──────────┐
         │  AIRTABLE   │    │ Google Docs/Drive  │
         │  (Database) │    │ (File HĐ, BG PDF)  │
         └──────────┬──┘    └────────────────────┘
                    │
         ┌──────────▼──────────────┐
         │  Zalo ZBS / Telegram    │
         │  (Thông báo đầu ra)     │
         └─────────────────────────┘
```

---

## VAI TRÒ CHI TIẾT

---

### 🤖 CON BOT — "Nhân viên tiếp tân thông minh"

**Bot làm GÌ:**

| # | Nhiệm vụ | Ví dụ cụ thể |
|---|---|---|
| 1 | **Nghe** — Nhận tin nhắn từ mọi nguồn | KH nhắn Zalo: *"báo giá cho mình cái loa JBL"* |
| 2 | **Hiểu** — LLM phân tích ý định, trích xuất thông tin | Hiểu: NV2 Báo giá, SP = JBL, thiếu model cụ thể |
| 3 | **Hỏi thêm** — Khi thiếu thông tin | *"Anh cho em hỏi thêm model cụ thể và số lượng ạ?"* |
| 4 | **Gọi API** — OpenClaw gọi đúng endpoint backend | `POST /api/nv2/quote { phone, products[] }` |
| 5 | **Render** — Hiển thị kết quả đẹp cho người đọc | Lấy `blocks[]` từ backend, format thành tin nhắn Telegram |
| 6 | **Nhắc việc** — Cron nhắc Sales, KTV, CEO | Mỗi sáng 8h: *"Anh ơi, còn 2 lead chưa liên hệ"* |

**Bot KHÔNG làm:**
```
❌ KHÔNG tự tính toán giá, lợi nhuận, VAT
❌ KHÔNG tự lưu dữ liệu vào Airtable
❌ KHÔNG tự quyết định logic nghiệp vụ
❌ KHÔNG biết thông tin lịch sử khách hàng (do backend giữ)
❌ KHÔNG tự xuất file Word/PDF
❌ KHÔNG tự gửi Zalo cho khách (backend gửi)
```

---

### 🏭 HỆ THỐNG BACKEND — "Cỗ máy xử lý thật sự"

**Backend làm GÌ:**

| # | Nhiệm vụ | Ví dụ cụ thể |
|---|---|---|
| 1 | **Bộ nhớ khách hàng** | KH gọi lại: bot tự biết KH đang theo dõi dự án nào |
| 2 | **Logic nghiệp vụ** | Tính tổng tiền báo giá, cộng VAT, chọn template đúng |
| 3 | **Giao tiếp Airtable** | Đọc bảng giá, ghi lead mới, cập nhật trạng thái deal |
| 4 | **Tra cứu ngoài** | Gọi MST.vn → trả về tên công ty, địa chỉ pháp nhân |
| 5 | **Tạo file** | Clone Google Docs template → fill dữ liệu → xuất PDF |
| 6 | **Bắn thông báo** | Gửi Telegram CEO, Zalo KH qua ZBS |
| 7 | **Báo cáo KPI** | Query Airtable → tính số liệu → format báo cáo gửi CEO |
| 8 | **State machine** | Theo dõi tiến trình đa bước: BH đang ở bước nào? |
| 9 | **Cung cấp API cho Web UI** | CRUD lead, đơn hàng, phiếu BH, tồn kho cho màn hình quản lý |

---

### 🖥️ WEB UI — "Màn hình quản lý nội bộ"

> Dành cho: **CEO, Sales, KTV, Thủ kho** — dùng trên máy tính, không phải chat

**Web UI làm GÌ:**

| Màn hình | Ai dùng | Chức năng chính |
|---|---|---|
| **Dashboard KPI** | CEO | Nhìn 1 màn thấy hết: doanh thu, pipeline, lead mới, tồn kho |
| **Pipeline / Lead** | Sales | Xem lead mới, kéo stage, ghi chú tiến độ, lọc theo Sales |
| **Báo giá & Hợp đồng** | Sales | Danh sách BG đã gửi, tạo BG mới, xem link HĐ Drive |
| **Phiếu Bảo hành** | KTV / CSKH | DS phiếu BH, cập nhật trạng thái sửa chữa, xem lịch sử |
| **Tồn kho** | Thủ kho | Nhập/xuất kho, xem cảnh báo sắp hết, tra cứu SP |
| **Danh mục & Bảng giá** | Admin | CRUD sản phẩm, cập nhật giá → sync Airtable |

**Web UI KHÔNG làm:**
```
❌ KHÔNG chứa logic nghiệp vụ (chỉ hiển thị, không tính toán)
❌ KHÔNG giao tiếp trực tiếp với Airtable (luôn qua Backend API)
❌ KHÔNG gửi thông báo (Telegram/Zalo do Backend gửi)
❌ KHÔNG thay thế được Bot (Bot dành cho chat, UI dành cho quản lý)
```

**Bot vs Web UI — Ai dùng cái nào?**

| Tình huống | Dùng Bot | Dùng Web UI |
|---|:---:|:---:|
| KH hỏi báo giá nhanh qua Zalo | ✅ | ❌ |
| Sales xem toàn bộ pipeline tháng | ❌ | ✅ |
| KTV nhận thông báo phiếu BH mới | ✅ (Telegram) | ❌ |
| KTV cập nhật tiến độ sửa chữa | ✅ hoặc | ✅ |
| CEO xem dashboard doanh thu | ❌ | ✅ |
| CEO nhận báo cáo tóm tắt sáng thứ 2 | ✅ (Telegram) | ❌ |
| Admin cập nhật bảng giá sản phẩm | ❌ | ✅ |

---

## PHÂN CÔNG THEO TỪNG NGHIỆP VỤ

---

### NV1 — Tạo Hợp Đồng Tự Động

```
Bot                              Backend
 │                                 │
 │← KH/Sales nhắn: MST + thông tin │
 │                                 │
 │─── POST /api/nv1/contract ──────▶│
 │                                 │── Gọi MST.vn API
 │                                 │── Clone Google Docs template
 │                                 │── Fill dữ liệu
 │                                 │── Lưu Drive + Airtable
 │                                 │── Gửi Telegram nội bộ
 │◀── { action:"ANSWER",           │
 │     blocks:["✅ HĐ đã tạo...    │
 │             Link: ..."] }        │
 │                                 │
 │→ Render tin nhắn cho Sales      │
```

---

### NV2 — Báo Giá Tự Động ISO

```
Bot                              Backend
 │                                 │
 │← KH nhắn: "báo giá JBL..."      │
 │                                 │
 │─ Hỏi: model? số lượng? ────────▶│ (nếu thiếu)
 │                                 │
 │─── POST /api/nv2/quote ─────────▶│
 │                                 │── Query Airtable [Bảng giá]
 │                                 │── Tính tổng, VAT
 │                                 │── Tạo PDF báo giá ISO
 │                                 │── Lưu Airtable [Báo giá]
 │                                 │── Gửi PDF cho KH qua Zalo
 │◀── { blocks:["📄 Đã gửi BG..."] │
 │                                 │
 │→ Thông báo Sales trên Telegram  │
```

---

### NV3 — Pipeline Bán Hàng

```
Bot                              Backend
 │                                 │
 │ [Cron 7h sáng]                  │
 │─── POST /api/nv3/morning_scan ──▶│
 │                                 │── Query DauThau.info
 │                                 │── Tìm dự án phù hợp
 │                                 │── Tạo Lead Airtable
 │                                 │── Tính Lead Score
 │◀── { blocks:["🔥 Lead mới..."] } │
 │                                 │
 │→ Gửi Telegram CEO + Sales       │
 │                                 │
 │ [Sales cập nhật deal]           │
 │─── PUT /api/nv3/deal/{id} ──────▶│
 │                                 │── Cập nhật stage Airtable
 │                                 │── Nếu Won → trigger NV1+NV2
```

---

---

### NV4 — CSKH & Gửi Tin Tự Động Zalo ZBS (WIFIM API)

```
Hệ thống / Bot / Web UI            Backend                          ZBS WIFIM API
 │                                   │                                    │
 │── Trigger sự kiện                 │                                    │
 │   (HĐ tạo xong / Nhắc nợ /        │                                    │
 │    Lịch hẹn BH / Cảm ơn sau mua)  │                                    │
 │                                   │── Chuẩn hóa SĐT (09xxx / 84xxx)    │
 │                                   │── Map template_data theo mẫu Zalo  │
 │                                   │─── POST /v1/send (X-API-Key) ─────▶│
 │                                   │                                    │── Gửi tin Zalo OA tới KH
 │                                   │◀── { success: true, msg_id } ──────│
 │                                   │── Lưu log vào Airtable             │
 │                                   │── Trừ & theo dõi Quota tin nhắn    │
 │◀── Báo kết quả gửi tin            │                                    │
```

### NV5 — Bảo Hành & Sửa Chữa

```
Bot                              Backend
 │                                 │
 │← KH Zalo: "máy bị hỏng..."      │
 │─── POST /api/nv5/warranty/start ─▶│
 │                                 │── Kiểm tra HĐ/BH còn hạn
 │                                 │── Tạo Phiếu BH Airtable
 │                                 │── Telegram → KTV phụ trách
 │◀── { action:"ASK",              │
 │     blocks:["Model thiết bị?"] } │
 │→ Hỏi KH thêm                   │
 │                                 │
 │ [KTV hoàn thành]                │
 │─── PUT /api/nv5/warranty/{id}   │
 │         /complete ──────────────▶│── Gửi Zalo KH: "Xong rồi ạ"
```

---

### NV6 — Tồn Kho & Cảnh Báo

```
Bot                              Backend
 │                                 │
 │ [Cron 8h sáng]                  │
 │─── GET /api/nv6/stock/check ────▶│
 │                                 │── Query Airtable [Tồn kho]
 │                                 │── So sánh với ngưỡng min
 │                                 │── Phân loại: OK / ⚠️ / 🔴
 │◀── { blocks:["⚠️ Loa ABC..."] } │
 │                                 │
 │→ Gửi Telegram Quản lý kho       │
```

---

### NV7 — KPI Dashboard & Báo Cáo CEO

```
Bot                              Backend
 │                                 │
 │ [Cron T2 7h / Ngày 1]          │
 │─── GET /api/nv7/kpi/report ─────▶│
 │                                 │── Query Airtable (doanh thu, deal)
 │                                 │── Tính % tăng trưởng
 │                                 │── Format báo cáo
 │◀── { blocks:["📊 Báo cáo..."] } │
 │                                 │
 │→ Gửi Telegram CEO               │
```

---

## BẢNG PHÂN CHIA TRÁCH NHIỆM NHANH

| Việc | Bot | Backend | Web UI |
|---|:---:|:---:|:---:|
| Nhận tin nhắn Telegram/Zalo | ✅ | ❌ | ❌ |
| Hiểu ý định người dùng (NLU) | ✅ | ❌ | ❌ |
| Hỏi thêm khi thiếu thông tin | ✅ | ❌ | ❌ |
| Render tin nhắn chat | ✅ | ❌ | ❌ |
| Cron nhắc việc (sáng, tuần) | ✅ | ❌ | ❌ |
| Logic nghiệp vụ, tính toán | ❌ | ✅ | ❌ |
| Lưu bộ nhớ khách hàng | ❌ | ✅ | ❌ |
| Tính báo giá, VAT, tổng tiền | ❌ | ✅ | ❌ |
| Tra MST.vn, DauThau.info | ❌ | ✅ | ❌ |
| Tạo file HĐ / PDF Báo giá | ❌ | ✅ | ❌ |
| Đọc/Ghi Airtable | ❌ | ✅ | ❌ |
| Gửi Zalo ZBS cho KH | ❌ | ✅ | ❌ |
| Bắn Telegram CEO/Sales/KTV | ✅ render | ✅ quyết định | ❌ |
| Hiển thị Dashboard KPI | ❌ | ❌ | ✅ |
| Quản lý Pipeline (kéo stage) | ❌ | ❌ | ✅ |
| Xem/quản lý Phiếu Bảo hành | ❌ | ❌ | ✅ |
| Quản lý Tồn kho (nhập/xuất) | ❌ | ❌ | ✅ |
| CRUD Danh mục & Bảng giá | ❌ | ❌ | ✅ |
| Xem danh sách BG & HĐ | ❌ | ❌ | ✅ |

---

## QUY TẮC VÀNG

```
┌────────────────────────────────────────────────────────┐
│  Bot chỉ được nói câu trả lời mà                       │
│  Backend đã xác nhận là đúng.                          │
│                                                        │
│  Bot KHÔNG bao giờ tự bịa giá, tự bịa thông tin       │
│  pháp nhân, hay tự xác nhận "đã tạo xong" mà          │
│  chưa có response thành công từ Backend.               │
└────────────────────────────────────────────────────────┘
```

---

## TÓM LẠI: AI LÀM GÌ?

```
Bot          = Giao diện hội thoại (chat, mobile-first)
                → Dành cho KH và nhân viên chat nhanh
                → Trả lời đúng/sai PHỤ THUỘC vào Backend

Web UI       = Giao diện quản lý (dashboard, desktop-first)
                → Dành cho CEO, Sales, KTV nhìn tổng quan
                → Thao tác phức tạp, xem data đa chiều

Backend      = Bộ não thật sự (phục vụ cả Bot lẫn Web UI)
                → Chứa toàn bộ logic, dữ liệu, nghiệp vụ
                → Bot gọi API → Backend xử lý → trả kết quả
                → Web UI gọi API → Backend trả data → hiển thị

Airtable     = Kho dữ liệu trung tâm
                → Mọi thứ đều lưu ở đây
                → Backend đọc/ghi, KHÔNG ai gọi thẳng bỏ qua Backend

Google Drive = Kho file xuất (HĐ, BG)
                → Backend tạo file, lưu vào đây
                → Trả link cho Bot / Web UI hiển thị

Zalo ZBS     = Kênh giao tiếp với khách hàng cuối
                → Backend gọi trực tiếp khi cần gửi KH

Telegram     = Kênh nội bộ (CEO, Sales, KTV)
                → Bot: giao tiếp 2 chiều (chat)
                → Backend: push thông báo 1 chiều (alert)
```

### Nguyên tắc cốt lõi:
```
Bot + Web UI chỉ là 2 "mặt tiền" khác nhau
của cùng 1 Backend duy nhất.

Không bao giờ có 2 Backend riêng cho Bot và UI.
Không bao giờ gọi thẳng Airtable bỏ qua Backend.
```

---

*Cập nhật: 2026-09-14 (v2 — bổ sung Web UI)*
