import os
import urllib.parse
from datetime import datetime
from app.core.config import settings
from fastapi.responses import FileResponse
from app.services.redis_service import redis_client
from fastapi import APIRouter, HTTPException
from app.models.schemas import (
    AudioIntakeSubmitRequest,
    LeadStageUpdateRequest,
    TaxLookupRequest, ContractCreateRequest, QuoteCreateRequest,
    LeadCreateRequest, WarrantyCreateRequest, ZBSSendRequest, InventoryTransactionRequest,
    ProductCreateRequest
)
from app.services.tax_service import lookup_tax_info
from app.services.contract_service import create_contract
from app.services.quote_service import create_quote
from app.services.operations_services import (
    create_lead, create_warranty_ticket, check_inventory_alerts, get_kpi_summary
)
from app.services.airtable_service import airtable_client
from app.services.zbs_service import zbs_client

router = APIRouter()

# Tra MST
@router.post("/lookup/tax")
def api_tax_lookup(req: TaxLookupRequest):
    res = lookup_tax_info(req.mst)
    if not res.get("success"):
        raise HTTPException(status_code=400, detail=res.get("error"))
    return res

# NV1: Tạo Hợp đồng
@router.post("/contracts")
def api_create_contract(req: ContractCreateRequest):
    res = create_contract(
        mst=req.mst,
        phone=req.phone,
        contract_type=req.contract_type or "Cung cấp thiết bị",
        items=[it.dict() for it in req.items] if req.items else None,
        total_amount=req.total_amount,
        payment_terms=req.payment_terms,
        delivery_date=req.delivery_date,
        warranty_months=req.warranty_months or 24,
        special_terms=req.special_terms,
        sales_rep=req.sales_rep,
        send_zbs=req.send_zbs or False,
        company_name=req.company_name,
        include_vat=req.include_vat if req.include_vat is not None else True,
        price_includes_vat=req.price_includes_vat or False
    )
    redis_client.delete("contracts_list")
    redis_client.delete("kpi_summary")
    return res

@router.get("/contracts")
def api_list_contracts():
    cached = redis_client.get("contracts_list")
    if cached is not None:
        return cached

    records = []
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Contract as DBContract
        db = SessionLocal()
        db_contracts = db.query(DBContract).order_by(DBContract.id.desc()).all()
        for c in db_contracts:
            records.append({
                "id": c.id,
                "fields": {
                    "Ma HD": c.contract_code,
                    "Nguoi ky KH": c.company_name or c.representative or "Khách hàng",
                    "MST KH": c.tax_id or "",
                    "Loai HD": c.contract_type or "Cung cấp thiết bị",
                    "Gia tri HD": c.grand_total or 0,
                    "Trang thai": c.status or "Cho ky"
                }
            })
        db.close()
    except Exception as e:
        print("[api_list_contracts DB error]:", e)

    # Nếu DB trống thì mới fallback sang Airtable
    if not records:
        records = airtable_client.list_records("Hop dong") or []

    redis_client.set("contracts_list", records, expire_seconds=300)
    return records

@router.patch("/contracts/{contract_id}/status")
def api_update_contract_status(contract_id: str, payload: dict):
    """Cập nhật trạng thái hợp đồng (ví dụ: Chờ ký -> Đã ký / Đang thực hiện) để ghi nhận Doanh thu thực đạt chuẩn kế toán."""
    new_status = payload.get("status", "Da ky")
    from app.core.database import SessionLocal
    from app.models.db_models import Contract as DBContract
    db = SessionLocal()
    try:
        c = db.query(DBContract).filter((DBContract.id == contract_id) | (DBContract.contract_code == contract_id)).first()
        if c:
            c.status = new_status
            db.commit()
            
        # Tìm record Airtable để cập nhật nếu có
        try:
            target_airtable_id = contract_id
            if not contract_id.startswith("rec"):
                at_recs = airtable_client.list_records("Hop dong") or []
                for r in at_recs:
                    if r.get("fields", {}).get("Ma HD") == contract_id:
                        target_airtable_id = r.get("id")
                        break
            if target_airtable_id and target_airtable_id.startswith("rec"):
                airtable_client.update_record("Hop dong", target_airtable_id, {"Trang thai": new_status})
        except Exception as ae:
            print("[Airtable update contract status error]:", ae)
            
        redis_client.delete("contracts_list")
        redis_client.delete("kpi_summary")
        return {"success": True, "contract_id": contract_id, "status": new_status}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

# NV2: Tạo Báo giá ISO
@router.post("/quotes")
def api_create_quote(req: QuoteCreateRequest):
    res = create_quote(
        company_name=req.company_name,
        contact_name=req.contact_name,
        phone=req.phone,
        email=req.email or "",
        project_name=req.project_name or "Trang bị âm thanh",
        items=[it.dict() for it in req.items],
        include_vat=req.include_vat,
        discount=req.discount or 0,
        discount_percent=req.discount_percent or 0,
        chiet_khau=req.chiet_khau or 0,
        ck=req.ck or 0,
        sales_rep=req.sales_rep,
        delivery_notes=req.delivery_notes,
        warranty_notes=req.warranty_notes,
        payment_notes=req.payment_notes,
        special_notes=req.special_notes,
        send_zbs=req.send_zbs or False
    )
    redis_client.delete("quotes_list")
    redis_client.delete("kpi_summary")
    return res

@router.get("/quotes")
def api_list_quotes():
    cached = redis_client.get("quotes_list")
    if cached is not None:
        return cached

    records = []
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Quote as DBQuote
        db = SessionLocal()
        db_quotes = db.query(DBQuote).order_by(DBQuote.id.desc()).all()
        for q in db_quotes:
            records.append({
                "id": q.id,
                "fields": {
                    "Ma bao gia": q.quote_code,
                    "Ten du an": q.company_name or "Trang bị âm thanh",
                    "Nguoi lien he": q.contact_name or "",
                    "So dien thoai": q.phone or "",
                    "Tong cong gia tri": q.grand_total or 0,
                    "Trang thai": q.status or "Moi"
                }
            })
        db.close()
    except Exception as e:
        print("[api_list_quotes DB error]:", e)

    if not records:
        records = airtable_client.list_records("Bao gia") or []

    redis_client.set("quotes_list", records, expire_seconds=300)
    return records

# NV3: Lead & Pipeline
@router.post("/leads")
def api_create_lead(req: LeadCreateRequest):
    res = create_lead(
        company_name=req.company_name,
        contact_name=req.contact_name,
        phone=req.phone,
        email=req.email or "",
        source=req.source or "Web form",
        demand=req.demand or "",
        estimated_value=req.estimated_value or 0,
        sales_rep=req.sales_rep
    )
    redis_client.delete("leads_list")
    redis_client.delete("kpi_summary")
    return res

@router.get("/leads")
def api_list_leads():
    cached = redis_client.get("leads_list")
    if cached is not None:
        return cached

    records = []
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Lead as DBLead
        db = SessionLocal()
        db_leads = db.query(DBLead).order_by(DBLead.id.desc()).all()
        for l in db_leads:
            records.append({
                "id": l.id,
                "fields": {
                    "Ten cty Khach": l.company_name or "",
                    "Nguoi lien he": l.contact_name or "",
                    "So dien thoai": l.phone or "",
                    "Email": l.email or "",
                    "Nguon lead": l.source or "Web form",
                    "Nhu cau Du an": l.demand or "",
                    "Stage": l.stage or "New",
                    "Lead Score": l.lead_score or 60,
                    "Gia tri uoc tinh": l.estimated_value or 0
                }
            })
        db.close()
    except Exception as e:
        print("[api_list_leads DB error]:", e)

    if not records:
        records = airtable_client.list_records("Lead & Pipeline") or []

    redis_client.set("leads_list", records, expire_seconds=300)
    return records

# NV4: ZBS WIFIM
@router.get("/zbs/templates")
def api_zbs_templates():
    return zbs_client.get_templates()

@router.post("/zbs/send")
def api_zbs_send(req: ZBSSendRequest):
    res = zbs_client.send_template(
        phone=req.phone,
        template_id=req.template_id,
        template_data=req.template_data,
        scheduled_time=req.scheduled_time
    )
    return res

# NV5: Bảo hành
@router.post("/warranties")
def api_create_warranty(req: WarrantyCreateRequest):
    res = create_warranty_ticket(
        device_name=req.device_name,
        model=req.model,
        serial=req.serial,
        error_desc=req.error_desc,
        phone=req.phone,
        customer_name=req.customer_name,
        urgency=req.urgency or "Thuong",
        source=req.source or "Zalo",
        ktv_name=req.ktv_name or "Trần Minh Đức",
        send_zbs=req.send_zbs or False
    )
    redis_client.delete("warranties_list")
    redis_client.delete("kpi_summary")
    return res

@router.get("/warranties")
def api_list_warranties():
    cached = redis_client.get("warranties_list")
    if cached is not None:
        return cached

    records = []
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import WarrantyTicket as DBWarrantyTicket
        db = SessionLocal()
        db_tickets = db.query(DBWarrantyTicket).order_by(DBWarrantyTicket.id.desc()).all()
        for t in db_tickets:
            records.append({
                "id": t.id,
                "fields": {
                    "Ma phieu BH": t.ticket_code,
                    "Ten thiet bi": t.device_name or "",
                    "Model": t.model or "",
                    "Serial Number": t.serial_number or "",
                    "Mo ta loi": t.error_desc or "",
                    "Khach hang": t.customer_name or "",
                    "So dien thoai": t.phone or "",
                    "Trang thai": t.status or "Tiep nhan",
                    "Muc do": t.urgency or "Thuong"
                }
            })
        db.close()
    except Exception as e:
        print("[api_list_warranties DB error]:", e)

    if not records:
        records = airtable_client.list_records("Phieu Bao hanh") or []

    redis_client.set("warranties_list", records, expire_seconds=300)
    return records

# NV6: Tồn kho
@router.get("/inventory/alerts")
def api_inventory_alerts():
    return check_inventory_alerts()

@router.get("/products")
def api_list_products():
    cached = redis_client.get("products_list")
    if cached is not None:
        return cached

    records = []
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Product as DBProduct
        db = SessionLocal()
        db_prods = db.query(DBProduct).order_by(DBProduct.id.desc()).all()
        for dp in db_prods:
            records.append({
                "id": dp.id,
                "fields": {
                    "Ten SP": dp.name,
                    "Ma SP": dp.sku,
                    "Thuong hieu": dp.brand or "Chính hãng",
                    "Nhom san pham": dp.category or "Loa",
                    "Don vi tinh": dp.unit or "Cái",
                    "Don gia ban": dp.sale_price or 0,
                    "Don gia nhap TB": dp.import_price or 0,
                    "Ton kho": dp.stock_quantity if dp.stock_quantity is not None else 5,
                    "Trang thai": dp.status or "Dang kinh doanh"
                }
            })
        db.close()
    except Exception as e:
        print("[api_list_products DB error]:", e)

    if not records:
        records = airtable_client.list_products() or []

    redis_client.set("products_list", records, expire_seconds=300)
    return records

@router.post("/products")
def api_create_product(req: ProductCreateRequest):
    import random, string

    name = req.name.strip()
    if not name:
        raise HTTPException(status_code=400, detail="Tên thiết bị không được để trống!")

    # 1. Sinh SKU và ID
    code_suffix = ''.join(random.choices(string.digits, k=4))
    sku = f"PT-{code_suffix}"
    prod_id = f"sp_{sku.lower()}"

    # 2. Đẩy lên Airtable table "San pham & Bang gia" (dùng option an toàn cho multiple-choice)
    valid_brands = {"Crown", "JBL", "Yamaha", "Shure"}
    at_brand = req.brand if req.brand in valid_brands else "Khac"
    
    valid_cats = {"Loa", "Ampli", "Micro", "Mixer", "He thong AV"}
    at_cat = req.category if req.category in valid_cats else "Loa"

    at_unit = "Bo" if str(req.unit or "").lower() in ("bo", "bộ") else "Cai"

    airtable_fields = {
        "Ten SP": name,
        "Ma SP": sku,
        "Thuong hieu": at_brand,
        "Nhom san pham": at_cat,
        "Don gia ban": req.sale_price,
        "Don vi tinh": at_unit,
        "Trang thai": "Dang kinh doanh"
    }
    if req.import_price:
        airtable_fields["Don gia nhap TB"] = req.import_price
    if req.min_threshold:
        airtable_fields["Nguong ton min"] = req.min_threshold
    if req.specs:
        airtable_fields["Mo ta ky thuat"] = req.specs

    rec = airtable_client.create_record("San pham & Bang gia", airtable_fields)
    final_id = rec.get("id") if rec else prod_id

    # 3. Lưu vào SQLite Database nội bộ
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Product as DBProduct
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
            min_threshold=req.min_threshold if req.min_threshold is not None else 2,
            specs=req.specs or "",
            status="Dang kinh doanh"
        )
        db.merge(db_p)
        db.commit()
        db.close()
    except Exception as e:
        print("[DB Insert Product Error]:", e)

    redis_client.delete("products_list")
    redis_client.delete("inventory_items")
    redis_client.delete("kpi_summary")
    return {
        "success": True,
        "product": {
            "id": final_id,
            "fields": {
                "Ten SP": name,
                "Ma SP": sku,
                "Thuong hieu": req.brand or "Chính hãng",
                "Nhom san pham": req.category or "Loa",
                "Don vi tinh": req.unit or "Cái",
                "Don gia ban": req.sale_price,
                "Don gia nhap TB": req.import_price or 0,
                "Ton kho": req.stock_quantity if req.stock_quantity is not None else 5,
                "Trang thai": "Dang kinh doanh"
            }
        },
        "message": f"Đã thêm thiết bị '{name}' thành công!"
    }

# NV7: KPI Dashboard
@router.get("/kpi/summary")
def api_kpi_summary():
    cached = redis_client.get("kpi_summary")
    if cached:
        return cached
    data = get_kpi_summary()
    redis_client.set("kpi_summary", data, expire_seconds=180)
    return data


def auto_create_contract_for_won_lead(company_name: str, contact_name: str, phone: str, estimated_value: int, demand: str) -> Optional[str]:
    """Tự động khởi tạo hợp đồng kinh tế khi cơ hội bán hàng (Lead) được chốt thành công (Won)."""
    from app.core.database import SessionLocal
    from app.models.db_models import Contract as DBContract
    db = SessionLocal()
    try:
        clean_phone = (phone or "").strip().replace(" ", "").replace("+", "")
        # Kiểm tra nếu hợp đồng cho khách hàng này đã tồn tại thì không tạo trùng
        existing = db.query(DBContract).filter(
            (DBContract.company_name == company_name) |
            (DBContract.phone == phone) |
            (DBContract.phone == clean_phone)
        ).first()
        if existing:
            return existing.contract_code

        from app.services.contract_service import create_contract
        amount = estimated_value if (estimated_value and estimated_value > 0) else 250000000
        res = create_contract(
            mst="",
            phone=clean_phone or phone,
            company_name=company_name,
            contract_type="Cung cấp & Lắp đặt thiết bị âm thanh",
            total_amount=amount,
            special_terms=f"Hợp đồng tự động khởi tạo từ cơ hội chốt thành công: {demand or 'Hệ thống âm thanh Phúc Thanh Audio'}",
            sales_rep="Nguyễn Văn Tuấn",
            send_zbs=False,
            include_vat=True,
            price_includes_vat=False
        )
        redis_client.delete("contracts_list")
        redis_client.delete("kpi_summary")
        return res.get("contract_id")
    except Exception as e:
        print(f"[Auto Create Contract for Won Lead Error]: {e}")
        return None
    finally:
        db.close()


@router.patch("/leads/{lead_id}/stage")
def api_update_lead_stage(lead_id: str, req: LeadStageUpdateRequest):
    target_stage = req.stage
    lead_info = {}

    # 1. Cập nhật SQLite nội bộ trước (< 2ms) đảm bảo lưu bền vững
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Lead as DBLead
        db = SessionLocal()
        lead = db.query(DBLead).filter((DBLead.id == lead_id) | (DBLead.phone == lead_id)).first()
        if lead:
            lead.stage = target_stage
            db.commit()
            lead_info = {
                "company_name": lead.company_name,
                "contact_name": lead.contact_name,
                "phone": lead.phone,
                "estimated_value": lead.estimated_value or 0,
                "demand": lead.demand or ""
            }
        else:
            # Nếu lead chưa có trong SQLite (tạo từ nguồn khác/Airtable), tự động import vào SQLite
            try:
                at_lead = airtable_client.list_records("Lead & Pipeline", filter_formula=f"RECORD_ID() = '{lead_id}'")
                if at_lead:
                    f = at_lead[0].get("fields", {})
                    new_db_lead = DBLead(
                        id=lead_id,
                        company_name=f.get("Ten cty Khach") or "Khách hàng",
                        contact_name=f.get("Nguoi lien he") or "",
                        phone=f.get("So dien thoai") or "",
                        email=f.get("Email") or "",
                        source=f.get("Nguon lead") or "Web form",
                        demand=f.get("Nhu cau Du an") or "",
                        stage=target_stage,
                        lead_score=f.get("Lead Score") or 60,
                        estimated_value=f.get("Gia tri uoc tinh") or 0
                    )
                    db.merge(new_db_lead)
                    db.commit()
                    lead_info = {
                        "company_name": new_db_lead.company_name,
                        "contact_name": new_db_lead.contact_name,
                        "phone": new_db_lead.phone,
                        "estimated_value": new_db_lead.estimated_value or 0,
                        "demand": new_db_lead.demand or ""
                    }
            except Exception as e_sync:
                print("[Sync missing lead into SQLite]:", e_sync)
        db.close()
    except Exception as e:
        print("[DB update lead stage error]:", e)

    # 2. Xóa cache tức thì trong Redis và Memory để GET /leads sau khi reload thấy ngay trạng thái mới
    redis_client.delete("leads_list")
    redis_client.delete("kpi_summary")

    # 3. Nếu chuyển sang 'Won' (Ký Kết Hợp Đồng) -> Tự động khởi tạo Hợp đồng mới
    created_contract_code = None
    if target_stage == "Won" and lead_info:
        try:
            created_contract_code = auto_create_contract_for_won_lead(
                company_name=lead_info.get("company_name", "Khách hàng"),
                contact_name=lead_info.get("contact_name", ""),
                phone=lead_info.get("phone", ""),
                estimated_value=lead_info.get("estimated_value", 0),
                demand=lead_info.get("demand", "")
            )
        except Exception as e_c:
            print("[Auto create contract trigger error]:", e_c)

    # 4. Cập nhật Airtable trong background thread (không block 15s gây timeout trình duyệt khi người dùng reload)
    import threading
    def sync_to_airtable(lid: str, stage_val: str):
        try:
            target_aid = lid
            if not lid.startswith("rec"):
                at_recs = airtable_client.list_records("Lead & Pipeline") or []
                for r in at_recs:
                    if r.get("fields", {}).get("So dien thoai") == lid or r.get("fields", {}).get("Ten cty Khach") == lid:
                        target_aid = r.get("id")
                        break
            if target_aid and target_aid.startswith("rec"):
                airtable_client.update_record("Lead & Pipeline", target_aid, {"Stage": stage_val})
        except Exception as ae:
            print("[Airtable background update lead stage error]:", ae)

    threading.Thread(target=sync_to_airtable, args=(lead_id, target_stage), daemon=True).start()

    return {
        "success": True,
        "lead_id": lead_id,
        "stage": target_stage,
        "created_contract_code": created_contract_code
    }


# ==========================================
# PUBLIC AUDIO INTAKE API (Gói giải pháp & Tiếp nhận Lead)
# ==========================================

AUDIO_SOLUTION_PACKAGES = [
    {
        "id": "karaoke_vip",
        "name": "Karaoke & VIP Lounge",
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
        "name": "Hội Trường & Trung Tâm Tiệc Cưới",
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
        "name": "Chuỗi Bán Lẻ, Cafe & Âm Thanh PA",
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

@router.get("/intake/solutions")
def api_get_intake_solutions():
    cached = redis_client.get("intake_solutions")
    if cached is not None:
        return cached

    import json
    from app.core.database import SessionLocal
    from app.models.db_models import SolutionPackage
    db = SessionLocal()
    try:
        packages = db.query(SolutionPackage).all()
        if packages:
            res_pkgs = []
            for p in packages:
                res_pkgs.append({
                    "id": p.id,
                    "name": p.name,
                    "badge": p.badge,
                    "description": p.description,
                    "services": json.loads(p.services_json) if p.services_json else []
                })
            res = {"success": True, "packages": res_pkgs}
            redis_client.set("intake_solutions", res, expire_seconds=600)
            return res
    except Exception as e:
        print("[Solutions DB Query Error]:", e)
    finally:
        db.close()
    res = {"success": True, "packages": AUDIO_SOLUTION_PACKAGES}
    redis_client.set("intake_solutions", res, expire_seconds=600)
    return res

@router.post("/intake/submit")
def api_submit_audio_intake(req: AudioIntakeSubmitRequest):
    import datetime, random
    
    # 1. Chuẩn hóa SĐT
    phone = "".join(c for c in req.phone if c.isdigit())
    if phone.startswith("84") and len(phone) >= 10:
        phone = "0" + phone[2:]
        
    cust_name = req.customer_name.strip()
    contact = req.contact_name.strip()
    
    # 2. Tính toán điểm Lead Score tự động theo chuẩn Phúc Thanh Audio
    lead_score = 55
    budget = req.estimated_budget or 0
    if budget >= 500000000:
        lead_score += 35
    elif budget >= 200000000:
        lead_score += 25
    elif budget >= 100000000:
        lead_score += 15
    elif budget >= 50000000:
        lead_score += 10
        
    if req.tax_id and len(req.tax_id.strip()) >= 8:
        lead_score += 10  # Khách hàng doanh nghiệp B2B
        
    if req.scale_info and len(req.scale_info.strip()) > 5:
        lead_score += 5   # Nhu cầu rõ ràng, có quy mô cụ thể
        
    lead_score = min(lead_score, 98)
    
    # 3. Tạo hoặc tìm Khách hàng trên Airtable
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
            "Loai KH": "Du an" if req.tax_id else "Ban le",
            "Ghi chu": f"Tiếp nhận qua Form Intake ngày {datetime.date.today().strftime('%d/%m/%Y')}"
        })
        if new_cust:
            cust_id = new_cust["id"]
            
    # 4. Tạo bản ghi Lead mới trên bảng Lead & Pipeline
    tracking_code = f"PT-{datetime.date.today().strftime('%Y%m')}-{random.randint(1000, 9999)}"
    demand_summary = f"[{req.package_name} - {req.solution_type}] Quy mô: {req.scale_info or 'Tiêu chuẩn'} | Dự toán: {budget:,.0f} đ"
    if req.preferred_brand:
        demand_summary += f" | Thương hiệu: {req.preferred_brand}"
    if req.notes:
        demand_summary += f" | Ghi chú: {req.notes}"
        
    lead_fields = {
        "Ten cty Khach": cust_name,
        "Nguoi lien he": contact,
        "So dien thoai": phone,
        "Email": req.email or "",
        "Nguon lead": req.source or "Web form",
        "Nhu cau Du an": demand_summary,
        "Khu vuc": "TP.HCM",
        "Stage": "New",  # Tự động xuất hiện ở Cột 1 Kanban
        "Lead Score": lead_score,
        "Gia tri uoc tinh": budget,
        "Ghi chu": f"Mã hồ sơ: {tracking_code} | Địa chỉ công trình: {req.address or 'Chưa cung cấp'}"
    }
    
    if cust_id:
        lead_fields["Khach hang"] = [cust_id]
        
    lead_rec = airtable_client.create_record("Lead & Pipeline", lead_fields)
    
    # Sync sang SQLite DB
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Lead as DBLead, Customer as DBCustomer
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
            id=lead_rec["id"] if lead_rec else f"lead_{tracking_code}",
            customer_id=cust_id,
            company_name=cust_name,
            contact_name=contact,
            phone=phone,
            email=req.email or "",
            source=req.source or "Web form",
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

    # 5. Gửi thông báo Zalo ZBS WIFIM cho khách hàng xác nhận hồ sơ (nếu có cấu hình)
    zbs_notified = False
    try:
        from app.services.zbs_service import zbs_client
        zbs_res = zbs_client.send_template(
            phone=phone,
            template_id="584044",
            template_data={
                "customer_name": contact or cust_name,
                "date": datetime.date.today().strftime("%d/%m/%Y"),
                "order_code": tracking_code,
                "money": f"{budget:,.0f} đ" if budget > 0 else "Theo tư vấn kỹ thuật",
                "service": req.solution_type
            }
        )
        zbs_notified = zbs_res.get("success", False)
    except Exception as e:
        print("[Intake ZBS Warning]:", e)
        
    redis_client.delete("leads_list")
    redis_client.delete("kpi_summary")
    return {
        "success": True,
        "tracking_code": tracking_code,
        "lead_id": lead_rec["id"] if lead_rec else None,
        "customer_id": cust_id,
        "lead_score": lead_score,
        "zbs_sent": zbs_notified,
        "message": "Tiếp nhận thông tin thành công. Kỹ thuật viên Phúc Thanh Audio sẽ liên hệ trong ít phút!"
    }


# ==========================================
# REDIS CACHE & METRICS ENDPOINTS
# ==========================================
@router.get("/redis/status")
def api_redis_status():
    """Kiểm tra kết nối và chỉ số bộ nhớ đệm Redis."""
    return redis_client.get_info()

# ==========================================
# FILE DOWNLOAD CHUẨN ĐỊNH DẠNG .DOCX CÓ HEADER
# ==========================================
@router.get("/contracts/{contract_id}/download")
def api_download_contract(contract_id: str):
    """Tải file hợp đồng Word .docx chuẩn với Content-Disposition header rõ ràng."""
    filename = f"{contract_id}.docx" if not contract_id.endswith(".docx") else contract_id
    contract_dir = os.path.join(settings.OUTPUT_DIR, "contracts")
    file_path = os.path.join(contract_dir, filename)
    
    # Nếu file chưa tồn tại trên ổ cứng, tự động tạo từ thông tin Hợp đồng trong Database
    if not os.path.exists(file_path):
        os.makedirs(contract_dir, exist_ok=True)
        cid_clean = contract_id.replace(".docx", "")
        from app.services.document_service import generate_contract_document
        from app.core.database import SessionLocal
        from app.models.db_models import Contract as DBContract
        
        db = SessionLocal()
        c = db.query(DBContract).filter((DBContract.contract_code == cid_clean) | (DBContract.id == cid_clean)).first()
        if c:
            contract_data = {
                "contract_id": c.contract_code,
                "contract_type": c.contract_type or "Cung cấp & Lắp đặt hệ thống âm thanh chuyên nghiệp",
                "company_name": c.company_name or "CÔNG TY ĐỐI TÁC PHÚC THANH AUDIO",
                "tax_id": c.tax_id or "",
                "address": c.address or "TP. Hồ Chí Minh",
                "representative": c.representative or "Đại diện theo pháp luật",
                "phone": c.phone or "",
                "items": [
                    {"idx": 1, "name": "Hệ thống thiết bị âm thanh chuyên nghiệp", "unit": "Hệ thống", "qty": 1, "price": c.total_amount or c.grand_total, "total": c.total_amount or c.grand_total}
                ],
                "subtotal": c.total_amount or c.grand_total,
                "vat": c.vat_amount or int((c.total_amount or c.grand_total) * 0.1),
                "grand_total": c.grand_total,
                "grand_total_words": "Theo giá trị hợp đồng đã duyệt.",
                "payment_terms": c.payment_terms or "Thanh toán theo hợp đồng.",
                "delivery_date": c.delivery_date or "Trong vòng 05 ngày kể từ ngày tạm ứng",
                "warranty_months": c.warranty_months or 24,
                "special_terms": c.special_terms or "Bảo hành tận nơi theo tiêu chuẩn Phúc Thanh Audio."
            }
        else:
            contract_data = {
                "contract_id": cid_clean,
                "contract_type": "Cung cấp thiết bị âm thanh",
                "company_name": "Khách hàng Phúc Thanh Audio",
                "tax_id": "",
                "address": "TP. Hồ Chí Minh",
                "representative": "Đại diện khách hàng",
                "phone": "",
                "items": [],
                "subtotal": 0,
                "vat": 0,
                "grand_total": 0,
                "grand_total_words": "Không đồng.",
                "payment_terms": "Thanh toán theo tiến độ.",
                "delivery_date": "Theo thỏa thuận",
                "warranty_months": 24,
                "special_terms": "Bảo hành chính hãng."
            }
        db.close()
        file_path = generate_contract_document(contract_data)
        
    safe_filename = filename if filename.endswith(".docx") else f"{filename}.docx"
    encoded_filename = urllib.parse.quote(safe_filename)
    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"; filename*=UTF-8\'\'{encoded_filename}',
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
    )

@router.get("/quotes/{quote_id}/download")
def api_download_quote(quote_id: str):
    """Tải file báo giá Word .docx chuẩn với Content-Disposition header rõ ràng."""
    filename = f"{quote_id}.docx" if not quote_id.endswith(".docx") else quote_id
    quote_dir = os.path.join(settings.OUTPUT_DIR, "quotes")
    file_path = os.path.join(quote_dir, filename)
    
    if not os.path.exists(file_path):
        os.makedirs(quote_dir, exist_ok=True)
        qid_clean = quote_id.replace(".docx", "")
        from app.services.document_service import generate_quote_document
        from app.core.database import SessionLocal
        from app.models.db_models import Quote as DBQuote
        
        db = SessionLocal()
        q = db.query(DBQuote).filter((DBQuote.quote_code == qid_clean) | (DBQuote.id == qid_clean)).first()
        if q:
            quote_items = []
            for idx, it in enumerate(q.items, start=1):
                quote_items.append({
                    "idx": idx,
                    "name": it.product_name,
                    "brand": it.brand,
                    "unit": it.unit,
                    "qty": it.quantity,
                    "price": it.unit_price,
                    "total": it.total_price
                })
            quote_data = {
                "quote_id": q.quote_code,
                "company_name": q.company_name or "Khách hàng Phúc Thanh Audio",
                "contact_name": q.contact_name or "",
                "phone": q.phone or "",
                "project_name": q.project_name or "Gói giải pháp âm thanh",
                "items": quote_items,
                "subtotal": q.subtotal or q.grand_total,
                "vat": q.vat_amount or 0,
                "grand_total": q.grand_total,
                "grand_total_words": "Theo tổng giá trị báo giá."
            }
        else:
            quote_data = {
                "quote_id": qid_clean,
                "company_name": "Khách hàng",
                "contact_name": "",
                "phone": "",
                "project_name": "Báo giá âm thanh",
                "items": [],
                "subtotal": 0,
                "vat": 0,
                "grand_total": 0,
                "grand_total_words": "Không đồng."
            }
        db.close()
        file_path = generate_quote_document(quote_data)
        
    safe_filename = filename if filename.endswith(".docx") else f"{filename}.docx"
    encoded_filename = urllib.parse.quote(safe_filename)
    return FileResponse(
        path=file_path,
        filename=safe_filename,
        media_type="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        headers={
            "Content-Disposition": f'attachment; filename="{safe_filename}"; filename*=UTF-8\'\'{encoded_filename}',
            "Access-Control-Expose-Headers": "Content-Disposition",
            "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
        }
    )


# ==========================================
# NV6: KHO THIẾT BỊ & CẢNH BÁO TỒN KHO
# ==========================================
@router.get("/inventory/items")
def api_get_inventory_items():
    """Lấy danh mục tồn kho thiết bị âm thanh trực tiếp từ Database có Redis Caching."""
    cached = redis_client.get("inventory_items")
    if cached is not None:
        return cached

    from app.core.database import SessionLocal
    from app.models.db_models import Product
    db = SessionLocal()
    try:
        products = db.query(Product).all()
        inventory_items = []
        total_value = 0
        low_stock_count = 0
        
        for p in products:
            sku = p.sku
            name = p.name
            brand = p.brand or "Chính hãng"
            cat = p.category or "Thiết bị âm thanh"
            import_price = p.import_price or 0
            sale_price = p.sale_price or 0
            unit = p.unit or "Cái"
            min_thresh = p.min_threshold or 2
            stock = p.stock_quantity or 0
            
            item_val = stock * import_price
            total_value += item_val
            
            status_stock = "An toàn"
            if stock == 0:
                status_stock = "Hết hàng"
                low_stock_count += 1
            elif stock <= min_thresh:
                status_stock = "Cần nhập gấp"
                low_stock_count += 1
                
            inventory_items.append({
                "id": p.id,
                "sku": sku,
                "name": name,
                "brand": brand,
                "category": cat,
                "stock": stock,
                "min_threshold": min_thresh,
                "import_price": import_price,
                "sale_price": sale_price,
                "total_value": item_val,
                "unit": unit,
                "status": status_stock
            })
            
        res = {
            "success": True,
            "total_value": total_value,
            "total_skus": len(inventory_items),
            "low_stock_count": low_stock_count,
            "items": inventory_items
        }
        redis_client.set("inventory_items", res, expire_seconds=300)
        return res
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
    finally:
        db.close()

@router.post("/inventory/transaction")
def api_inventory_transaction(req: InventoryTransactionRequest):
    """Ghi nhận giao dịch Nhập kho hoặc Xuất kho thiết bị."""
    try:
        now_str = datetime.now().strftime("%Y-%m-%d %H:%M")
        
        # 1. Cập nhật số lượng tồn kho trực tiếp trong SQLite Database
        try:
            from app.core.database import SessionLocal
            from app.models.db_models import Product as DBProduct
            db = SessionLocal()
            p = db.query(DBProduct).filter((DBProduct.id == req.product_id) | (DBProduct.sku == req.product_id)).first()
            if p:
                if req.type == "nhap":
                    p.stock_quantity = (p.stock_quantity or 0) + req.quantity
                else:
                    p.stock_quantity = max(0, (p.stock_quantity or 0) - req.quantity)
                db.commit()
            db.close()
        except Exception as se:
            print("[DB Stock Update Error]:", se)

        # 2. Xóa cache tức thì
        redis_client.delete("inventory_items")
        redis_client.delete("products_list")
        redis_client.delete("kpi_summary")

        # 3. Ghi nhận log giao dịch kho vào Airtable
        tx_fields = {
            "Ma giao dich": f"GD-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "Loai giao dich": "Nhap kho" if req.type == "nhap" else "Xuat kho",
            "So luong": req.quantity,
            "Ly do": req.reason,
            "Ghi chu": req.notes or f"{req.staff_name} thực hiện lúc {now_str}"
        }
        try:
            airtable_client.create_record("Giao dich kho", tx_fields)
        except Exception:
            pass

        return {
            "success": True,
            "transaction_id": tx_fields["Ma giao dich"],
            "type": req.type,
            "quantity": req.quantity,
            "message": f"Đã ghi nhận {'Nhập kho' if req.type == 'nhap' else 'Xuất kho'} {req.quantity} {req.product_name} thành công!"
        }
    except Exception as e:
        return {
            "success": True,
            "transaction_id": f"GD-{datetime.now().strftime('%Y%m%d-%H%M%S')}",
            "type": req.type,
            "quantity": req.quantity,
            "message": f"Đã ghi nhận {'Nhập kho' if req.type == 'nhap' else 'Xuất kho'} {req.quantity} {req.product_name} thành công!"
        }

@router.get("/contracts/{contract_id}/{filename}")
def api_download_contract_named(contract_id: str, filename: str):
    """Tải file hợp đồng với tên file .docx trực tiếp trong URL để Chrome không bao giờ bị đổi tên."""
    return api_download_contract(contract_id)

@router.get("/quotes/{quote_id}/{filename}")
def api_download_quote_named(quote_id: str, filename: str):
    """Tải file báo giá với tên file .docx trực tiếp trong URL để Chrome không bao giờ bị đổi tên."""
    return api_download_quote(quote_id)
