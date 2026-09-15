# ZBS WIFIM — template đã duyệt (bản chụp 2026-09-14)

Luôn lấy lại danh sách sống trước khi gửi:
`python3 {baseDir}/scripts/zbs_client.py templates`

## Theo nhóm nghiệp vụ

- Thanh toán / nhắc nợ: `584045` (bản sao), `574090` (Mẫu yêu cầu thanh toán), `247516` (ĐỀ NGHỊ THANH TOÁN)
- Hợp đồng / khởi động dự án: `584044` (HỢP ĐỒNG MẪU), `574089` (bản sao), `248159` (THÔNG BÁO KHỞI ĐỘNG DỰ ÁN), `247512` (KHỞI ĐỘNG DỰ ÁN)
- Xác nhận lịch hẹn: `584042` (bản sao), `577423`, `474144`
- Xác nhận đơn hàng: `422511`
- Cảm ơn quý khách: `274649`, `274648`, `273126`, `271872`
- Marketing / quan tâm WIFIM: `438688`, `435384`

## Params từng template

- `584045` / `574090` — price, transfer_amount, bank_transfer_note, product_name, ma_hop_dong, ten_khach_hang, ngay_thanh_toan
- `247516` — customer_name, service, date, code, customer_id, money, date_1, time
- `584044` / `574089` — customer_name, date, order_code, money, service
- `248159` — customer_name, customer_id, phone, order_code, date, money, service
- `247512` — customer_name, date, customer_id, phone, order_code, money
- `584042` / `577423` — customer_name, booking_code, schedule_time, address
- `474144` — customer_name, booking_code, schedule_time
- `422511` — name, price, code
- `274649` — customer_name, product_name, date, code
- `274648` / `273126` / `271872` — customer_name, date, code
- `438688` — ten_khach_hang, ma_khach_hang, ngay_dang_ky
- `435384` — product_name, customer_name, date, code

## Ghi chú

- Nhiều template có bản `(bản sao)` trùng params với bản gốc — cố định một `template_id` cho mỗi nghiệp vụ để tránh gửi nhầm.
- Tên param không thống nhất (`customer_name` / `ten_khach_hang` / `name`); mỗi template cần mapping riêng.
- `247516` có cả `date` và `date_1` — dễ map sai.
- `schedule_time` (param trong `template_data`) cần `HH:MM DD/MM/YYYY`; khác field `scheduled_time` cấp API (`HH:MM DD/MM`).
