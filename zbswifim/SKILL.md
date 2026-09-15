---
name: "zbswifim"
description: "zbs.wifim.vn / Zalo ZBS: gửi tin theo template qua /v1/send, gửi nhóm /v1/send-bulk, xử lý lỗi -1124/-124/401/quota."
---

# ZBS WIFIM — gửi tin Zalo ZBS

Gửi tin Zalo ZBS (tin mẫu đã được Zalo duyệt) qua API `https://zbs.wifim.vn/api`. Mọi request dùng header `X-API-Key`, body JSON.

## Chuẩn bị

- API key: mặc định đọc từ `/root/.openclaw/secrets/zbs_api_key` (quyền 600) hoặc biến môi trường `ZBS_API_KEY`.
- Kiểm tra key đã có: `test -s /root/.openclaw/secrets/zbs_api_key && echo ok`.
- Nếu thiếu key: xin qua kênh bảo mật (masked entry). Không nhận key dán vào chat; nếu key đã lộ trong chat, nhắc người dùng tạo key mới ở tab Cấu hình hệ thống của ZBS.
- Client: `{baseDir}/scripts/zbs_client.py`.

## Quy trình gửi một tin

1. Chốt đầu vào trước khi gọi API: số điện thoại (`0xxx`, `84xxx`, `+84xxx`) hoặc `group_id`, cùng `template_id`, và **người dùng đã đồng ý gửi ra ngoài** (gửi tin Zalo là hành động bên ngoài). Xong khi: ba thông tin trên có đủ.
2. Lấy danh sách template sống: `python3 {baseDir}/scripts/zbs_client.py templates`. Chọn đúng `template_id` — có nhiều bản `(bản sao)` trùng tham số với bản gốc. Xong khi: biết chính xác tên các `params` của template sẽ dùng.
3. Dựng `template_data` với **đúng tên param** của template đó (tên không thống nhất giữa các mẫu: `customer_name` / `ten_khach_hang` / `name`, `code` / `order_code` / `ma_hop_dong`).
   - Param ngày/giờ (ví dụ `schedule_time`) phải ghi **`HH:MM DD/MM/YYYY`** — đủ cả năm. Ghi thiếu năm (`HH:MM DD/MM`) bị trả `-1124`.
   - Giữ chuỗi trong giới hạn của Zalo; chuỗi quá dài bị `-1121`.
   Xong khi: mọi param của template đều có giá trị đúng định dạng.
4. Gửi:
   ```
   python3 {baseDir}/scripts/zbs_client.py send --phone 09xxxxxxxx --template <id> --data '{"param":"value"}'
   ```
   Thêm `--scheduled "HH:MM DD/MM"` nếu muốn hẹn giờ (định dạng riêng của field API này, khác param trong `template_data`). Xong khi: HTTP 200 và `success: true`.
5. Báo lại cho người dùng `msg_id` và phần "còn N tin nhắn" trong `message`; đây là cách duy nhất biết quota còn lại.

## Gửi theo nhóm

- `python3 {baseDir}/scripts/zbs_client.py bulk --group <id> --template <id> --data '{...}'`.
- Docs chưa mô tả `GET /v1/groups`: lấy `group_id` từ trang quản lý ZBS.
- Chưa có tài liệu rate limit/idempotency: gửi tuần tự theo nhóm, không lặp lại mù khi gặp HTTP 400 (đó là hết quota, không phải lỗi tạm thời).

## Xử lý lỗi

- `401` / `{"message":"Invalid API Key"}` → key sai hoặc thiếu.
- `-1124` → sai định dạng param (thường là ngày/giờ thiếu năm, hoặc tiền tệ sai mẫu).
- `-1121` → chuỗi vượt độ dài cho phép.
- `-124` → access token Zalo OA hết hạn; phải gia hạn ở trang Cấu hình ZBS.
- HTTP `400` kèm "hết hạn mức Quota" → tài khoản hết tin, cần liên hệ Admin.

## Tham chiếu

- Danh sách 17 template và nhóm nghiệp vụ (bản chụp 2026-09-14, luôn kiểm tra lại bằng lệnh `templates`): `{baseDir}/references/templates.md`.
