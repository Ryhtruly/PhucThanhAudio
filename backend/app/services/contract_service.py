import os
from datetime import datetime
from typing import Dict, Any, List, Optional
from app.services.tax_service import lookup_tax_info
from app.services.number_to_words import number_to_vietnamese_words
from app.services.document_service import generate_contract_document
from app.services.airtable_service import airtable_client
from app.services.zbs_service import zbs_client

def create_contract(
    mst: str,
    phone: str,
    contract_type: str = "Cung cấp thiết bị",
    items: Optional[List[Dict[str, Any]]] = None,
    total_amount: Optional[int] = None,
    payment_terms: str = "Thanh toán 50% khi ký HĐ, 50% sau khi bàn giao nghiệm thu.",
    delivery_date: str = "Trong vòng 05 ngày kể từ ngày ký",
    warranty_months: int = 24,
    special_terms: str = "Bảo hành 1 đổi 1 trong 30 ngày đầu tiên nếu có lỗi kỹ thuật từ nhà sản xuất.",
    sales_rep: str = "Nguyễn Văn Tuấn",
    send_zbs: bool = False,
    company_name: Optional[str] = None
) -> Dict[str, Any]:
    # 1. Tra MST tự động từ VietQR API
    tax_info = lookup_tax_info(mst)
    if tax_info.get("success") and tax_info.get("company_name"):
        company_name = tax_info.get("company_name")
    elif not company_name:
        company_name = "Khách hàng"
    address = tax_info.get("address", "")
    representative = tax_info.get("representative", "")
    
    # 2. Xử lý sản phẩm & giá trị
    items = items or []
    subtotal = 0
    item_rows = []
    
    for i, it in enumerate(items[:5], 1):
        name = it.get("name", f"Thiết bị âm thanh {i}")
        unit = it.get("unit", "Cái")
        qty = int(it.get("quantity", 1))
        price = int(it.get("price", 0))
        total = qty * price
        subtotal += total
        item_rows.append({
            "idx": i,
            "name": name,
            "unit": unit,
            "qty": qty,
            "price": price,
            "total": total
        })
        
    if total_amount and total_amount > 0:
        subtotal = total_amount
        
    vat = int(round(subtotal * 0.1))
    grand_total = subtotal + vat
    words = number_to_vietnamese_words(grand_total)
    
    # 3. Sinh mã hợp đồng
    now = datetime.now()
    contract_id = f"HD-{now.strftime('%Y%m')}-{now.strftime('%d%H%M')}"
    today_str = now.strftime("%d/%m/%Y")
    
    # 4. Map placeholders
    placeholders = {
        "{{CONTRACT_ID}}": contract_id,
        "{{CONTRACT_DATE}}": today_str,
        "{{CONTRACT_TYPE}}": contract_type,
        "{{BUYER_COMPANY_NAME}}": company_name,
        "{{BUYER_MST}}": mst,
        "{{BUYER_ADDRESS}}": address,
        "{{BUYER_REPRESENTATIVE}}": representative or company_name,
        "{{BUYER_POSITION}}": "Giám đốc / Đại diện pháp luật",
        "{{BUYER_PHONE}}": phone,
        "{{PAYMENT_TERMS}}": payment_terms,
        "{{DELIVERY_DATE}}": delivery_date,
        "{{WARRANTY_MONTHS}}": str(warranty_months),
        "{{SPECIAL_TERMS}}": special_terms,
        "{{SALES_REPRESENTATIVE}}": sales_rep,
        "{{TOTAL_BEFORE_VAT}}": f"{subtotal:,.0f} đ".replace(",", "."),
        "{{TOTAL_VAT}}": f"{vat:,.0f} đ".replace(",", "."),
        "{{TOTAL_AMOUNT}}": f"{grand_total:,.0f} đ".replace(",", "."),
        "{{CONTRACT_VALUE}}": f"{grand_total:,.0f} đ".replace(",", "."),
        "{{CONTRACT_VALUE_TEXT}}": words
    }
    
    # Fill items (up to 5 items)
    for i in range(1, 6):
        if i <= len(item_rows):
            it = item_rows[i-1]
            placeholders[f"{{{{ITEM_{i}_NAME}}}}"] = it["name"]
            placeholders[f"{{{{ITEM_{i}_UNIT}}}}"] = it["unit"]
            placeholders[f"{{{{ITEM_{i}_QTY}}}}"] = str(it["qty"])
            placeholders[f"{{{{ITEM_{i}_PRICE}}}}"] = f"{it['price']:,.0f} đ".replace(",", ".")
            placeholders[f"{{{{ITEM_{i}_TOTAL}}}}"] = f"{it['total']:,.0f} đ".replace(",", ".")
        else:
            placeholders[f"{{{{ITEM_{i}_NAME}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_UNIT}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_QTY}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_PRICE}}}}"] = ""
            placeholders[f"{{{{ITEM_{i}_TOTAL}}}}"] = ""

    # 5. Sinh file Word
    file_path = generate_contract_document(placeholders)
    
    # 6. Tìm hoặc tạo Khách hàng trên Airtable
    cust = airtable_client.find_customer_by_mst(mst) or airtable_client.find_customer_by_phone(phone)
    cust_id = cust["id"] if cust else None
    
    if not cust_id:
        cust_rec = airtable_client.create_record("Khach hang", {
            "Ten cong ty": company_name,
            "Ten nguoi lien he": representative or company_name,
            "So dien thoai": phone,
            "Ma so thue MST": mst,
            "Dia chi": address,
            "Nguoi dai dien": representative,
            "Loai KH": "Cong ty"
        })
        if cust_rec:
            cust_id = cust_rec["id"]

    # 7. Lưu Hợp đồng lên Airtable
    hd_fields = {
        "Ma HD": contract_id,
        "Loai HD": "Cung cap thiet bi",
        "Gia tri HD": grand_total,
        "Ngay ky": now.strftime("%Y-%m-%d"),
        "Thoi han BH thang": warranty_months,
        "Trang thai": "Cho ky",
        "Nguoi ky KH": representative or company_name,
        "MST KH": mst,
        "Ghi chu": f"Tự động tạo từ MST {mst}. File: {os.path.basename(file_path)}"
    }
    if cust_id:
        hd_fields["Khach hang"] = [cust_id]
        
    # Tìm nhân viên phụ trách
    staffs = airtable_client.list_staff()
    sales_match = [s["id"] for s in staffs if sales_rep.lower() in s.get("fields", {}).get("Ten", "").lower()]
    if sales_match:
        hd_fields["Sales phu trach"] = [sales_match[0]]
        
    created_hd = airtable_client.create_record("Hop dong", hd_fields)
    
    # Lưu vào SQLite DB
    try:
        from app.core.database import SessionLocal
        from app.models.db_models import Contract as DBContract
        db = SessionLocal()
        db_c = DBContract(
            id=created_hd.get("id") if created_hd else f"hd_{contract_id}",
            contract_code=contract_id,
            customer_id=cust_id,
            contract_type=contract_type,
            company_name=company_name,
            tax_id=mst,
            address=address,
            representative=representative or company_name,
            phone=phone,
            total_amount=subtotal,
            vat_amount=vat,
            grand_total=grand_total,
            payment_terms=payment_terms,
            delivery_date=delivery_date,
            warranty_months=warranty_months,
            special_terms=special_terms,
            status="Cho ky"
        )
        db.merge(db_c)
        db.commit()
        db.close()
    except Exception as e:
        print("[DB Sync Contract Error]:", e)
    
    # 8. Gửi tin ZBS nếu được kích hoạt
    zbs_res = None
    if send_zbs:
        zbs_data = {
            "customer_name": company_name,
            "date": today_str,
            "order_code": contract_id,
            "money": f"{grand_total:,.0f} đ",
            "service": contract_type
        }
        zbs_res = zbs_client.send_template(phone, "584044", zbs_data)
        
    return {
        "success": True,
        "contract_id": contract_id,
        "company_name": company_name,
        "mst": mst,
        "grand_total": grand_total,
        "grand_total_words": words,
        "file_path": file_path,
        "airtable_id": created_hd.get("id") if created_hd else None,
        "zbs_status": zbs_res
    }
