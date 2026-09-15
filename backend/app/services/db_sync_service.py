import json
import datetime
from sqlalchemy.orm import Session
from app.core.database import engine, Base, SessionLocal
from app.models.db_models import (
    Staff, Customer, Product, Lead, Quote, QuoteItem,
    Contract, WarrantyTicket, InventoryTransaction, KPIMonthlyReport, SolutionPackage
)
from app.services.airtable_service import airtable_client

# Cấu hình danh mục gói giải pháp chuẩn chuyển đổi số lưu vào Database
INITIAL_SOLUTION_PACKAGES = [
    {
        "id": "karaoke_vip",
        "name": "Karaoke VIP & Lounge",
        "badge": "Âm thanh giải trí đỉnh cao",
        "description": "Dành cho chuỗi kinh doanh Karaoke chuyên nghiệp, biệt thự gia đình cao cấp và Acoustic Lounge.",
        "services": [
            {
                "id": "kr_01",
                "name": "Dàn Karaoke Kinh Doanh Chuẩn VIP (Phòng 25m² - 45m²)",
                "scaleLabel": "Số lượng phòng & Diện tích mỗi phòng",
                "scalePlaceholder": "Ví dụ: 4 phòng VIP 35m², 1 phòng Super VIP 55m²",
                "scaleHint": "Giúp KTV tính toán công suất loa Full, Subwoofer và số kênh công suất phù hợp",
                "defaultBudget": 180000000
            },
            {
                "id": "kr_02",
                "name": "Karaoke Gia Đình Cao Cấp (Biệt thự / Penthouse)",
                "scaleLabel": "Diện tích phòng giải trí gia đình (m²)",
                "scalePlaceholder": "Ví dụ: Phòng giải trí riêng 40m², tiêu âm cơ bản",
                "scaleHint": "Ưu tiên thiết bị tinh tế, chất âm ấm và micro bắt giọng siêu nhạy",
                "defaultBudget": 120000000
            },
            {
                "id": "kr_03",
                "name": "Acoustic Lounge / Cafe Hát Với Nhau",
                "scaleLabel": "Không gian quán & Sức chứa khách",
                "scalePlaceholder": "Ví dụ: Không gian 150m², sân khấu mini 15m², 80 khách",
                "scaleHint": "Cần mixer kỹ thuật số và loa kiểm âm monitor cho ca sĩ",
                "defaultBudget": 95000000
            }
        ]
    },
    {
        "id": "hoi_truong",
        "name": "Hội Trường & Nhà Thi Đấu",
        "badge": "Phủ âm thanh đồng đều & rõ tiếng",
        "description": "Hệ thống Line Array và micro hội nghị cho sảnh tiệc cưới, UBND, trường đại học và tập đoàn.",
        "services": [
            {
                "id": "ht_01",
                "name": "Dàn Line Array Tiệc Cưới & Trung Tâm Hội Nghị",
                "scaleLabel": "Sức chứa sảnh tiệc & Chiều dài sảnh",
                "scalePlaceholder": "Ví dụ: Sảnh 800 khách, chiều dài 40m, trần cao 6m",
                "scaleHint": "Thiết kế mảng loa Line Array treo định hướng, chống dội âm",
                "defaultBudget": 350000000
            },
            {
                "id": "ht_02",
                "name": "Âm Thanh Hội Trường Đa Năng Cơ Quan / Trường Học",
                "scaleLabel": "Quy mô hội trường & Số micro đại biểu",
                "scalePlaceholder": "Ví dụ: Hội trường 400 chỗ ngồi, 12 micro cổ ngỗng bàn chủ tọa",
                "scaleHint": "Tập trung độ rõ của giọng nói và tích hợp kết nối hội nghị truyền hình",
                "defaultBudget": 220000000
            },
            {
                "id": "ht_03",
                "name": "Hệ Thống Nhà Thi Đấu / Trung Tâm Văn Hóa",
                "scaleLabel": "Diện tích mặt sàn & Khán đài",
                "scalePlaceholder": "Ví dụ: Sàn thi đấu 1.200m², khán đài 1.500 chỗ",
                "scaleHint": "Cần dòng loa chịu lực, phủ rộng và xử lý chống vang vọng lớn",
                "defaultBudget": 480000000
            }
        ]
    },
    {
        "id": "bar_club",
        "name": "Bar Club & Sân Khấu Biểu Diễn",
        "badge": "Áp lực âm thanh khủng & Uy lực",
        "description": "Giải pháp cho Beer Club, Vũ trường, DJ Bar và hệ thống âm thanh lưu diễn cho công ty sự kiện.",
        "services": [
            {
                "id": "bc_01",
                "name": "Vũ Trường & DJ Nightclub Công Suất Lớn",
                "scaleLabel": "Diện tích sàn khiêu vũ & Chiều cao trần",
                "scalePlaceholder": "Ví dụ: Mặt sàn 300m², áp lực âm thanh > 125dB SPL",
                "scaleHint": "Sử dụng Sub kép 18-inch hoặc 21-inch uy lực cực mạnh",
                "defaultBudget": 650000000
            },
            {
                "id": "bc_02",
                "name": "Hệ Thống Tour Sound Sự Kiện / Lễ Hội Ngoài Trời",
                "scaleLabel": "Quy mô sự kiện ngoài trời (người tham dự)",
                "scalePlaceholder": "Ví dụ: Sân vận động 3.000 - 5.000 khán giả",
                "scaleHint": "Cấu hình dàn Line Array công suất lớn kèm tủ rack amp lưu động",
                "defaultBudget": 850000000
            },
            {
                "id": "bc_03",
                "name": "Beer Garden & Pub Nhạc Sống Ngoài Trời",
                "scaleLabel": "Diện tích sân vườn & Khu vực có mái che",
                "scalePlaceholder": "Ví dụ: 250m² ngoài trời có mái bạt di động",
                "scaleHint": "Ưu tiên thiết bị chống ẩm chịu thời tiết và phủ âm đều góc ngồi",
                "defaultBudget": 160000000
            }
        ]
    },
    {
        "id": "pa_cafe",
        "name": "Cafe Acoustic & PA Shop",
        "badge": "Nhạc nền du dương & Thông báo",
        "description": "Âm thanh nhạc nền (BGM) cho chuỗi siêu thị, nhà hàng, spa và hệ thống truyền thanh công cộng.",
        "services": [
            {
                "id": "pa_01",
                "name": "Hệ Thống Nhạc Nền Chuỗi Cà Phê / Nhà Hàng Cao Cấp",
                "scaleLabel": "Số lượng chi nhánh / Số tầng & Diện tích mỗi tầng",
                "scalePlaceholder": "Ví dụ: Chuỗi 3 cửa hàng, mỗi điểm 120m² gồm tầng trệt + lầu",
                "scaleHint": "Hệ thống loa hộp hoặc loa âm trần thẩm mỹ cao, phân vùng độc lập",
                "defaultBudget": 65000000
            },
            {
                "id": "pa_02",
                "name": "Hệ Thống Âm Thanh Thông Báo Tòa Nhà & Nhà Xưởng (PA)",
                "scaleLabel": "Số phân vùng (Zones) & Số loa dự kiến",
                "scalePlaceholder": "Ví dụ: Nhà xưởng 2.000m² chia làm 4 khu vực thông báo",
                "scaleHint": "Tích hợp micro chọn vùng thông báo khẩn cấp và báo cháy tự động",
                "defaultBudget": 110000000
            }
        ]
    }
]

def init_and_sync_db():
    """Khởi tạo toàn bộ bảng trong SQLite và đồng bộ dữ liệu chuẩn từ Airtable."""
    Base.metadata.create_all(bind=engine)
    db: Session = SessionLocal()

    try:
        # 1. Đồng bộ Nhân viên (Staff)
        staff_recs = airtable_client.list_records("Nhan vien")
        for r in staff_recs:
            f = r.get("fields", {})
            existing = db.query(Staff).filter(Staff.id == r["id"]).first()
            if not existing:
                db.add(Staff(
                    id=r["id"],
                    name=f.get("Ten", "Nhân viên"),
                    role=f.get("Bo phan", "Sales"),
                    email=f.get("Email", ""),
                    phone=f.get("So dien thoai", ""),
                    telegram_id=f.get("Telegram ID", ""),
                    zalo_id=f.get("Zalo ID", ""),
                    status=f.get("Trang thai", "Dang lam viec")
                ))

        # 2. Đồng bộ Khách hàng (Customers)
        cust_recs = airtable_client.list_records("Khach hang")
        for r in cust_recs:
            f = r.get("fields", {})
            existing = db.query(Customer).filter(Customer.id == r["id"]).first()
            staff_link = f.get("Nhan vien phu trach")
            staff_id = staff_link[0] if staff_link and isinstance(staff_link, list) else None
            if not existing:
                db.add(Customer(
                    id=r["id"],
                    company_name=f.get("Ten cong ty", f.get("Ten nguoi lien he", "Khách hàng")),
                    contact_name=f.get("Ten nguoi lien he", ""),
                    phone=f.get("So dien thoai", ""),
                    email=f.get("Email", ""),
                    tax_id=f.get("Ma so thue MST", ""),
                    address=f.get("Dia chi", ""),
                    representative=f.get("Nguoi dai dien", ""),
                    customer_type=f.get("Loai KH", "Cong ty"),
                    region=f.get("Khu vuc", "TP.HCM"),
                    notes=f.get("Ghi chu", ""),
                    assigned_staff_id=staff_id
                ))

        # 3. Đồng bộ Sản phẩm & Giá (Products)
        prod_recs = airtable_client.list_records("San pham & Bang gia")
        # Khởi tạo mức tồn ban đầu thực tế từ phiếu giao dịch kho
        initial_stock_map = {
            "SP-AMP-003": 8,
            "SP-SUB-002": 4,
            "SP-MIC-005": 12,
            "SP-LNA-001": 6,
            "SP-DSP-006": 5,
            "SP-MIX-004": 2
        }
        for r in prod_recs:
            f = r.get("fields", {})
            sku = f.get("Ma SP", r["id"])
            existing = db.query(Product).filter(Product.id == r["id"]).first()
            stock_val = f.get("Ton kho") or initial_stock_map.get(sku, 5)
            min_val = int(f.get("Nguong ton min", 2) or 2)
            if not existing:
                db.add(Product(
                    id=r["id"],
                    sku=sku,
                    name=f.get("Ten SP", "Thiết bị âm thanh"),
                    brand=f.get("Thuong hieu", "Chính hãng"),
                    category=f.get("Nhom san pham", "Loa"),
                    unit=f.get("Don vi tinh", "Cai"),
                    import_price=int(f.get("Don gia nhap TB", 10000000) or 10000000),
                    sale_price=int(f.get("Don gia ban", 15000000) or 15000000),
                    stock_quantity=stock_val,
                    min_threshold=min_val,
                    specs=f.get("Mo ta ky thuat", ""),
                    status=f.get("Trang thai", "Dang kinh doanh")
                ))

        # 4. Đồng bộ Báo cáo lịch sử (KPIMonthlyReport)
        report_recs = airtable_client.list_records("Bao cao")
        order_map = {"Tháng 4": 4, "Tháng 5": 5, "Tháng 6": 6, "Tháng 7": 7, "Tháng 8": 8, "Tháng 9": 9}
        for r in report_recs:
            f = r.get("fields", {})
            period = f.get("Ky bao cao", "")
            existing = db.query(KPIMonthlyReport).filter(KPIMonthlyReport.period_name == period).first()
            if not existing:
                db.add(KPIMonthlyReport(
                    period_name=period,
                    period_order=order_map.get(period, 99),
                    report_type=f.get("Loai", "Thang"),
                    revenue=int(f.get("Doanh thu", 0) or 0),
                    target_revenue=300000000,
                    won_deals_count=int(f.get("So deal Won", 0) or 0),
                    new_leads_count=int(f.get("So lead moi", 0) or 0),
                    quotes_sent_count=int(f.get("So BG gui", 0) or 0),
                    conversion_rate=float(f.get("Ty le chuyen doi", 0) or 0.0),
                    content_summary=f.get("Noi dung bao cao", "")
                ))

        # 5. Đồng bộ Lead & Pipeline
        lead_recs = airtable_client.list_records("Lead & Pipeline")
        for r in lead_recs:
            f = r.get("fields", {})
            existing = db.query(Lead).filter(Lead.id == r["id"]).first()
            cust_link = f.get("Khach hang")
            cust_id = cust_link[0] if cust_link and isinstance(cust_link, list) else None
            staff_link = f.get("Sales phu trach")
            staff_id = staff_link[0] if staff_link and isinstance(staff_link, list) else None
            if not existing:
                db.add(Lead(
                    id=r["id"],
                    customer_id=cust_id,
                    company_name=f.get("Ten cty Khach", "Khách hàng"),
                    contact_name=f.get("Nguoi lien he", ""),
                    phone=f.get("So dien thoai", ""),
                    email=f.get("Email", ""),
                    source=f.get("Nguon lead", "Web form"),
                    demand=f.get("Nhu cau Du an", ""),
                    region=f.get("Khu vuc", "TP.HCM"),
                    stage=f.get("Stage", "New"),
                    lead_score=int(f.get("Lead Score", 70) or 70),
                    estimated_value=int(f.get("Gia tri uoc tinh", 0) or 0),
                    actual_value=int(f.get("Gia tri thuc te", 0) or 0),
                    assigned_staff_id=staff_id,
                    notes=f.get("Ghi chu", "")
                ))

        # 6. Đồng bộ Báo giá (Quotes) & Chi tiết
        quote_recs = airtable_client.list_records("Bao gia")
        for r in quote_recs:
            f = r.get("fields", {})
            qid = f.get("Ma BG", r["id"])
            existing = db.query(Quote).filter(Quote.id == r["id"]).first()
            cust_link = f.get("Khach hang")
            cust_id = cust_link[0] if cust_link and isinstance(cust_link, list) else None
            lead_link = f.get("Deal lien quan")
            lead_id = lead_link[0] if lead_link and isinstance(lead_link, list) else None
            staff_link = f.get("Sales phu trach")
            staff_id = staff_link[0] if staff_link and isinstance(staff_link, list) else None

            # Tính toán subtotal từ chuỗi ghi chú hoặc chi tiết
            notes_str = f.get("Ghi chu", "")
            grand_total = 0
            if "Tổng cộng:" in notes_str:
                try:
                    part = notes_str.split("Tổng cộng:")[1].split("đ")[0].replace(",", "").replace(".", "").strip()
                    grand_total = int(part)
                except Exception:
                    grand_total = 60000000
            else:
                grand_total = 60000000

            subtotal = int(grand_total / 1.1)

            if not existing:
                q_obj = Quote(
                    id=r["id"],
                    quote_code=qid,
                    customer_id=cust_id,
                    lead_id=lead_id,
                    project_name=f.get("Ten du an", "Trang bị hệ thống âm thanh"),
                    subtotal=subtotal,
                    vat_amount=grand_total - subtotal,
                    grand_total=grand_total,
                    include_vat=f.get("Co VAT", True),
                    status=f.get("Trang thai", "Da gui"),
                    valid_until=f.get("Han hieu luc", ""),
                    notes=notes_str,
                    assigned_staff_id=staff_id
                )
                db.add(q_obj)

        # 7. Đồng bộ Hợp đồng (Contracts)
        contract_recs = airtable_client.list_records("Hop dong")
        for r in contract_recs:
            f = r.get("fields", {})
            cid = f.get("Ma HD", r["id"])
            existing = db.query(Contract).filter(Contract.id == r["id"]).first()
            cust_link = f.get("Khach hang")
            cust_id = cust_link[0] if cust_link and isinstance(cust_link, list) else None
            staff_link = f.get("Sales phu trach")
            staff_id = staff_link[0] if staff_link and isinstance(staff_link, list) else None
            val = int(f.get("Gia tri HD", 0) or 0)
            if not existing:
                db.add(Contract(
                    id=r["id"],
                    contract_code=cid,
                    customer_id=cust_id,
                    contract_type=f.get("Loai HD", "Cung cap thiet bi"),
                    company_name=f.get("Nguoi ky KH", "Khách hàng"),
                    tax_id=f.get("MST KH", ""),
                    total_amount=val,
                    vat_amount=int(val * 0.1),
                    grand_total=int(val * 1.1),
                    warranty_months=int(f.get("Thoi han BH thang", 24) or 24),
                    status=f.get("Trang thai", "Cho ky"),
                    assigned_staff_id=staff_id
                ))

        # 8. Đồng bộ Phiếu bảo hành (WarrantyTicket)
        war_recs = airtable_client.list_records("Phieu Bao hanh")
        for r in war_recs:
            f = r.get("fields", {})
            wid = f.get("Ma phieu BH", r["id"])
            existing = db.query(WarrantyTicket).filter(WarrantyTicket.id == r["id"]).first()
            cust_link = f.get("Khach hang")
            cust_id = cust_link[0] if cust_link and isinstance(cust_link, list) else None
            ktv_link = f.get("KTV phu trach")
            ktv_id = ktv_link[0] if ktv_link and isinstance(ktv_link, list) else None
            if not existing:
                db.add(WarrantyTicket(
                    id=r["id"],
                    ticket_code=wid,
                    customer_id=cust_id,
                    device_name=f.get("Ten thiet bi", "Thiết bị"),
                    model=f.get("Model", ""),
                    serial_number=f.get("Serial Number", ""),
                    error_desc=f.get("Mo ta loi", ""),
                    customer_name=f.get("Ten KH", "Khách hàng"),
                    phone=f.get("So dien thoai", ""),
                    urgency=f.get("Muc do", "Thuong"),
                    status=f.get("Trang thai", "Dang xu ly"),
                    source=f.get("Nguon tiep nhan", "Zalo"),
                    under_warranty=f.get("Trong bao hanh", True),
                    assigned_ktv_id=ktv_id
                ))

        # 9. Khởi tạo Gói giải pháp Intake (SolutionPackage) trong Database
        for pkg in INITIAL_SOLUTION_PACKAGES:
            existing_pkg = db.query(SolutionPackage).filter(SolutionPackage.id == pkg["id"]).first()
            if not existing_pkg:
                db.add(SolutionPackage(
                    id=pkg["id"],
                    name=pkg["name"],
                    badge=pkg.get("badge", ""),
                    description=pkg.get("description", ""),
                    services_json=json.dumps(pkg.get("services", []), ensure_ascii=False)
                ))

        # 10. Ghi nhận giao dịch kho ban đầu vào `inventory_transactions`
        existing_tx = db.query(InventoryTransaction).count()
        if existing_tx == 0:
            products_in_db = db.query(Product).all()
            for p in products_in_db:
                db.add(InventoryTransaction(
                    id=f"tx_init_{p.sku}",
                    tx_code=f"GD-NHAP-{p.sku}",
                    product_id=p.id,
                    product_sku=p.sku,
                    product_name=p.name,
                    tx_type="nhap",
                    quantity=p.stock_quantity,
                    unit_price=p.import_price,
                    reason="Nhập kho ban đầu từ nhà phân phối chính hãng",
                    staff_name="Thủ kho Nguyễn Văn Nam",
                    notes="Kiểm đếm và nhập hệ thống chuẩn",
                    created_at=datetime.datetime.utcnow()
                ))

        db.commit()
        print("[Database] Sync completed successfully!")
    except Exception as e:
        db.rollback()
        print(f"[Database Error] Sync failed: {str(e).encode('ascii', 'ignore').decode()}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    init_and_sync_db()
