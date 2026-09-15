# DỰ ÁN PHÚC THANH AUDIO — TÀI NGUYÊN & TIẾN ĐỘ

*Cập nhật: 2026-09-14*

---

## 📎 GOOGLE DOCS TEMPLATES

| Template | Link | Trạng thái |
|---|---|---|
| 📄 Hợp đồng mẫu | https://docs.google.com/document/d/14WNK4q6Kqf9AsurGueLQAzNH6hjNVnSfzdzLusNIM5Q/edit | ✅ Đã duyệt |
| 📋 Báo giá ISO mẫu | https://docs.google.com/document/d/1_Ptl1QbzC8p8ckjBx65TmVFn5X4R9l28ai0O-wF2gqg/edit | ✅ Đã duyệt |

---

## 📁 FILES ĐÃ TẠO

| File | Mục đích |
|---|---|
| `phan_tich_nghiep_vu_phucthanh.md` | Phân tích chi tiết 6 nghiệp vụ |
| `role_definition_phucthanh.md` | Phân vai Bot / Backend / Web UI |
| `phan_ra_va_airtable_schema.md` | Phân rã Input/Output + Airtable Schema 10 bảng |

---

## ✅ TIẾN ĐỘ

- [x] Đọc & phân tích yêu cầu nghiệp vụ (6 NV từ Excel)
- [x] Phân định vai trò Bot / Backend / Web UI
- [x] Phân rã Input / Output từng NV
- [x] Thiết kế Airtable Schema (10 bảng)
- [x] Tạo & duyệt template Hợp đồng (Google Docs)
- [x] Tạo & duyệt template Báo giá ISO (Google Docs)
- [x] Tạo Airtable Base theo schema (`applSd5Z3mQyCsKxN` - [Airtable Base](https://airtable.com/applSd5Z3mQyCsKxN))
- [x] Nạp dữ liệu mẫu (Sample data) chuẩn âm thanh ánh sáng Phúc Thanh (Nhân viên, Khách hàng, Sản phẩm, Báo giá, Hợp đồng, Bảo hành)
- [x] Thiết kế API endpoints & Cấu trúc dự án Backend (FastAPI)
- [x] Code Backend (FastAPI + VietQR/MST API + Airtable API + ZBS WIFIM API + Document Generator)
- [x] Code Web UI (React + Vite + Glassmorphism Dark Mode)
- [ ] Tích hợp Bot (Telegram + OpenClaw)
- [ ] Test end-to-end

---

## 🔑 PLACEHOLDERS MAPPING

### Hợp đồng
```
{{CONTRACT_ID}}           → Mã HĐ tự sinh (HĐ-YYYYMM-XXX)
{{CONTRACT_DATE}}         → Ngày ký
{{CONTRACT_TYPE}}         → Loại HĐ
{{CONTRACT_VALUE}}        → Giá trị (số)
{{CONTRACT_VALUE_TEXT}}   → Giá trị (chữ)
{{PAYMENT_TERMS}}         → Điều khoản TT
{{DELIVERY_DATE}}         → Ngày giao hàng
{{WARRANTY_MONTHS}}       → Số tháng BH
{{SPECIAL_TERMS}}         → Điều khoản đặc biệt
{{SALES_REPRESENTATIVE}}  → Nhân viên KD phụ trách
{{BUYER_COMPANY_NAME}}    → Tên cty bên mua (từ MST.vn)
{{BUYER_MST}}             → MST bên mua
{{BUYER_ADDRESS}}         → Địa chỉ bên mua (từ MST.vn)
{{BUYER_REPRESENTATIVE}}  → Người đại diện (từ MST.vn)
{{BUYER_POSITION}}        → Chức vụ người đại diện
{{BUYER_PHONE}}           → SĐT liên hệ
{{ITEM_X_NAME/QTY/PRICE/TOTAL}} → Dòng SP (X = 1→5)
{{TOTAL_BEFORE_VAT}}      → Tổng chưa VAT
{{TOTAL_VAT}}             → VAT 10%
{{TOTAL_AMOUNT}}          → Tổng thanh toán
```

### Báo giá ISO
```
{{QUOTE_ID}}              → Mã BG tự sinh (BG-YYYYMM-XXX)
{{QUOTE_DATE}}            → Ngày lập BG
{{QUOTE_VALID_UNTIL}}     → Hết hạn BG (+30 ngày)
{{BUYER_COMPANY_NAME}}    → Tên cty KH
{{BUYER_CONTACT_NAME}}    → Người liên hệ
{{BUYER_PHONE}}           → SĐT
{{BUYER_EMAIL}}           → Email
{{PROJECT_NAME}}          → Tên dự án / công trình
{{ITEM_X_NAME/BRAND/UNIT/QTY/PRICE/TOTAL}} → Dòng SP (X = 1→7)
{{TOTAL_BEFORE_VAT}}      → Cộng tiền hàng
{{TOTAL_VAT}}             → VAT 10%
{{TOTAL_AMOUNT}}          → Tổng thanh toán
{{TOTAL_AMOUNT_TEXT}}     → Bằng chữ
{{DELIVERY_NOTES}}        → ĐK giao hàng
{{WARRANTY_NOTES}}        → Chính sách BH
{{PAYMENT_NOTES}}         → ĐK thanh toán
{{SPECIAL_NOTES}}         → Ghi chú đặc biệt
{{SALES_REPRESENTATIVE}}  → Nhân viên KD
```

---

## 🏗️ AIRTABLE — 10 BẢNG (thứ tự tạo)

```
1.  Nhân viên / Staff
2.  Khách hàng
3.  Sản phẩm & Bảng giá
4.  Lead / Pipeline
5.  Báo giá
6.  Chi tiết Báo giá
7.  Hợp đồng
8.  Phiếu Bảo Hành
9.  Giao dịch kho
10. Báo cáo lịch sử
```

---

## 💬 ZALO ZBS TEMPLATES (NV4)

### Zalo ZBS (WIFIM API) — Nghiệp vụ 4
\Endpoint: https://zbs.wifim.vn/api
Client: D:\Downloads\cty\PhucThanh\zbswifim\scripts\zbs_client.py
Template chính:
- 584044: Hợp đồng mẫu / Khởi động dự án (customer_name, date, order_code, money, service)
- 422511: Xác nhận đơn hàng / Báo giá (name, price, code)
- 584045: Yêu cầu thanh toán / Nhắc nợ (price, transfer_amount, bank_transfer_note, product_name, ma_hop_dong, ten_khach_hang, ngay_thanh_toan)
- 584042: Lịch hẹn khảo sát / Bảo hành (customer_name, booking_code, schedule_time, address)
- 274649: Cảm ơn quý khách hoàn thành dịch vụ / BH (customer_name, product_name, date, code)
\
---

## 📌 GHI CHÚ KỸ THUẬT

- **Google Docs API** cần Service Account để clone & fill template
- **MST.vn** tra qua endpoint: `https://api.vietqr.io/v2/business/{mst}` (free, không cần key)
- **Template clone:** Dùng `files().copy()` rồi `batchUpdate()` để replace placeholder
- **ZBS (Zalo Business Solution):** Cần đăng ký tài khoản ZBS để gửi Zalo OA
- **DauThau.info:** Cần kiểm tra có API công khai không, nếu không thì scrape HTML
