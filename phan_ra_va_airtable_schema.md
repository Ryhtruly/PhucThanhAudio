# PHÂN RÃ NGHIỆP VỤ & THIẾT KẾ AIRTABLE
## CÔNG TY PHÚC THANH AUDIO GROUP

> **Nguyên tắc:** Phân rã đủ Input → Process → Output → Entities trước.
> Chỉ sau đó mới thiết kế schema Airtable.

---

## PHẦN 1: PHÂN RÃ NGHIỆP VỤ CHI TIẾT

---

### NV1 — TẠO HỢP ĐỒNG TỰ ĐỘNG

#### INPUT (dữ liệu cần thu thập)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Mã số thuế (MST) | Text | ✅ | Tra MST.vn để lấy thông tin pháp nhân |
| Số điện thoại liên hệ | Text | ✅ | SĐT người ký / người phụ trách |
| Giá trị hợp đồng | Number | ✅ | VNĐ, chưa VAT |
| Loại hợp đồng | Enum | ✅ | Cung cấp thiết bị / Thi công / Bảo trì / Tư vấn |
| Điều khoản đặc biệt | Long Text | ❌ | Ghi chú thêm ngoài template chuẩn |
| Ngày ký dự kiến | Date | ❌ | Mặc định = ngày tạo nếu không nhập |
| Nhân viên phụ trách | Linked → Staff | ✅ | Sales phụ trách deal này |

**Dữ liệu tự động lấy từ MST.vn:**
| Trường | Nguồn |
|---|---|
| Tên công ty | MST.vn API |
| Địa chỉ đăng ký | MST.vn API |
| Người đại diện pháp luật | MST.vn API |
| Mã số thuế (xác thực) | MST.vn API |

#### PROCESS (các bước xử lý)
```
1. Sales/Bot nhập: MST + SĐT + giá trị + loại HĐ
2. Backend gọi MST.vn → lấy: tên cty, địa chỉ, người đại diện
   └─ Nếu MST không hợp lệ → trả lỗi ngay, dừng
3. Chọn template Google Docs theo loại HĐ
4. Clone template → fill dữ liệu vào placeholders
5. Lưu file vào Google Drive (thư mục: /HĐ/{năm}/{tháng}/{tên_cty}/)
6. Tạo record Airtable [Hợp đồng]: status = "Chờ ký"
7. Gửi link Google Doc cho KH qua Zalo/Email
8. Push Telegram → Sales: "✅ HĐ {mã} đã tạo - KH: {tên} - {giá trị}đ"
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho |
|---|---|---|
| Google Doc link (file HĐ hoàn chỉnh) | URL | KH (Zalo/Email) + Sales (Telegram) |
| Record Airtable [Hợp đồng] | Database row | Hệ thống |
| Thông báo Telegram | Text message | Sales + CEO (nếu > ngưỡng) |

#### ENTITIES liên quan
- `Khách hàng` (tra hoặc tạo mới theo MST/SĐT)
- `Hợp đồng` (record chính)
- `Nhân viên / Staff` (Sales phụ trách)

#### EDGE CASES
| Tình huống | Xử lý |
|---|---|
| MST không tồn tại | Báo lỗi, yêu cầu nhập lại |
| KH đã có HĐ chưa ký | Cảnh báo + hỏi xác nhận tạo mới |
| Thiếu người đại diện trên MST.vn | Hỏi nhập thủ công |
| Giá trị HĐ > 500 triệu | Tự động báo Telegram CEO để duyệt |

---

### NV2 — BÁO GIÁ TỰ ĐỘNG THEO ISO

#### INPUT (dữ liệu cần thu thập)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Thông tin khách hàng | Text / Linked | ✅ | Tên cty / tên cá nhân + SĐT |
| Danh sách sản phẩm | Array | ✅ | Mỗi item: {tên/mã SP, số lượng, yêu cầu đặc biệt} |
| Yêu cầu đặc biệt | Long Text | ❌ | Thương hiệu ưu tiên, yêu cầu kỹ thuật |
| Dự án / Công trình | Text | ❌ | Tên dự án để ghi vào đầu BG |
| Có tính VAT không | Boolean | ✅ | Mặc định: có (10%) |
| Nhân viên phụ trách | Linked → Staff | ✅ | Sales tạo BG |

**Dữ liệu tự động lấy từ Airtable [Sản phẩm & Bảng giá]:**
| Trường | Nguồn |
|---|---|
| Mã sản phẩm | Airtable |
| Tên sản phẩm đầy đủ | Airtable |
| Đơn giá bán | Airtable |
| Thương hiệu / Xuất xứ | Airtable |
| Đơn vị tính | Airtable |

#### PROCESS (các bước xử lý)
```
1. KH/Sales nhập yêu cầu (qua Bot hoặc Web UI)
2. Backend tra Airtable [Sản phẩm] theo tên/mã → lấy đơn giá
   └─ SP không tìm thấy → gắn flag "Cần báo giá thủ công" → báo Sales
3. Tính toán:
   - Thành tiền = Đơn giá × Số lượng (từng dòng)
   - Cộng dồn = Σ Thành tiền
   - VAT = Cộng dồn × 10% (nếu có)
   - Tổng cộng = Cộng dồn + VAT
4. Sinh mã BG tự động: BG-YYYYMM-XXX
5. Clone Google Docs template "Báo giá ISO"
6. Fill: số BG, ngày, thông tin KH, bảng SP, tổng tiền, điều khoản chuẩn
7. Xuất PDF (Google Docs → PDF)
8. Lưu Airtable [Báo giá]: status = "Đã gửi"
9. Gửi PDF cho KH (Zalo / Email)
10. Thông báo Telegram Sales: "📄 BG {mã} đã gửi KH {tên} - {tổng}đ"
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho |
|---|---|---|
| File PDF Báo giá ISO | PDF (Drive link) | KH (Zalo/Email) |
| Record Airtable [Báo giá] | Database row | Hệ thống |
| Thông báo Telegram | Text message | Sales phụ trách |

#### ENTITIES liên quan
- `Khách hàng`
- `Báo giá` (record chính)
- `Chi tiết Báo giá` (bảng con: từng dòng sản phẩm)
- `Sản phẩm & Bảng giá` (tra giá)
- `Nhân viên`

#### EDGE CASES
| Tình huống | Xử lý |
|---|---|
| SP không có trong Airtable | Gắn flag, để trống giá, Sales tự điền |
| KH yêu cầu giá đặc biệt | Tạo BG ở trạng thái "Chờ duyệt", Sales duyệt giá trước khi gửi |
| BG từng làm cho KH này trước | Hiển thị lịch sử BG cũ, hỏi có muốn dựa trên BG trước không |
| SP thiếu giá trong bảng giá | Cảnh báo ngay khi tra, không để tạo BG với giá = 0 |

---

### NV3 — PIPELINE BÁN HÀNG (LEAD → CHỐT)

#### INPUT (dữ liệu cần thu thập)
**Sub-process A: Tiếp nhận Lead mới**
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Tên công ty / Cá nhân | Text | ✅ | |
| Người liên hệ | Text | ✅ | |
| Số điện thoại | Text | ✅ | |
| Email | Text | ❌ | |
| Nguồn lead | Enum | ✅ | Web / FB / Zalo / Call / DauThau.info / Giới thiệu |
| Nhu cầu / Dự án | Long Text | ✅ | Mô tả yêu cầu ban đầu |
| Giá trị ước tính | Number | ❌ | Tự động scoring nếu có |
| Khu vực | Text | ❌ | Tỉnh/TP |

**Sub-process B: Cập nhật tiến độ (Sales thực hiện)**
| Trường | Kiểu | Ghi chú |
|---|---|---|
| Stage | Enum | New → Qualified → Đàm phán → Won / Lost |
| Ghi chú tiến độ | Long Text | Sales ghi log từng lần liên hệ |
| Lý do Lost | Text | Bắt buộc khi chuyển sang Lost |
| Ngày dự kiến chốt | Date | |
| Giá trị chốt thực tế | Number | Điền khi Won |

#### PROCESS (các bước xử lý)
```
[Sub-process A: Lead mới]
1. Lead vào từ nguồn bất kỳ
   - Web form → webhook → Backend nhận
   - Bot chat (FB/Zalo/Telegram) → Backend nhận
   - DauThau.info → Cron scrape mỗi sáng 7h → Backend nhận
   - Sales tự nhập qua Web UI
2. Backend tạo record Airtable [Lead/Pipeline]: stage = "New"
3. Tự động Lead Scoring:
   - Nguồn DauThau.info + giá trị > 200tr → điểm cao
   - Nguồn giới thiệu → điểm cao
   - Tính điểm 1–10
4. Nếu điểm ≥ 7: Telegram CEO ngay "🔥 Hot Lead..."
5. Assign Sales theo quy tắc (vòng xoay / theo khu vực)
6. Telegram → Sales được assign: "📌 Lead mới: {tên} - {nhu cầu}"

[Sub-process B: Theo dõi tiến độ]
7. Sales cập nhật stage (Bot hoặc Web UI)
8. Mỗi thay đổi → log timestamp + stage cũ/mới vào Airtable
9. Cron check hàng ngày: Lead "New" chưa liên hệ sau 24h → Nhắc Sales
10. Khi Won:
    → Tự động trigger NV2 (tạo Báo giá) nếu chưa có
    → Tự động trigger NV1 (tạo HĐ) nếu có Báo giá confirmed
11. Khi Lost:
    → Bắt buộc nhập lý do
    → Log vào Airtable để phân tích xu hướng
```

**Sub-process C: DauThau.info Scraping (Cron)**
```
Cron 7h sáng mỗi ngày:
→ Scrape DauThau.info: keyword ["âm thanh", "AV", "ELV", "TV khách sạn", "LED"]
→ Lọc: giá trị gói thầu, trạng thái (đang mời thầu), deadline > 7 ngày
→ Dedupe: bỏ qua thầu đã tạo lead rồi (check Airtable)
→ Tạo Lead mới với nguồn = "DauThau.info"
→ Telegram CEO: danh sách thầu mới tìm được
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho |
|---|---|---|
| Record Airtable [Lead/Pipeline] | Database row | Hệ thống |
| Thông báo lead mới | Telegram | CEO (hot lead) + Sales (được assign) |
| Nhắc việc hàng ngày | Telegram | Sales |
| Báo cáo pipeline | Telegram | CEO (hàng tuần) |

#### ENTITIES liên quan
- `Lead / Pipeline` (record chính)
- `Lead Activity Log` (bảng con: lịch sử thay đổi stage)
- `Khách hàng` (khi qualified → chuyển thành KH)
- `Nhân viên` (Sales được assign)

#### EDGE CASES
| Tình huống | Xử lý |
|---|---|
| Lead trùng SĐT/email với KH cũ | Gộp vào KH cũ, tạo deal mới |
| Lead từ DauThau.info trùng với lead đang có | Dedupe, không tạo mới |
| Sales không cập nhật > 3 ngày | Cron nhắc Sales + báo CEO |
| Won nhưng giá trị khác BG đã gửi | Lưu cả 2, ghi chú chênh lệch |

---

---

### NV4 — CSKH & THÔNG BÁO TỰ ĐỘNG QUA ZALO ZBS (WIFIM API)

#### INPUT (dữ liệu cần thu thập)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Số điện thoại KH | Text | ✅ | 09xxx, 84xxx, hoặc +84xxx |
| Loại thông báo / Nghiệp vụ | Enum | ✅ | Hợp đồng / Báo giá / Nhắc nợ / Lịch hẹn BH / Cảm ơn |
| Template ID | Text | ✅ | ID template đã được Zalo duyệt trên ZBS WIFIM |
| Template Data | Object | ✅ | Key-value khớp với tham số yêu cầu của từng template |
| Thời gian hẹn gửi (nếu có) | Text | ❌ | Định dạng `HH:MM DD/MM` (scheduled_time) |
| Người đồng ý gửi ra ngoài | Boolean | ✅ | Bắt buộc xác nhận trước khi gửi tin bên ngoài |

**Mapping Template ZBS WIFIM:**
- `584044`: Hợp đồng mẫu / Khởi động dự án (`customer_name`, `date`, `order_code`, `money`, `service`)
- `422511`: Xác nhận đơn hàng / Báo giá (`name`, `price`, `code`)
- `584045`: Yêu cầu thanh toán / Nhắc nợ (`price`, `transfer_amount`, `bank_transfer_note`, `product_name`, `ma_hop_dong`, `ten_khach_hang`, `ngay_thanh_toan`)
- `584042`: Lịch hẹn khảo sát / Bảo hành (`customer_name`, `booking_code`, `schedule_time`, `address`)
- `274649`: Cảm ơn quý khách hoàn thành dịch vụ / BH (`customer_name`, `product_name`, `date`, `code`)

#### PROCESS (các bước xử lý)
```
1. Trigger sự kiện từ Backend (NV1 tạo xong HĐ, NV2 gửi BG, NV5 đặt lịch BH, hoặc Cron nhắc nợ)
2. Backend xác thực SĐT khách hàng hợp lệ (chuẩn hóa 09xxx / 84xxx)
3. Backend nạp template_data với đúng các tham số của template_id tương ứng
   - Tham số ngày giờ (schedule_time) phải đúng format "HH:MM DD/MM/YYYY"
4. Gọi ZBS WIFIM API (https://zbs.wifim.vn/api/v1/send) kèm Header X-API-Key
5. Xử lý phản hồi:
   - HTTP 200 + success: true -> Lưu msg_id, ghi log gửi thành công vào Airtable
   - Báo hạn mức quota còn lại cho quản trị viên
   - Nếu lỗi (-1124, -124, 401, hết quota) -> Bắn alert Telegram cho Admin/Sales để xử lý thủ công
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho |
|---|---|---|
| Tin nhắn Zalo OA chăm sóc khách hàng | Zalo Message | Khách hàng (SĐT nhận) |
| Log kết quả gửi (msg_id, trạng thái) | Database Log | Airtable |
| Thông báo quota / lỗi gửi | Telegram Alert | Admin / Quản trị hệ thống |

#### ENTITIES liên quan
- `Khách hàng` (SĐT nhận tin)
- `Hợp đồng` / `Báo giá` / `Phiếu Bảo hành` (Chứng từ phát sinh thông báo)
- `Nhân viên` (Sales hoặc KTV phụ trách)

#### EDGE CASES
| Tình huống | Xử lý |
|---|---|
| SĐT không đăng ký Zalo hoặc chặn OA | Nhận mã lỗi từ Zalo, chuyển sang gửi tin nhắn Telegram cho Sales gọi trực tiếp |
| Access Token Zalo OA hết hạn (-124) | Alert khẩn cấp cho Admin gia hạn tại tab Cấu hình ZBS |
| Tài khoản hết quota tin nhắn (HTTP 400) | Dừng gửi hàng loạt, alert Admin nạp thêm quota |
| Sai format ngày/giờ (-1124) | Format chuẩn hóa tự động `HH:MM DD/MM/YYYY` tại tầng backend service trước khi gửi |

### NV5 — BẢO HÀNH & SỬA CHỮA

#### INPUT (dữ liệu cần thu thập)
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Thông tin KH | Text / Linked | ✅ | Tên + SĐT (tra KH cũ hoặc tạo mới) |
| Tên thiết bị | Text | ✅ | |
| Model / Mã thiết bị | Text | ✅ | |
| Serial Number | Text | ❌ | Quan trọng để tra lịch sử BH |
| Mô tả lỗi / Triệu chứng | Long Text | ✅ | |
| Hình ảnh lỗi | Attachment | ❌ | Bot: KH gửi ảnh; Web UI: upload |
| Nguồn tiếp nhận | Enum | ✅ | Zalo / FB / Call / Trực tiếp / Web |
| Trong bảo hành? | Boolean | Auto-check | Tự tra theo HĐ + ngày mua |

**Dữ liệu tự động tra từ Airtable:**
| Trường | Nguồn |
|---|---|
| Thông tin HĐ mua thiết bị | Airtable [Hợp đồng] |
| Ngày mua + thời hạn BH | Airtable [Hợp đồng] |
| KTV phụ trách | Rule assign theo loại thiết bị |

#### PROCESS (các bước xử lý)
```
1. KH liên hệ (Zalo/FB/Call/Trực tiếp)
2. Bot/Nhân viên thu thập thông tin thiết bị + lỗi
3. Backend tra Airtable [Hợp đồng]:
   - Tìm theo SĐT KH hoặc tên thiết bị/serial
   - Kiểm tra ngày mua + thời hạn BH → còn BH hay không?
4. Sinh mã phiếu BH: BH-YYYYMM-XXX
5. Tạo record Airtable [Phiếu Bảo Hành]: status = "Tiếp nhận"
6. Assign KTV theo rule:
   - Loa/Ampli/Mixer → KTV Âm thanh
   - TV/LED → KTV AV/Display
   - Hệ thống tích hợp → KTV Senior
7. Telegram → KTV: "🔧 Phiếu {mã} - {tên thiết bị} - Lỗi: {mô tả} - Trong BH: Có/Không"

[KTV xử lý]
8. KTV nhận → cập nhật status = "Đang xử lý"
9. Nếu cần linh kiện → status = "Chờ linh kiện" + ghi chú linh kiện cần
10. Hoàn thành → cập nhật status = "Hoàn thành" + ghi chú kết quả
11. Backend gửi Zalo → KH: "✅ Thiết bị {model} đã sửa xong..."
12. Nếu ngoài BH → tạo báo giá sửa chữa (trigger NV2 mini)
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho |
|---|---|---|
| Phiếu BH Airtable | Database row | Hệ thống |
| Thông báo tiếp nhận | Telegram | KTV phụ trách |
| Thông báo hoàn thành | Zalo | KH |
| Báo giá sửa chữa (nếu ngoài BH) | PDF | KH |

#### ENTITIES liên quan
- `Phiếu Bảo Hành` (record chính)
- `Phiếu BH Activity Log` (lịch sử cập nhật trạng thái)
- `Khách hàng`
- `Hợp đồng` (tra lịch sử mua hàng)
- `Nhân viên` (KTV phụ trách)

#### EDGE CASES
| Tình huống | Xử lý |
|---|---|
| KH không có trong hệ thống | Tạo KH mới, ghi chú "KH vãng lai" |
| Không tìm thấy HĐ mua hàng | Hỏi KH có hóa đơn/chứng từ không → xác nhận thủ công |
| Lỗi nghiêm trọng (cháy, chập điện) | Flag URGENT → Telegram CEO + KTV Senior ngay |
| KTV không nhận sau 2h | Telegram nhắc + báo quản lý |

---

### NV6 — ĐÁNH GIÁ TỒN KHO & CẢNH BÁO

#### INPUT (dữ liệu cần thu thập)
**Phiếu Nhập kho:**
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Sản phẩm | Linked → Sản phẩm | ✅ | |
| Số lượng nhập | Number | ✅ | |
| Nhà cung cấp | Text | ✅ | |
| Giá nhập (đơn vị) | Number | ✅ | Để tính giá trị tồn |
| Số hóa đơn NCC | Text | ❌ | |
| Ngày nhập | Date | ✅ | |
| Kho nhập | Text | ✅ | Nếu có nhiều kho |

**Phiếu Xuất kho:**
| Trường | Kiểu | Bắt buộc | Ghi chú |
|---|---|:---:|---|
| Sản phẩm | Linked → Sản phẩm | ✅ | |
| Số lượng xuất | Number | ✅ | |
| Lý do xuất | Enum | ✅ | Bán hàng / Demo / Bảo hành / Hư hỏng |
| Linked HĐ/BG | Linked | ❌ | Nếu xuất theo HĐ/BG cụ thể |
| Ngày xuất | Date | ✅ | |

**Cấu hình ngưỡng tồn tối thiểu (Admin set 1 lần):**
| Trường | Kiểu | Ghi chú |
|---|---|---|
| Sản phẩm | Linked | |
| Tồn tối thiểu (min) | Number | Cảnh báo khi tồn ≤ min |
| Tồn tối ưu (target) | Number | Mức tồn lý tưởng để nhập về |

#### PROCESS (các bước xử lý)
```
[Real-time khi có nhập/xuất]
1. Nhân viên tạo phiếu nhập/xuất (Web UI hoặc Bot)
2. Backend cập nhật Airtable [Tồn kho]: tồn mới = tồn cũ ± SL
3. Tính giá trị tồn = tồn × giá nhập TB (weighted average)
4. So sánh với ngưỡng min:
   - Tồn = 0      → 🔴 alert
   - Tồn ≤ min   → 🟠 alert
   - Tồn > min   → ✅ không alert

[Cron hàng ngày 8h sáng]
5. Query tất cả SP có tồn ≤ min
6. Tổng hợp báo cáo tồn kho (tổng SL, tổng giá trị)
7. Nếu có SP cảnh báo → Telegram Quản lý kho:
   "⚠️ Danh sách SP cần nhập: [danh sách]"

[Tự động khi deal Won ở NV3]
8. Nếu deal Won có SP → Backend tự xuất kho (hoặc gợi ý xuất kho)
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho |
|---|---|---|
| Cập nhật tồn kho realtime | Airtable [Tồn kho] | Hệ thống |
| Cảnh báo tồn thấp/hết | Telegram | Quản lý kho + CEO |
| Báo cáo tồn kho hàng ngày | Telegram | Quản lý kho |
| Dashboard tồn kho | Web UI | Tất cả nội bộ |

#### ENTITIES liên quan
- `Tồn kho` (snapshot tồn hiện tại của từng SP)
- `Giao dịch kho` (mỗi lần nhập/xuất)
- `Sản phẩm & Bảng giá`
- `Ngưỡng tồn` (config per SP)

#### EDGE CASES
| Tình huống | Xử lý |
|---|---|
| Xuất kho khi tồn = 0 | Chặn + cảnh báo, yêu cầu xác nhận override |
| Giá nhập thay đổi | Tính lại weighted average price |
| SP bị loại khỏi danh mục | Chuyển sang "Ngừng kinh doanh", vẫn giữ lịch sử |

---

### NV7 — KPI DASHBOARD & BÁO CÁO CEO

#### INPUT (nguồn dữ liệu)
| Nguồn | Dữ liệu lấy | Cách lấy |
|---|---|---|
| Airtable [Lead/Pipeline] | Số lead mới, deal Won/Lost, giá trị pipeline | Query API |
| Airtable [Báo giá] | Số BG gửi, tỷ lệ BG → HĐ | Query API |
| Airtable [Hợp đồng] | Doanh thu ký, giá trị HĐ theo tháng | Query API |
| Airtable [Phiếu BH] | Số phiếu, thời gian xử lý TB | Query API |
| Airtable [Tồn kho] | Giá trị tồn tổng, SP cần nhập | Query API |
| MISA | Doanh thu sổ sách, chi phí, lợi nhuận | Excel export / API (nếu có) |

#### PROCESS (các bước xử lý)
```
[Cron thứ 2 hàng tuần - 7h sáng: Báo cáo tuần]
1. Query Airtable tất cả bảng theo khoảng tuần trước (T2 → CN)
2. Tính các chỉ số:
   - Doanh thu = Σ giá trị HĐ Won trong tuần
   - Pipeline value = Σ giá trị ước tính các deal đang active
   - Tỷ lệ chuyển đổi = Won / (Won + Lost) × 100%
   - Lead mới = COUNT lead tạo trong tuần
   - Số BG gửi / số BG → HĐ
   - Trung bình thời gian xử lý BH
   - Top Sales theo doanh thu
3. So sánh với tuần trước → tính % thay đổi
4. Format báo cáo text Telegram
5. Gửi Telegram CEO

[Cron ngày 1 hàng tháng - 8h sáng: Báo cáo tháng]
6. Tương tự nhưng theo tháng
7. Bổ sung dữ liệu từ MISA (nếu có): lợi nhuận, chi phí
8. Gửi Telegram CEO + lưu Airtable [Báo cáo]
```

#### OUTPUT (kết quả trả về)
| Output | Dạng | Gửi cho | Tần suất |
|---|---|---|---|
| Báo cáo KPI text | Telegram | CEO | Mỗi thứ 2 |
| Báo cáo tháng | Telegram | CEO + Ban giám đốc | Ngày 1 |
| Dashboard realtime | Web UI | CEO, Sales, Quản lý | Luôn cập nhật |
| KPI cá nhân Sales | Telegram | Từng Sales | Mỗi thứ 2 |

#### ENTITIES liên quan
- Không có entity riêng — tổng hợp từ tất cả các bảng khác
- `Báo cáo` (lưu snapshot báo cáo hàng tuần/tháng để tra lịch sử)

---

## PHẦN 2: MA TRẬN NGHIỆP VỤ → ENTITIES

```
                    │KH│SP│Lead│BG│Chi tiết BG│HĐ│Phiếu BH│Tồn│Giao dịch kho│NV│Báo cáo│
NV1 Hợp đồng        │✅│  │    │  │           │✅│        │   │             │✅│       │
NV2 Báo giá         │✅│✅│    │✅│✅         │  │        │   │             │✅│       │
NV3 Pipeline        │✅│  │✅  │  │           │  │        │   │             │✅│       │
NV5 Bảo hành        │✅│  │    │  │           │✅│✅      │   │             │✅│       │
NV6 Tồn kho         │  │✅│    │  │           │  │        │✅ │✅           │✅│       │
NV7 KPI             │  │  │✅  │✅│           │✅│✅      │✅ │             │✅│✅     │
```

---

## PHẦN 3: THIẾT KẾ AIRTABLE SCHEMA

> Từ ma trận trên, suy ra cần **9 bảng chính** trong Airtable.

---

### Bảng 1: KHÁCH HÀNG (Customers)

**Mục đích:** Lưu thông tin tất cả khách hàng/đối tác. Dùng chung cho NV1, NV2, NV3, NV5.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Mã KH` | Auto Number | KH-0001, KH-0002... |
| `Tên công ty` | Single line text | |
| `Tên người liên hệ` | Single line text | |
| `Số điện thoại` | Phone | Primary identifier |
| `Email` | Email | |
| `Mã số thuế (MST)` | Single line text | Để tra MST.vn |
| `Địa chỉ` | Long text | |
| `Người đại diện pháp luật` | Single line text | Lấy từ MST.vn |
| `Khu vực` | Single select | HCM / Hà Nội / Miền Trung / Khác |
| `Loại KH` | Single select | Công ty / Cá nhân / Đối tác |
| `Ngày tạo` | Created time | Auto |
| `Nhân viên phụ trách` | Linked → Nhân viên | Sales chính |
| `[Linked] Hợp đồng` | Linked ← Hợp đồng | Tự động |
| `[Linked] Báo giá` | Linked ← Báo giá | Tự động |
| `[Linked] Lead` | Linked ← Lead | Tự động |
| `[Linked] Phiếu BH` | Linked ← Phiếu BH | Tự động |
| `Ghi chú` | Long text | |

---

### Bảng 2: SẢN PHẨM & BẢNG GIÁ (Products)

**Mục đích:** Danh mục sản phẩm + giá bán. Dùng cho NV2 (tra giá) và NV6 (tồn kho).

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Mã SP` | Single line text | Mã nội bộ, VD: LOA-JBL-EON615 |
| `Tên SP` | Single line text | Tên đầy đủ |
| `Thương hiệu` | Single select | JBL / Yamaha / Bosch / Samsung / LG / ... |
| `Nhóm sản phẩm` | Single select | Loa / Ampli / Mixer / TV / LED / Micro / Cáp / Khác |
| `Xuất xứ` | Single line text | |
| `Đơn vị tính` | Single select | Cái / Bộ / Mét / Set |
| `Đơn giá bán` | Currency (VNĐ) | Giá bán ra cho KH |
| `Đơn giá nhập TB` | Currency (VNĐ) | Weighted average, dùng cho NV6 |
| `Trạng thái` | Single select | Đang kinh doanh / Ngừng KD / Đặt hàng |
| `Tồn hiện tại` | Number (Rollup) | Tính tự động từ [Giao dịch kho] |
| `Ngưỡng tồn min` | Number | Ngưỡng cảnh báo |
| `Mô tả kỹ thuật` | Long text | |
| `Hình ảnh` | Attachment | |
| `Ngày cập nhật giá` | Last modified time | Auto |
| `[Linked] Chi tiết BG` | Linked ← Chi tiết BG | Tự động |
| `[Linked] Giao dịch kho` | Linked ← Giao dịch kho | Tự động |

---

### Bảng 3: LEAD / PIPELINE

**Mục đích:** Theo dõi toàn bộ hành trình bán hàng từ Lead đến Chốt. NV3 chính.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Mã Lead` | Auto Number | LEAD-0001... |
| `Tên cty / Khách hàng` | Single line text | |
| `Người liên hệ` | Single line text | |
| `SĐT` | Phone | |
| `Email` | Email | |
| `Nguồn lead` | Single select | Web / FB / Zalo / Call / DauThau / Giới thiệu |
| `Nhu cầu / Dự án` | Long text | Mô tả ban đầu |
| `Khu vực` | Single select | |
| `Stage` | Single select | New / Qualified / Đàm phán / Won / Lost |
| `Điểm Lead Score` | Number | 1–10, tự động tính |
| `Giá trị ước tính` | Currency (VNĐ) | |
| `Giá trị thực tế (Won)` | Currency (VNĐ) | Điền khi Won |
| `Ngày tạo` | Created time | Auto |
| `Ngày dự kiến chốt` | Date | |
| `Ngày Won/Lost` | Date | |
| `Lý do Lost` | Long text | Bắt buộc khi Lost |
| `Sales phụ trách` | Linked → Nhân viên | |
| `[Linked] Khách hàng` | Linked → Khách hàng | Khi Qualified → tạo/link KH |
| `[Linked] Báo giá` | Linked ← Báo giá | BG phát sinh từ deal này |
| `[Linked] Hợp đồng` | Linked ← Hợp đồng | HĐ phát sinh từ deal này |
| `Ghi chú` | Long text | |
| `URL DauThau` | URL | Nếu nguồn từ DauThau.info |

---

### Bảng 4: BÁO GIÁ (Quotes)

**Mục đích:** Lưu header của từng báo giá. NV2 chính.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Mã BG` | Single line text | BG-202409-001 (tự sinh) |
| `Khách hàng` | Linked → Khách hàng | |
| `Deal liên quan` | Linked → Lead | Nếu phát sinh từ deal |
| `Ngày tạo` | Created time | Auto |
| `Ngày gửi KH` | Date | |
| `Tên dự án / Công trình` | Single line text | |
| `Tổng tiền (chưa VAT)` | Currency (Rollup) | Tính từ [Chi tiết BG] |
| `Thuế VAT (10%)` | Formula | = Tổng chưa VAT × 10% |
| `Tổng cộng (có VAT)` | Formula | = Tổng chưa VAT + VAT |
| `Có VAT` | Checkbox | Mặc định: check |
| `Trạng thái` | Single select | Nháp / Chờ duyệt / Đã gửi / Chuyển HĐ / Hủy |
| `Link file PDF` | URL | Link Google Drive |
| `Sales phụ trách` | Linked → Nhân viên | |
| `Ghi chú` | Long text | |
| `[Linked] Chi tiết BG` | Linked ← Chi tiết BG | Tự động |
| `[Linked] Hợp đồng` | Linked ← Hợp đồng | Khi chuyển HĐ |

---

### Bảng 5: CHI TIẾT BÁO GIÁ (Quote Line Items)

**Mục đích:** Bảng con của Báo giá — từng dòng sản phẩm. Cần tách riêng để tính toán.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Báo giá` | Linked → Báo giá | Parent |
| `Sản phẩm` | Linked → Sản phẩm | |
| `Tên SP (override)` | Single line text | Nếu SP chưa có trong danh mục |
| `Số lượng` | Number | |
| `Đơn giá` | Currency | Lấy từ SP, có thể override |
| `Thành tiền` | Formula | = SL × Đơn giá |
| `Ghi chú dòng` | Single line text | VD: "Bao gồm cài đặt" |

---

### Bảng 6: HỢP ĐỒNG (Contracts)

**Mục đích:** Lưu thông tin hợp đồng đã tạo. NV1 chính.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Mã HĐ` | Single line text | HĐ-202409-001 (tự sinh) |
| `Khách hàng` | Linked → Khách hàng | |
| `Deal liên quan` | Linked → Lead | |
| `Báo giá liên quan` | Linked → Báo giá | |
| `Loại HĐ` | Single select | Cung cấp TB / Thi công / Bảo trì / Tư vấn |
| `Giá trị HĐ` | Currency | |
| `Ngày ký` | Date | |
| `Thời hạn BH (tháng)` | Number | Tính từ ngày ký → hạn BH |
| `Ngày hết hạn BH` | Formula | = Ngày ký + Thời hạn BH |
| `Trạng thái` | Single select | Chờ ký / Đã ký / Đang thực hiện / Hoàn thành / Hủy |
| `Link file HĐ (Drive)` | URL | |
| `Người ký (KH)` | Single line text | Lấy từ MST.vn |
| `MST KH` | Single line text | |
| `Sales phụ trách` | Linked → Nhân viên | |
| `Ghi chú` | Long text | |
| `[Linked] Phiếu BH` | Linked ← Phiếu BH | Thiết bị trong HĐ bị BH |

---

### Bảng 7: PHIẾU BẢO HÀNH (Warranty Tickets)

**Mục đích:** Quản lý từng yêu cầu bảo hành/sửa chữa. NV5 chính.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Mã phiếu BH` | Single line text | BH-202409-001 (tự sinh) |
| `Khách hàng` | Linked → Khách hàng | |
| `Hợp đồng gốc` | Linked → Hợp đồng | Để kiểm tra còn BH |
| `Tên thiết bị` | Single line text | |
| `Model` | Single line text | |
| `Serial Number` | Single line text | |
| `Mô tả lỗi` | Long text | |
| `Hình ảnh lỗi` | Attachment | |
| `Nguồn tiếp nhận` | Single select | Zalo / FB / Call / Trực tiếp / Web |
| `Trong bảo hành` | Checkbox | Auto-check từ HĐ gốc |
| `Trạng thái` | Single select | Tiếp nhận / Đang xử lý / Chờ linh kiện / Hoàn thành / Hủy |
| `Mức độ` | Single select | Thường / Khẩn / Nghiêm trọng |
| `KTV phụ trách` | Linked → Nhân viên | |
| `Ngày tiếp nhận` | Created time | Auto |
| `Ngày hoàn thành` | Date | |
| `Thời gian xử lý (ngày)` | Formula | = Ngày HT - Ngày tiếp nhận |
| `Kết quả xử lý` | Long text | KTV ghi sau khi xong |
| `Linh kiện thay thế` | Long text | |
| `Phí sửa chữa (ngoài BH)` | Currency | 0 nếu trong BH |
| `Ghi chú` | Long text | |

---

### Bảng 8: GIAO DỊCH KHO (Stock Transactions)

**Mục đích:** Ghi nhận mọi lần nhập/xuất kho. NV6 chính.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Sản phẩm` | Linked → Sản phẩm | |
| `Loại giao dịch` | Single select | Nhập / Xuất |
| `Số lượng` | Number | Luôn dương |
| `Đơn giá nhập` | Currency | Chỉ điền khi Nhập |
| `Lý do xuất` | Single select | Bán hàng / Demo / Bảo hành / Hư hỏng |
| `HĐ / BG liên quan` | Linked → Hợp đồng | Nếu xuất theo HĐ |
| `Nhà cung cấp` | Single line text | Khi nhập |
| `Số hóa đơn NCC` | Single line text | Khi nhập |
| `Ngày giao dịch` | Date | |
| `Người thực hiện` | Linked → Nhân viên | |
| `Ghi chú` | Long text | |

---

### Bảng 9: NHÂN VIÊN / STAFF

**Mục đích:** Danh sách nhân viên. Dùng chung (linked) cho tất cả các bảng.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Tên` | Single line text | |
| `Bộ phận` | Single select | Sales / KTV / Quản lý kho / CEO / Admin |
| `SĐT` | Phone | |
| `Email` | Email | |
| `Telegram User ID` | Number | Để bot gửi đúng người |
| `Zalo ID` | Single line text | |
| `Trạng thái` | Single select | Đang làm việc / Nghỉ |
| `[Linked] Lead` | Linked ← Lead | |
| `[Linked] Báo giá` | Linked ← Báo giá | |
| `[Linked] Phiếu BH` | Linked ← Phiếu BH | |

---

### Bảng 10: BÁO CÁO LỊCH SỬ (Reports Archive)

**Mục đích:** Lưu snapshot báo cáo tuần/tháng để tra lịch sử. NV7.

| Field | Kiểu dữ liệu | Ghi chú |
|---|---|---|
| `Kỳ báo cáo` | Single line text | VD: "Tuần 37/2026" |
| `Loại` | Single select | Tuần / Tháng |
| `Ngày tạo` | Created time | Auto |
| `Doanh thu` | Currency | |
| `Số deal Won` | Number | |
| `Số lead mới` | Number | |
| `Số BG gửi` | Number | |
| `Tỷ lệ chuyển đổi (%)` | Number | |
| `Số phiếu BH` | Number | |
| `Giá trị tồn kho` | Currency | |
| `Nội dung báo cáo (text)` | Long text | Raw text gửi Telegram |
| `Lợi nhuận (từ MISA)` | Currency | Nếu có |

---

## PHẦN 4: SƠ ĐỒ QUAN HỆ GIỮA CÁC BẢNG

```
NHÂN VIÊN ←──────────────────────────────────────────────────┐
    │                                                         │
    │ assign                                                  │
    ▼                                                         │
KHÁCH HÀNG ──→ LEAD/PIPELINE ──→ BÁO GIÁ ──→ HỢP ĐỒNG      │
    │               │                │              │         │
    │               │                ▼              │         │
    │               │          CHI TIẾT BG          │         │
    │               │                │              │         │
    │               │           tra giá             │         │
    │               │                ▼              │         │
    │               │          SẢN PHẨM ←── GIAO DỊCH KHO   │
    │               │                                         │
    ▼               ▼                                         │
PHIẾU BH ←── (tra HĐ để check BH)                           │
    │                                                         │
    └─────────────────────────────────────────────────────────┘
                          NV7: Đọc từ tất cả bảng → BÁO CÁO
```

---

## PHẦN 5: THỨ TỰ TẠO AIRTABLE BASE

> Tạo đúng thứ tự này để tránh lỗi linked record khi setup:

```
1. Nhân viên / Staff
2. Khách hàng
3. Sản phẩm & Bảng giá
4. Lead / Pipeline
5. Báo giá
6. Chi tiết Báo giá
7. Hợp đồng
8. Phiếu Bảo Hành
9. Giao dịch kho
10. Báo cáo lịch sử
```

---

*Phiên bản: 1.0 — 2026-09-14*
*Phân rã: từ FORM_THONG_TIN_CHUYEN_DOI_SO.xlsx*
