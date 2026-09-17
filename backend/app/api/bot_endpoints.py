from fastapi import APIRouter, HTTPException, Query, Path
from typing import Dict, Any, List, Optional
from pydantic import BaseModel
from datetime import datetime

from app.services.contract_service import create_contract
from app.services.quote_service import create_quote
from app.services.operations_services import (
    create_lead, create_warranty_ticket, check_inventory_alerts, get_kpi_summary
)
from app.services.airtable_service import airtable_client
from app.services.zbs_service import zbs_client
from app.core.database import SessionLocal
from app.models.db_models import Contract, Lead, Quote, WarrantyTicket, Product, KPIMonthlyReport

bot_router = APIRouter(tags=["Bot Endpoints (NV1 - NV7)"])

# =========================================================================
# SCHEMAS FOR BOT CALLS
# =========================================================================
class BotContractRequest(BaseModel):
    mst: str
    phone: str
    company_name: Optional[str] = ""
    contract_type: Optional[str] = "Cung cấp & Lắp đặt hệ thống âm thanh"
    total_amount: Optional[int] = 0
    items: Optional[List[Dict[str, Any]]] = None
    special_terms: Optional[str] = ""
    sales_rep: Optional[str] = "Nguyễn Văn Tuấn"
    send_zbs: Optional[bool] = True

class BotQuoteRequest(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    email: Optional[str] = ""
    project_name: Optional[str] = "Gói giải pháp âm thanh chuyên nghiệp"
    items: List[Dict[str, Any]] # [{"name": "...", "qty": 2, "price": 45000000, "brand": "SR Italy"}]
    include_vat: Optional[bool] = True
    sales_rep: Optional[str] = "Nguyễn Văn Tuấn"
    send_zbs: Optional[bool] = True

class BotDealUpdateRequest(BaseModel):
    stage: str # New, Qualified, Dam phan, Won, Lost
    notes: Optional[str] = ""

class BotWarrantyStartRequest(BaseModel):
    device_name: str
    model: Optional[str] = ""
    serial: Optional[str] = ""
    error_desc: str
    phone: str
    customer_name: str
    urgency: Optional[str] = "Thuong"
    ktv_name: Optional[str] = "Trần Minh Đức"
    send_zbs: Optional[bool] = True

class BotZBSSendRequest(BaseModel):
    phone: str
    template_id: str
    template_data: Dict[str, Any]

class BotIntakeRequest(BaseModel):
    customer_name: str
    phone: str
    package_id: Optional[str] = "karaoke_vip"
    package_name: Optional[str] = "Karaoke VIP & Lounge"
    solution_type: Optional[str] = "Phòng Karaoke Kinh Doanh Cao Cấp"
    contact_name: Optional[str] = ""
    email: Optional[str] = ""
    tax_id: Optional[str] = ""
    address: Optional[str] = ""
    scale_info: Optional[str] = ""
    preferred_brand: Optional[str] = "Chính hãng (SR Italy, LSS, Verity Audio)"
    estimated_budget: Optional[int] = 0
    notes: Optional[str] = ""
    source: Optional[str] = "AI Bot Intake"
    send_zbs: Optional[bool] = False

class BotProductAddRequest(BaseModel):
    name: str
    sale_price: int
    brand: Optional[str] = "Chính hãng"
    category: Optional[str] = "Loa"
    unit: Optional[str] = "Cái"
    stock_quantity: Optional[int] = 5
    import_price: Optional[int] = 0
    specs: Optional[str] = ""




# =========================================================================
# NV1: TẠO HỢP ĐỒNG TỰ ĐỘNG 1-CLICK (POST /api/nv1/contract)
# =========================================================================
@bot_router.post("/nv1/contract")
def bot_nv1_create_contract(req: BotContractRequest):
    """Bot gọi để tạo hợp đồng theo MST, sinh file Word, lưu Airtable/SQLite và trả blocks[] cho chat."""
    res = create_contract(
        mst=req.mst,
        phone=req.phone,
        contract_type=req.contract_type or "Cung cấp thiết bị",
        items=req.items,
        total_amount=req.total_amount or 0,
        special_terms=req.special_terms or "",
        sales_rep=req.sales_rep or "Nguyễn Văn Tuấn",
        send_zbs=req.send_zbs if req.send_zbs is not None else True,
        company_name=req.company_name or None
    )
    if not res.get("success"):
        return {
            "action": "ERROR",
            "blocks": [f"❌ Không thể tạo hợp đồng cho MST {req.mst}: {res.get('error', 'Lỗi không xác định')}"],
            "data": res
        }

    cid = res.get("contract_id")
    cname = res.get("company_name")
    total = res.get("grand_total", 0)
    words = res.get("grand_total_words", "")
    download_url = f"/api/v1/contracts/{cid}/{cid}.docx"

    blocks = [
        f"✅ **Đã tạo Hợp Đồng thành công!**",
        f"• **Mã HĐ:** `{cid}`",
        f"• **Bên mua:** {cname} (MST: `{req.mst}`)",
        f"• **Tổng giá trị (kèm VAT):** `{total:,.0f} đ`",
        f"• **Bằng chữ:** *{words}*",
        f"• **Tải file Word .docx:** [Tải Hợp Đồng]({download_url})",
        f"• **Trạng thái:** Chờ ký duyệt | ZBS thông báo: {'Đã gửi' if req.send_zbs else 'Tắt'}"
    ]

    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": res
    }

# =========================================================================
# NV2: BÁO GIÁ TỰ ĐỘNG ISO (POST /api/nv2/quote)
# =========================================================================
@bot_router.post("/nv2/quote")
def bot_nv2_create_quote(req: BotQuoteRequest):
    """Bot gọi để tạo báo giá ISO thiết bị âm thanh, sinh file Word và trả blocks[]."""
    res = create_quote(
        company_name=req.company_name,
        contact_name=req.contact_name,
        phone=req.phone,
        email=req.email or "",
        project_name=req.project_name or "Trang bị hệ thống âm thanh",
        items=req.items,
        include_vat=req.include_vat if req.include_vat is not None else True,
        sales_rep=req.sales_rep or "Nguyễn Văn Tuấn",
        send_zbs=req.send_zbs if req.send_zbs is not None else True
    )
    if not res.get("success"):
        return {
            "action": "ERROR",
            "blocks": [f"❌ Không thể tạo báo giá: {res.get('error', 'Lỗi không xác định')}"],
            "data": res
        }

    qid = res.get("quote_id")
    grand_total = res.get("grand_total", 0)
    download_url = f"/api/v1/quotes/{qid}/{qid}.docx"

    blocks = [
        f"📄 **Đã xuất Báo Giá ISO thành công!**",
        f"• **Mã Báo Giá:** `{qid}`",
        f"• **Dự án:** {req.project_name}",
        f"• **Khách hàng:** {req.company_name} ({req.contact_name} - {req.phone})",
        f"• **Tổng cộng:** `{grand_total:,.0f} đ`",
        f"• **Tải file Word .docx:** [Tải Báo Giá]({download_url})",
        f"• **Thông báo ZBS:** {'Đã kích hoạt' if req.send_zbs else 'Tắt'}"
    ]

    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": res
    }

# =========================================================================
# NV3: QUÉT LEAD & PIPELINE (POST /api/nv3/morning_scan & PUT /api/nv3/deal/{id})
# =========================================================================
@bot_router.post("/nv3/morning_scan")
def bot_nv3_morning_scan():
    """Bot gọi cron buổi sáng để quét các lead mới cần liên hệ và tóm tắt Pipeline."""
    db = SessionLocal()
    try:
        new_leads = db.query(Lead).filter(Lead.stage.in_(["New", "Qualified"])).all()
        total_leads = db.query(Lead).count()
        won_deals = db.query(Lead).filter(Lead.stage == "Won").count()
        
        blocks = [
            f"🌅 **Báo cáo Pipeline Sáng Nay — Phúc Thanh Audio**",
            f"• **Tổng số cơ hội:** {total_leads} khách hàng",
            f"• **Deal đã chốt (Won):** {won_deals} deal",
            f"• **Cần xử lý gấp:** {len(new_leads)} lead mới trong hôm nay"
        ]

        if new_leads:
            blocks.append("\n**Danh sách Lead ưu tiên:**")
            for idx, l in enumerate(new_leads[:5], 1):
                blocks.append(f"{idx}. **{l.company_name}** ({l.contact_name or 'Chưa tên'} - `{l.phone}`) — Dự toán: `{(l.estimated_value or 0):,.0f} đ` [Điểm: {l.lead_score}]")
        else:
            blocks.append("✅ Không có lead nào tồn đọng chưa xử lý.")

        return {
            "action": "ANSWER",
            "blocks": blocks,
            "data": {
                "pending_count": len(new_leads),
                "total_leads": total_leads,
                "won_deals": won_deals,
                "leads": [{"id": l.id, "name": l.company_name, "phone": l.phone, "stage": l.stage} for l in new_leads]
            }
        }
    finally:
        db.close()

@bot_router.put("/nv3/deal/{deal_id}")
def bot_nv3_update_deal(deal_id: str, req: BotDealUpdateRequest):
    """Bot gọi khi Sales chat đổi trạng thái deal (ví dụ: 'chuyển deal FPT sang Won')."""
    res = airtable_client.update_record("Lead & Pipeline", deal_id, {"Stage": req.stage})
    
    # Sync SQLite
    db = SessionLocal()
    try:
        ld = db.query(Lead).filter((Lead.id == deal_id) | (Lead.phone == deal_id)).first()
        if ld:
            ld.stage = req.stage
            db.commit()
    finally:
        db.close()

    stage_names = {
        "New": "Lead Mới",
        "Qualified": "Khảo Sát & Demo",
        "Dam phan": "Đàm Phán & Báo Giá",
        "Won": "Ký Hợp Đồng Thành Công (Won) 🎉",
        "Lost": "Thất Bại / Hủy"
    }
    st_label = stage_names.get(req.stage, req.stage)

    blocks = [
        f"🎯 **Cập nhật trạng thái cơ hội thành công!**",
        f"• **Mã Lead:** `{deal_id}`",
        f"• **Giai đoạn mới:** {st_label}"
    ]
    if req.stage == "Won":
        blocks.append("👉 *Deal đã chuyển thành công, bạn có thể gọi NV1 để tạo Hợp đồng ngay!*")

    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": {"deal_id": deal_id, "stage": req.stage, "updated": True}
    }

# =========================================================================
# NV4: GỬI TIN ZALO ZBS WIFIM (POST /api/nv4/zbs/send)
# =========================================================================
@bot_router.post("/nv4/zbs/send")
def bot_nv4_send_zbs(req: BotZBSSendRequest):
    """Bot gọi để bắn tin ZBS WIFIM cho khách hàng qua Zalo OA."""
    res = zbs_client.send_template(
        phone=req.phone,
        template_id=req.template_id,
        template_data=req.template_data
    )
    msg = res.get("message", "Đã xếp hàng gửi tin")
    blocks = [
        f"💬 **Thông báo Zalo ZBS WIFIM:**",
        f"• **Người nhận:** `{req.phone}`",
        f"• **Template ID:** `{req.template_id}`",
        f"• **Trạng thái:** {msg}"
    ]
    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": res
    }

# =========================================================================
# NV5: BẢO HÀNH & SỬA CHỮA (POST /api/nv5/warranty/start & PUT /api/nv5/warranty/{id}/complete)
# =========================================================================
@bot_router.post("/nv5/warranty/start")
def bot_nv5_start_warranty(req: BotWarrantyStartRequest):
    """Bot gọi khi tiếp nhận sự cố âm thanh từ khách hàng."""
    res = create_warranty_ticket(
        device_name=req.device_name,
        model=req.model or "",
        serial=req.serial or "",
        error_desc=req.error_desc,
        phone=req.phone,
        customer_name=req.customer_name,
        urgency=req.urgency or "Thuong",
        source="Telegram Bot",
        ktv_name=req.ktv_name or "Trần Minh Đức",
        send_zbs=req.send_zbs if req.send_zbs is not None else True
    )
    tid = res.get("ticket_id")
    blocks = [
        f"🔧 **Đã tạo Phiếu Bảo Hành & Sửa Chữa!**",
        f"• **Mã phiếu RMA:** `{tid}`",
        f"• **Thiết bị:** {req.device_name} (Model: `{req.model or 'Chưa rõ'}`)",
        f"• **Mô tả lỗi:** {req.error_desc}",
        f"• **Khách hàng:** {req.customer_name} (`{req.phone}`)",
        f"• **KTV phụ trách:** {req.ktv_name}",
        f"• **Lịch xử lý:** Trong 24h làm việc"
    ]
    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": res
    }

@bot_router.put("/nv5/warranty/{ticket_id}/complete")
def bot_nv5_complete_warranty(ticket_id: str, note: Optional[str] = "Đã hoàn thành sửa chữa và bàn giao cho khách"):
    """Bot gọi khi KTV báo đã sửa xong thiết bị."""
    db = SessionLocal()
    try:
        wt = db.query(WarrantyTicket).filter((WarrantyTicket.ticket_code == ticket_id) | (WarrantyTicket.id == ticket_id)).first()
        if wt:
            wt.status = "Hoan thanh"
            db.commit()
    finally:
        db.close()

    blocks = [
        f"✅ **Đã hoàn thành Phiếu Bảo Hành `{ticket_id}`!**",
        f"• **Ghi chú nghiệm thu:** {note}",
        f"• **Thông báo:** Đã chuyển trạng thái hoàn tất trên hệ thống."
    ]
    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": {"ticket_id": ticket_id, "status": "Hoan thanh"}
    }

# =========================================================================
# NV6: TỒN KHO & CẢNH BÁO SẮP HẾT (GET /api/nv6/stock/check)
# =========================================================================
@bot_router.get("/nv6/stock/check")
def bot_nv6_stock_check():
    """Bot gọi định kỳ (8h sáng) để kiểm tra các thiết bị chạm ngưỡng tồn tối thiểu."""
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        low_stock = [p for p in products if p.stock_quantity <= p.min_threshold]
        total_val = sum((p.stock_quantity * p.import_price) for p in products)

        blocks = [
            f"📦 **Báo Cáo Tồn Kho Thiết Bị Âm Thanh — Phúc Thanh Audio**",
            f"• **Tổng giá trị tồn kho:** `{total_val:,.0f} đ`",
            f"• **Tổng số mặt hàng (SKU):** {len(products)} thiết bị",
            f"• **Cảnh báo cần nhập gấp:** {len(low_stock)} thiết bị"
        ]

        if low_stock:
            blocks.append("\n⚠️ **Danh sách thiết bị sắp hết hàng:**")
            for idx, p in enumerate(low_stock, 1):
                blocks.append(f"{idx}. **{p.name}** (`{p.sku}`) — Tồn: **{p.stock_quantity}** / Ngưỡng min: {p.min_threshold} ({p.brand})")
        else:
            blocks.append("✅ Tất cả thiết bị đều ở mức tồn an toàn.")

        return {
            "action": "ANSWER",
            "blocks": blocks,
            "data": {
                "total_value": total_val,
                "sku_count": len(products),
                "low_stock_count": len(low_stock),
                "items": [{"sku": p.sku, "name": p.name, "stock": p.stock_quantity, "min": p.min_threshold} for p in low_stock]
            }
        }
    finally:
        db.close()

# =========================================================================
# NV7: BÁO CÁO KPI & DOANH THU CEO (GET /api/nv7/kpi/report)
# =========================================================================
@bot_router.get("/nv7/kpi/report")
def bot_nv7_kpi_report():
    """Bot gọi vào sáng Thứ 2 để gửi báo cáo tóm tắt chỉ số điều hành cho CEO qua Telegram."""
    kpi = get_kpi_summary()
    rev = kpi.get("total_revenue", 0)
    conts = kpi.get("total_contracts", 0)
    quotes_cnt = kpi.get("total_quotes", 0)
    won = kpi.get("won_deals", 0)
    sol_breakdown = kpi.get("solution_breakdown", [])
    top_sol = sol_breakdown[0] if sol_breakdown else {"name": "Karaoke VIP", "percent": 0}

    blocks = [
        f"📊 **Báo Cáo Điều Hành Doanh Thu (CEO) — Phúc Thanh Audio**",
        f"• **Tổng doanh thu hợp đồng:** `{rev:,.0f} đ` (~ {(rev/1000000000):.2f} Tỷ)",
        f"• **Tổng số Hợp đồng:** {conts} hợp đồng",
        f"• **Báo giá ISO phát hành:** {quotes_cnt} hồ sơ",
        f"• **Deal chốt thành công (Won):** {won} khách hàng",
        f"• **Nhóm giải pháp dẫn đầu:** **{top_sol.get('name')}** ({top_sol.get('percent')}%)",
        f"• **Cập nhật:** {kpi.get('last_updated', datetime.now().strftime('%d/%m/%Y %H:%M'))}"
    ]

    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": kpi
    }

# =========================================================================
# NV8: ĐĂNG KÝ TƯ VẤN & BÁO GIÁ NHANH (POST /api/nv8/intake & GET /api/nv8/intake/solutions)
# =========================================================================
@bot_router.get("/nv8/intake/solutions")
def bot_nv8_intake_solutions():
    """Bot gọi để lấy danh sách 4 nhóm gói giải pháp âm thanh chuyên nghiệp Phúc Thanh Audio."""
    from app.api.v1.endpoints import AUDIO_SOLUTION_PACKAGES
    blocks = [
        "🎵 **Danh Mục Giải Pháp Âm Thanh Chuyên Nghiệp — Phúc Thanh Audio**",
        "1. **Karaoke VIP & Lounge** (`karaoke_vip`): Dành cho chuỗi kinh doanh Karaoke chuyên nghiệp, biệt thự gia đình cao cấp.",
        "2. **Hội Trường & Nhà Thi Đấu** (`hoi_truong`): Hệ thống Line Array và micro hội nghị sảnh tiệc cưới, UBND, trường học.",
        "3. **Bar Club & Sân Khấu Biểu Diễn** (`bar_club`): Giải pháp Beer Club, Vũ trường, DJ Bar âm thanh uy lực.",
        "4. **Cafe Acoustic & PA Shop** (`pa_cafe`): Âm thanh nhạc nền (BGM) siêu thị, nhà hàng, spa và truyền thanh công cộng.",
        "\n💡 *Ví dụ mẫu: 'Đăng ký tư vấn gói Karaoke VIP cho quán King Club ở Quận 1, SĐT 0909123456, ngân sách 250 triệu'*"
    ]
    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": AUDIO_SOLUTION_PACKAGES
    }

@bot_router.post("/nv8/intake")
def bot_nv8_create_intake(req: BotIntakeRequest):
    """Bot gọi khi tiếp nhận yêu cầu tư vấn/báo giá từ khách hàng, tự động lưu Database, Airtable và CRM."""
    import random
    from datetime import date
    from app.core.database import SessionLocal
    from app.models.db_models import Lead as DBLead, Customer as DBCustomer

    phone = "".join(c for c in req.phone if c.isdigit())
    if phone.startswith("84") and len(phone) >= 10:
        phone = "0" + phone[2:]

    if not phone or len(phone) < 9:
        return {
            "action": "ASK",
            "blocks": ["⚠️ Vui lòng cung cấp **Số điện thoại / Zalo** của người liên hệ để kỹ sư Phúc Thanh Audio gửi phương án báo giá."],
            "data": {"missing_field": "phone"}
        }

    cust_name = (req.customer_name or "").strip()
    if not cust_name:
        return {
            "action": "ASK",
            "blocks": ["⚠️ Vui lòng cung cấp **Tên Quán, Tên Dự Án hoặc Tên Doanh Nghiệp** cần tư vấn âm thanh."],
            "data": {"missing_field": "customer_name"}
        }

    contact = (req.contact_name or cust_name).strip()
    budget = req.estimated_budget or 0

    # Tính lead score
    lead_score = 55
    if budget >= 500000000:
        lead_score += 35
    elif budget >= 200000000:
        lead_score += 25
    elif budget >= 100000000:
        lead_score += 15
    elif budget >= 50000000:
        lead_score += 10
    if req.tax_id and len(req.tax_id.strip()) >= 8:
        lead_score += 10
    if req.scale_info and len(req.scale_info.strip()) > 5:
        lead_score += 5
    lead_score = min(lead_score, 98)

    # 1. Tìm hoặc tạo Khách hàng
    cust_rec = airtable_client.find_customer_by_phone(phone)
    cust_id = cust_rec["id"] if cust_rec else None

    if not cust_id:
        new_cust = airtable_client.create_record("Khach hang", {
            "Ten cong ty": cust_name,
            "Nguoi dai dien": contact,
            "So dien thoai": phone,
            "Email": req.email or "",
            "Ma so thue MST": req.tax_id or "",
            "Dia chi": req.address or "",
            "Loai KH": "Cong ty" if req.tax_id else "Ca nhan",
            "Ghi chu": f"Tiếp nhận qua Bot Intake ngày {date.today().strftime('%d/%m/%Y')}"
        })
        if new_cust:
            cust_id = new_cust["id"]

    tracking_code = f"PT-{date.today().strftime('%Y%m')}-{random.randint(1000, 9999)}"
    pkg_name = req.package_name or "Karaoke VIP & Lounge"
    sol_type = req.solution_type or "Tư vấn thiết kế & báo giá trọn gói"
    demand_summary = f"[{pkg_name} - {sol_type}] Quy mô: {req.scale_info or 'Tiêu chuẩn'} | Dự toán: {budget:,.0f} đ"
    if req.preferred_brand:
        demand_summary += f" | Thương hiệu: {req.preferred_brand}"
    if req.notes:
        demand_summary += f" | Ghi chú: {req.notes}"

    lead_fields = {
        "Ten cty Khach": cust_name,
        "Nguoi lien he": contact,
        "So dien thoai": phone,
        "Email": req.email or "",
        "Nguon lead": "Web form",
        "Nhu cau Du an": demand_summary,
        "Khu vuc": "TP.HCM",
        "Stage": "New",
        "Lead Score": lead_score,
        "Gia tri uoc tinh": budget,
        "Ghi chu": f"Mã hồ sơ: {tracking_code} | Địa chỉ: {req.address or 'Chưa cung cấp'}"
    }
    if cust_id:
        lead_fields["Khach hang"] = [cust_id]

    lead_rec = airtable_client.create_record("Lead & Pipeline", lead_fields)
    lead_id = lead_rec["id"] if lead_rec else f"lead_{tracking_code}"

    # 2. Insert vĩnh viễn vào SQLite Database
    try:
        db = SessionLocal()
        if cust_id:
            c_db = DBCustomer(
                id=cust_id,
                company_name=cust_name,
                contact_name=contact,
                phone=phone,
                email=req.email or "",
                tax_id=req.tax_id or "",
                address=req.address or ""
            )
            db.merge(c_db)

        l_db = DBLead(
            id=lead_id,
            customer_id=cust_id,
            company_name=cust_name,
            contact_name=contact,
            phone=phone,
            email=req.email or "",
            source=req.source or "AI Bot Intake",
            demand=demand_summary,
            stage="New",
            lead_score=lead_score,
            estimated_value=budget
        )
        db.merge(l_db)
        db.commit()
        db.close()
    except Exception as e:
        print("[DB Sync Intake Lead Error]:", e)

    blocks = [
        "📋 **Đã tiếp nhận Yêu Cầu Tư Vấn & Báo Giá thành công!**",
        f"• **Mã hồ sơ:** `{tracking_code}`",
        f"• **Khách hàng:** {cust_name} ({contact} — {phone})",
        f"• **Giải pháp:** {pkg_name} ({sol_type})",
        f"• **Dự toán ngân sách:** `{budget:,.0f} đ`" if budget > 0 else "• **Dự toán ngân sách:** Kỹ sư sẽ tư vấn phương án tối ưu",
        f"• **Điểm tiềm năng (Lead Score):** `{lead_score}/100` ({'Ưu tiên cao' if lead_score >= 75 else 'Tiêu chuẩn'})",
        "• **Cơ sở dữ liệu:** Đã lưu vào SQLite Database & Pipeline CRM (Cột Mới)",
        "• **Thời gian phản hồi:** Kỹ sư âm thanh Phúc Thanh Audio sẽ liên hệ tư vấn trong vòng 15 phút!"
    ]

    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": {
            "tracking_code": tracking_code,
            "lead_id": lead_id,
            "customer_name": cust_name,
            "phone": phone,
            "lead_score": lead_score,
            "package_name": pkg_name,
            "solution_type": sol_type,
            "estimated_budget": budget
        }
    }

# =========================================================================
# THÊM SẢN PHẨM / THIẾT BỊ MỚI VÀO BẢNG GIÁ & KHO (POST /api/nv6/stock/product & /api/nv2/product)
# =========================================================================
@bot_router.post("/nv6/stock/product")
@bot_router.post("/nv2/product")
def bot_add_product(req: BotProductAddRequest):
    """Bot gọi khi người dùng yêu cầu thêm thiết bị mới vào bảng giá / kho qua chat."""
    import random, string
    from app.models.db_models import Product as DBProduct

    name = req.name.strip()
    if not name:
        return {
            "action": "ASK",
            "blocks": ["⚠️ Vui lòng cung cấp **Tên thiết bị âm thanh** cần thêm vào hệ thống."],
            "data": {"missing_field": "name"}
        }

    if not req.sale_price or req.sale_price <= 0:
        return {
            "action": "ASK",
            "blocks": [f"⚠️ Vui lòng cung cấp **Đơn giá bán niêm yết (VNĐ)** cho thiết bị **{name}**."],
            "data": {"missing_field": "sale_price"}
        }

    code_suffix = ''.join(random.choices(string.digits, k=4))
    sku = f"PT-{code_suffix}"
    prod_id = f"sp_{sku.lower()}"

    valid_brands = {"Crown", "JBL", "Yamaha", "Shure"}
    at_brand = req.brand if req.brand in valid_brands else "Khac"
    valid_cats = {"Loa", "Ampli", "Micro", "Mixer", "He thong AV"}
    at_cat = req.category if req.category in valid_cats else "Loa"

    at_unit = "Bo" if str(req.unit or "").lower() in ("bo", "bộ") else "Cai"

    # Push to Airtable
    airtable_fields = {
        "Ten SP": name,
        "Ma SP": sku,
        "Thuong hieu": at_brand,
        "Nhom san pham": at_cat,
        "Don gia ban": req.sale_price,
        "Don vi tinh": at_unit,
        "Trang thai": "Dang kinh doanh"
    }
    rec = airtable_client.create_record("San pham & Bang gia", airtable_fields)
    final_id = rec.get("id") if rec else prod_id

    # Push to SQLite DB
    try:
        from app.core.database import SessionLocal
        db = SessionLocal()
        db_p = DBProduct(
            id=final_id,
            sku=sku,
            name=name,
            brand=req.brand or "Chính hãng",
            category=req.category or "Loa",
            unit=req.unit or "Cái",
            import_price=req.import_price or 0,
            sale_price=req.sale_price,
            stock_quantity=req.stock_quantity if req.stock_quantity is not None else 5,
            min_threshold=2,
            specs=req.specs or "",
            status="Dang kinh doanh"
        )
        db.merge(db_p)
        db.commit()
        db.close()
    except Exception as e:
        print("[Bot Add Product DB Error]:", e)

    blocks = [
        "✅ **Đã thêm thiết bị mới vào Bảng Giá & Kho thành công!**",
        f"• **Tên thiết bị:** {name}",
        f"• **Mã SKU:** `{sku}`",
        f"• **Thương hiệu:** {req.brand or 'Chính hãng'}",
        f"• **Phân loại:** {req.category or 'Loa'} | Đơn vị: {req.unit or 'Cái'}",
        f"• **Đơn giá bán niêm yết:** `{req.sale_price:,.0f} đ`",
        f"• **Tồn kho khởi tạo:** {req.stock_quantity or 5} {req.unit or 'Cái'}",
        "• **Đồng bộ hệ thống:** Đã lưu vào SQLite Database & Bảng giá Airtable (sẵn sàng tạo báo giá ngay trên Quote Studio)"
    ]

    return {
        "action": "ANSWER",
        "blocks": blocks,
        "data": {
            "id": final_id,
            "sku": sku,
            "name": name,
            "brand": req.brand,
            "sale_price": req.sale_price,
            "stock_quantity": req.stock_quantity or 5
        }
    }


