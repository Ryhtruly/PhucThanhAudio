# zbswifim — OpenClaw AgentSkill

Gói skill gửi tin Zalo ZBS qua API zbs.wifim.vn (template Zalo đã duyệt).

## Nội dung
- SKILL.md            — quy trình gửi tin + xử lý lỗi
- references/templates.md — danh sách template đã duyệt (bản chụp 2026-09-14)
- scripts/zbs_client.py   — client CLI: templates | send | bulk

## API key KHÔNG nằm trong gói này
Client đọc key từ biến môi trường ZBS_API_KEY, hoặc file tại
$ZBS_KEY_FILE (mặc định /root/.openclaw/secrets/zbs_api_key).
Lấy key ở tab Cấu hình hệ thống của ZBS. Không commit key vào repo.

## Cài đặt
1. Giải nén, copy thư mục `zbswifim/` vào thư mục skills của agent, hoặc:
   openclaw skills install /duong/dan/zbswifim --agent <id>
2. Kiểm tra: openclaw skills info zbswifim
3. Dùng thử: python3 scripts/zbs_client.py templates
