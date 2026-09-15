from sqlalchemy import Column, Integer, String, Text, Boolean, Float, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime
from app.core.database import Base

class Staff(Base):
    __tablename__ = "staff"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    role = Column(String, default="Sales")
    email = Column(String, default="")
    phone = Column(String, default="")
    telegram_id = Column(String, default="")
    zalo_id = Column(String, default="")
    status = Column(String, default="Dang lam viec")

class Customer(Base):
    __tablename__ = "customers"

    id = Column(String, primary_key=True, index=True)
    company_name = Column(String, nullable=False)
    contact_name = Column(String, default="")
    phone = Column(String, index=True, default="")
    email = Column(String, default="")
    tax_id = Column(String, index=True, default="")
    address = Column(Text, default="")
    representative = Column(String, default="")
    customer_type = Column(String, default="Cong ty")
    region = Column(String, default="TP.HCM")
    notes = Column(Text, default="")
    assigned_staff_id = Column(String, ForeignKey("staff.id"), nullable=True)

class Product(Base):
    __tablename__ = "products"

    id = Column(String, primary_key=True, index=True)
    sku = Column(String, unique=True, index=True, nullable=False)
    name = Column(String, nullable=False)
    brand = Column(String, default="Chính hãng")
    category = Column(String, default="Loa")
    unit = Column(String, default="Cai")
    import_price = Column(Integer, default=0)
    sale_price = Column(Integer, default=0)
    stock_quantity = Column(Integer, default=5)
    min_threshold = Column(Integer, default=2)
    specs = Column(Text, default="")
    status = Column(String, default="Dang kinh doanh")

class Lead(Base):
    __tablename__ = "leads"

    id = Column(String, primary_key=True, index=True)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    company_name = Column(String, nullable=False)
    contact_name = Column(String, default="")
    phone = Column(String, default="")
    email = Column(String, default="")
    source = Column(String, default="Web form")
    demand = Column(Text, default="")
    region = Column(String, default="TP.HCM")
    stage = Column(String, default="New") # New, Qualified, Dam phan, Won, Lost
    lead_score = Column(Integer, default=70)
    estimated_value = Column(Integer, default=0)
    actual_value = Column(Integer, default=0)
    assigned_staff_id = Column(String, ForeignKey("staff.id"), nullable=True)
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class Quote(Base):
    __tablename__ = "quotes"

    id = Column(String, primary_key=True, index=True)
    quote_code = Column(String, index=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True)
    project_name = Column(String, default="Trang bị hệ thống âm thanh")
    company_name = Column(String, default="")
    contact_name = Column(String, default="")
    phone = Column(String, default="")
    email = Column(String, default="")
    subtotal = Column(Integer, default=0)
    vat_amount = Column(Integer, default=0)
    grand_total = Column(Integer, default=0)
    include_vat = Column(Boolean, default=True)
    status = Column(String, default="Da gui")
    valid_until = Column(String, default="")
    notes = Column(Text, default="")
    assigned_staff_id = Column(String, ForeignKey("staff.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

    items = relationship("QuoteItem", back_populates="quote", cascade="all, delete-orphan")

class QuoteItem(Base):
    __tablename__ = "quote_items"

    id = Column(Integer, primary_key=True, autoincrement=True)
    quote_id = Column(String, ForeignKey("quotes.id"), nullable=False)
    product_id = Column(String, nullable=True)
    product_name = Column(String, nullable=False)
    brand = Column(String, default="Chính hãng")
    unit = Column(String, default="Cái")
    quantity = Column(Integer, default=1)
    unit_price = Column(Integer, default=0)
    total_price = Column(Integer, default=0)

    quote = relationship("Quote", back_populates="items")

class Contract(Base):
    __tablename__ = "contracts"

    id = Column(String, primary_key=True, index=True)
    contract_code = Column(String, index=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    quote_id = Column(String, ForeignKey("quotes.id"), nullable=True)
    lead_id = Column(String, ForeignKey("leads.id"), nullable=True)
    contract_type = Column(String, default="Cung cap thiet bi")
    company_name = Column(String, default="")
    tax_id = Column(String, default="")
    address = Column(Text, default="")
    representative = Column(String, default="")
    phone = Column(String, default="")
    total_amount = Column(Integer, default=0)
    vat_amount = Column(Integer, default=0)
    grand_total = Column(Integer, default=0)
    payment_terms = Column(Text, default="Thanh toán 50% khi ký HĐ, 50% sau khi bàn giao nghiệm thu.")
    delivery_date = Column(String, default="Trong vòng 05 ngày kể từ ngày ký")
    warranty_months = Column(Integer, default=24)
    special_terms = Column(Text, default="")
    status = Column(String, default="Cho ky")
    assigned_staff_id = Column(String, ForeignKey("staff.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class WarrantyTicket(Base):
    __tablename__ = "warranty_tickets"

    id = Column(String, primary_key=True, index=True)
    ticket_code = Column(String, unique=True, index=True, nullable=False)
    customer_id = Column(String, ForeignKey("customers.id"), nullable=True)
    contract_id = Column(String, ForeignKey("contracts.id"), nullable=True)
    device_name = Column(String, nullable=False)
    model = Column(String, default="")
    serial_number = Column(String, default="")
    error_desc = Column(Text, default="")
    customer_name = Column(String, default="")
    phone = Column(String, default="")
    urgency = Column(String, default="Thuong")
    status = Column(String, default="Dang xu ly")
    source = Column(String, default="Zalo")
    under_warranty = Column(Boolean, default=True)
    assigned_ktv_id = Column(String, ForeignKey("staff.id"), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)

class InventoryTransaction(Base):
    __tablename__ = "inventory_transactions"

    id = Column(String, primary_key=True, index=True)
    tx_code = Column(String, unique=True, index=True, nullable=False)
    product_id = Column(String, ForeignKey("products.id"), nullable=True)
    product_sku = Column(String, default="")
    product_name = Column(String, default="")
    tx_type = Column(String, default="nhap") # nhap, xuat
    quantity = Column(Integer, default=1)
    unit_price = Column(Integer, default=0)
    reason = Column(String, default="")
    staff_name = Column(String, default="Thủ kho")
    notes = Column(Text, default="")
    created_at = Column(DateTime, default=datetime.utcnow)

class KPIMonthlyReport(Base):
    __tablename__ = "kpi_monthly_reports"

    id = Column(Integer, primary_key=True, autoincrement=True)
    period_name = Column(String, nullable=False) # Tháng 4, Tháng 5, ...
    period_order = Column(Integer, default=1)
    report_type = Column(String, default="Thang")
    revenue = Column(Integer, default=0)
    target_revenue = Column(Integer, default=300000000)
    won_deals_count = Column(Integer, default=0)
    new_leads_count = Column(Integer, default=0)
    quotes_sent_count = Column(Integer, default=0)
    conversion_rate = Column(Float, default=0.0)
    content_summary = Column(Text, default="")

class SolutionPackage(Base):
    __tablename__ = "solution_packages"

    id = Column(String, primary_key=True, index=True)
    name = Column(String, nullable=False)
    badge = Column(String, default="")
    description = Column(Text, default="")
    services_json = Column(Text, default="[]") # JSON encoded services list
