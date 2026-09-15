import os
from datetime import datetime, timedelta
from typing import Dict, Any, List, Optional
from app.services.number_to_words import number_to_vietnamese_words
from app.services.document_service import generate_quote_document
from app.services.airtable_service import airtable_client
from app.services.zbs_service import zbs_client

def create_quote(
    company_name: str,
    contact_name: str,
    phone: str,
    email: str = "",
    project_name: str = "Trang bị hệ thống âm thanh",
    items: Optional[List[Dict[str, Any]]] = None,
    include_vat: bool = True,
    sales_rep: str = "Nguyễn Văn Tuấn",
    delivery_notes: str = "Giao hàng và lắp đặt tận nơi trong vòng 03 ngày làm việc.",
    warranty_notes: str = "Bảo hành chính hãng 24 tháng theo tiêu chuẩn nhà sản xuất.",
    payment_notes: str = "Tạm ứng 40% khi đặt hàng, 60% sau khi nghiệm thu bàn giao.",
    special_notes: str = "Báo giá áp dụng chiết khấu đặc biệt cho dự án Phúc Thanh Audio.",
    send_zbs: bool = False
) -> Dict[str, Any]:
    items = items or []
    now = datetime.now()
    valid_until = now + timedelta(days=30)
    quote_id = f"BG-{now.strftime('%Y%m')}-{now.strftime('%d%H%M')}"
    
    # 1. Tính toán chi tiết các dòng sản phẩm
    subtotal = 0
    item_rows = []
    
    for i, it in enumerate(items[:7], 1):
        name = it.get("name", f"Thiết bị âm thanh {i}")
        brand = it.get("brand", "Chính hãng")
        unit = it.get("unit", "Cái")
        qty = int(it.get("quantity", 1))
        price = int(it.get("price", 0))
        total = qty * price
        subtotal += total
        item_rows.append({
            "idx": i,
            "name": name,
            "brand": brand,
            "unit": unit,
            "qty": qty,
            "price": price,
            "total": total,
            "product_id": it.get("product_id")
        })
        
    vat = int(round(subtotal * 0.1)) if include_vat else 0
    grand_total = subtotal + vat
    words = number_to_vietnamese_words(grand_total)
    
    # 2. Chuẩn bị placeholders
    placeholders = {
        "{{QUOTE_ID}}": quote_id,
        "{{QUOTE_DATE}}": now.strftime("%d/%m/%Y"),
        "{{QUOTE_VALID_UNTIL}}": valid_until.strftime("%d/%m/%Y"),
        "{{BUYER_COMPANY_NAME}}": company_name,
        "{{BUYER_CONTACT_NAME}}": contact_name,
        "{{BUYER_PHONE}}": phone,
        "{{BUYER_EMAIL}}": email,
        "{{PROJECT_NAME}}": project_name,
        "{{DELIVERY_NOTES}}": delivery_notes,
        "{{WARRANTY_NOTES}}": warranty_notes,
        "{{PAYMENT_NOTES}}": payment_notes,
        "{{SPECIAL_NOTES}}": special_notes,
        "{{SALES_REPRESENTATIVE}}": sales_rep,
        "{{TOTAL_BEFORE_VAT}}": f"{subtotal:,.0f} đ".replace(",", "."),
        "{{TOTAL_VAT}}": f"{vat:,.0f} đ".replace(",", "."),
        "{{TOTAL_AMOUNT}}": f"{grand_total:,.0f} đ".replace(",", "."),
        "{{TOTAL_AMOUNT_TEXT}}": words
    }
    
    for i in range(1, 8):
        if i <= len(item_rows):
            it = item_rows[i-1]
            placeholders[f"{{{{ITEM_{i}_NAME}}}}"] = it["name"]
            placeholders[f"{{{{ITEM_{i}_BRAND}}}}"] = it["brand"]
            placeholders[f"{{{{ITEM_{i}_UNIT}}}}"] = it["unit"]
            placeholders[f"{{{{ITEM_{i}_QTY}}}}"] = str(it["qty"])
            placeholders[f"{{{{ITEM_{i}_PRICE}}}}"] = f"{it['price']:,.0f} đ".replace(",", ".")
            placeholders[f"{{{{ITEM_{i}_TOTAL}}}}"] = f"{it['total']:,.0f} đ".replace(",", ".")
        else:
            placeholders[f"{{{{ITEM_{i}_NAME}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_BRAND}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_UNIT}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_QTY}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_PRICE}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_TOTAL}}}}"] = ""

    # 3. Sinh file Word
    file_path = generate_quote_document(placeholders)
    
    # 4. Tìm hoặc tạo Khách hàng
    cust = airtable_client.find_customer_by_phone(phone)
    cust_id = cust["id"] if cust else None
    if not cust_id:
        cust_rec = airtable_client.create_record("Khach hang", {
            "Ten cong ty": company_name,
            "Ten nguoi lien he": contact_name,
            "So dien thoai": phone,
            "Email": email,
            "Loai KH": "Cong ty"
        })
        if cust_rec:
            cust_id = cust_rec["id"]

    # 5. Lưu Báo giá Airtable
    bg_fields = {
        "Ma BG": quote_id,
        "Ten du an": project_name,
        "Ngay gui KH": now.strftime("%Y-%m-%d"),
        "Han hieu luc": valid_until.strftime("%Y-%m-%d"),
        "Co VAT": include_vat,
        "Trang thai": "Da gui",
        "Ghi chu": f"Tổng cộng: {grand_total:,.0f}đ. File: {os.path.basename(file_path)}"
    }
    if cust_id:
        bg_fields["Khach hang"] = [cust_id]
        
    staffs = airtable_client.list_staff()
    sales_match = [s["id"] for s in staffs if sales_rep.lower() in s.get("fields", {}).get("Ten", "").lower()]
    if sales_match:
        bg_fields["Sales phu trach"] = [sales_match[0]]
        
    created_bg = airtable_client.create_record("Bao gia", bg_fields)
    bg_id = created_bg.get("id") if created_bg else None
    
    # 6. Lưu Chi tiết Báo giá
    if bg_id:
        ct_records = []
        for it in item_rows:
            ct_fields = {
                "Ten SP override": it["name"],
                "So luong": it["qty"],
                "Don gia": it["price"],
                "Bao gia": [bg_id]
            }
            if it.get("product_id"):
                ct_fields["San pham"] = [it["product_id"]]
            ct_records.append(ct_fields)
        airtable_client.create_records("Chi tiet Bao gia", ct_records)
        
    # Lưu vào SQLite DB
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Quote as DBQuote, QuoteItem as DBQuoteItem
        db = SessionLocal()
        db_q = DBQuote(
            id=bg_id or f"bg_{quote_id}",
            quote_code=quote_id,
            customer_id=cust_id,
            project_name=project_name,
            company_name=company_name,
            contact_name=contact_name,
            phone=phone,
            email=email,
            subtotal=subtotal,
            vat_amount=vat,
            grand_total=grand_total,
            include_vat=include_vat,
            status="Da gui",
            valid_until=valid_until.strftime("%Y-%m-%d")
        )
        db.merge(db_q)
        for it in item_rows:
            db_item = DBQuoteItem(
                quote_id=bg_id or f"bg_{quote_id}",
                product_name=it.get("name", "Thiết bị"),
                brand=it.get("brand", "Chính hãng"),
                unit=it.get("unit", "Cái"),
                quantity=it.get("qty", 1),
                unit_price=it.get("price", 0),
                total_price=it.get("total", 0)
            )
            db.add(db_item)
        db.commit()
        db.close()
    except Exception as e:
        print("[DB Sync Quote Error]:", e)
        
    # 7. Gửi tin ZBS nếu được kích hoạt
    zbs_res = None
    if send_zbs:
        zbs_data = {
            "name": contact_name,
            "price": f"{grand_total:,.0f} đ",
            "code": quote_id
        }
        zbs_res = zbs_client.send_template(phone, "422511", zbs_data)

    return {
        "success": True,
        "quote_id": quote_id,
        "company_name": company_name,
        "subtotal": subtotal,
        "vat": vat,
        "grand_total": grand_total,
        "grand_total_words": words,
        "file_path": file_path,
        "airtable_id": bg_id,
        "zbs_status": zbs_res
    }
