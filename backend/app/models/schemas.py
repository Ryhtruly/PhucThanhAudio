from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any

class TaxLookupRequest(BaseModel):
    mst: str = Field(..., description="Mã số thuế doanh nghiệp")

class QuoteItemSchema(BaseModel):
    name: str
    brand: Optional[str] = "Chính hãng"
    unit: Optional[str] = "Cái"
    quantity: int = 1
    price: int = 0
    discount: Optional[int] = 0
    discount_percent: Optional[float] = 0
    chiet_khau: Optional[int] = 0
    ck: Optional[int] = 0
    product_id: Optional[str] = None

class ContractCreateRequest(BaseModel):
    mst: str
    phone: str
    contract_type: Optional[str] = "Cung cấp thiết bị"
    total_amount: Optional[int] = 0
    include_vat: Optional[bool] = True
    price_includes_vat: Optional[bool] = False
    items: Optional[List[QuoteItemSchema]] = []
    payment_terms: Optional[str] = "Thanh toán 50% khi ký HĐ, 50% sau khi bàn giao nghiệm thu."
    delivery_date: Optional[str] = "Trong vòng 05 ngày kể từ ngày ký"
    warranty_months: Optional[int] = 24
    special_terms: Optional[str] = "Bảo hành 1 đổi 1 trong 30 ngày đầu tiên nếu có lỗi kỹ thuật."
    sales_rep: Optional[str] = "Nguyễn Văn Tuấn"
    send_zbs: Optional[bool] = False
    company_name: Optional[str] = None

class QuoteCreateRequest(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    email: Optional[str] = ""
    project_name: Optional[str] = "Trang bị hệ thống âm thanh Phúc Thanh"
    items: List[QuoteItemSchema]
    include_vat: Optional[bool] = True
    discount: Optional[int] = 0
    discount_percent: Optional[float] = 0
    chiet_khau: Optional[int] = 0
    ck: Optional[int] = 0
    sales_rep: Optional[str] = "Nguyễn Văn Tuấn"
    delivery_notes: Optional[str] = "Giao hàng và lắp đặt tận nơi trong vòng 03 ngày làm việc."
    warranty_notes: Optional[str] = "Bảo hành chính hãng 24 tháng theo tiêu chuẩn nhà sản xuất."
    payment_notes: Optional[str] = "Tạm ứng 40% khi đặt hàng, 60% sau khi nghiệm thu bàn giao."
    special_notes: Optional[str] = "Báo giá áp dụng chiết khấu đặc biệt cho dự án."
    send_zbs: Optional[bool] = False

class LeadCreateRequest(BaseModel):
    company_name: str
    contact_name: str
    phone: str
    email: Optional[str] = ""
    source: Optional[str] = "Web form"
    demand: Optional[str] = ""
    estimated_value: Optional[int] = 0
    sales_rep: Optional[str] = "Nguyễn Văn Tuấn"

class WarrantyCreateRequest(BaseModel):
    device_name: str
    model: str
    serial: str
    error_desc: str
    phone: str
    customer_name: str
    urgency: Optional[str] = "Thuong"
    source: Optional[str] = "Zalo"
    ktv_name: Optional[str] = "Trần Minh Đức"
    send_zbs: Optional[bool] = False

class ZBSSendRequest(BaseModel):
    phone: str
    template_id: str
    template_data: Dict[str, Any]
    scheduled_time: Optional[str] = None

class LeadStageUpdateRequest(BaseModel):
    stage: str = Field(..., description="Trạng thái pipeline mới (New, Qualified, Dam phan, Won, Lost)")


class AudioIntakeSubmitRequest(BaseModel):
    customer_name: str = Field(..., description="Tên đơn vị, quán, doanh nghiệp hoặc cá nhân")
    contact_name: str = Field(..., description="Người đại diện / phụ trách liên hệ")
    phone: str = Field(..., description="Số điện thoại / Zalo")
    email: Optional[str] = ""
    tax_id: Optional[str] = None
    address: Optional[str] = ""
    package_id: str = Field(..., description="Gói giải pháp (karaoke_vip, hoi_truong, bar_club, pa_cafe)")
    package_name: str = Field(..., description="Tên gói giải pháp")
    solution_type: str = Field(..., description="Hạng mục giải pháp chi tiết")
    scale_info: Optional[str] = ""
    preferred_brand: Optional[str] = "Chính hãng (SR Italy, LSS, Crown, JBL)"
    estimated_budget: Optional[int] = 0
    source: Optional[str] = "Web Intake Form"
    notes: Optional[str] = ""


# ==========================================
# NV6: KHO THIẾT BỊ & CẢNH BÁO TỒN KHO
# ==========================================
class InventoryTransactionRequest(BaseModel):
    product_id: str = Field(..., description="Mã sản phẩm / SKU hoặc ID Airtable")
    product_name: str = Field(..., description="Tên thiết bị")
    type: str = Field(..., description="Loại giao dịch: 'nhap' (Nhập kho) hoặc 'xuat' (Xuất kho)")
    quantity: int = Field(..., ge=1, description="Số lượng")
    reason: str = Field(..., description="Lý do nhập/xuất (Lắp đặt dự án, Nhập hàng mới, Xuất bảo hành, v.v.)")
    staff_name: Optional[str] = "Thủ kho Nguyễn Văn Nam"
    notes: Optional[str] = ""

class ProductCreateRequest(BaseModel):
    name: str = Field(..., description="Tên thiết bị / sản phẩm")
    brand: Optional[str] = Field("Chính hãng", description="Thương hiệu (SR Italy, LSS, Verity Audio, Crown...)")
    category: Optional[str] = Field("Loa", description="Phân loại thiết bị (Loa, Cục đẩy, Vang số, Micro, Mixer...)")
    unit: Optional[str] = Field("Cái", description="Đơn vị tính (Cái, Cặp, Bộ)")
    sale_price: int = Field(..., ge=0, description="Đơn giá bán ra (VNĐ)")
    import_price: Optional[int] = Field(0, ge=0, description="Giá vốn / giá nhập (VNĐ)")
    stock_quantity: Optional[int] = Field(5, ge=0, description="Số lượng tồn kho ban đầu")
    min_threshold: Optional[int] = Field(2, ge=0, description="Ngưỡng cảnh báo tồn tối thiểu")
    specs: Optional[str] = Field("", description="Thông số kỹ thuật / ghi chú")

