import PublicIntakePage from './pages/PublicIntakePage';
import React, { useState, useEffect } from 'react';
import { Trash2, Lock, Mail, LogOut, Eye, EyeOff } from 'lucide-react';

import { API_BASE, APP_TITLE, APP_SUBTITLE, COMPANY_NAME, COMPANY_ADDRESS, HOTLINE, ZALO_URL, getPublicIntakeUrl } from './config';

const BRANDS = [
  "LSS Advanced Speakers", "SR Made in Italy", "Studiomaster",
  "Precision Drive", "AKS Format Studio", "VERITY Audio",
  "Partyhouse", "Maingo", "VietK", "CMX", "Fonestar", "VPK"
];

const DEFAULT_ACCOUNT = {
  id: 'admin',
  name: 'Phúc Thanh Audio',
  role: 'Quản Trị Viên',
  email: 'admin@phucthanhaudio.vn',
  avatar: 'PT'
};

export default function App() {
  // Public Intake Route Routing (/intake)
  const isIntakeRoute = window.location.pathname === '/intake' ||
    window.location.pathname.startsWith('/intake') ||
    window.location.search.includes('intake');
  if (isIntakeRoute) {
    return <PublicIntakePage />;
  }

  // Authentication State (Chỉ 1 tài khoản quản trị)
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      const saved = localStorage.getItem('phucthanh_user_session');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (!parsed.avatar || parsed.avatar === '👑' || parsed.avatar === '👤') {
          parsed.avatar = 'PT';
        }
        return parsed;
      }
      return null;
    } catch {
      return null;
    }
  });
  const [loginForm, setLoginForm] = useState({
    email: '',
    password: ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loginError, setLoginError] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const handleLogin = (e) => {
    if (e) e.preventDefault();
    setLoginError('');

    const inputEmail = (loginForm.email || '').trim().toLowerCase();
    const inputPass = (loginForm.password || '').trim();

    if (!inputEmail || !inputPass) {
      setLoginError('Vui lòng nhập đầy đủ Email và Mật khẩu!');
      return;
    }

    setLoginLoading(true);

    setTimeout(() => {
      // Kiểm tra thông tin đăng nhập
      const isValidEmail = inputEmail === 'admin@phucthanhaudio.vn' || inputEmail === 'admin';
      const isValidPassword = inputPass === 'PhucThanh@2026' || inputPass === 'admin123';

      if (!isValidEmail || !isValidPassword) {
        setLoginLoading(false);
        setLoginError('Email hoặc mật khẩu không chính xác! Vui lòng thử lại.');
        return;
      }

      const user = {
        ...DEFAULT_ACCOUNT,
        email: 'admin@phucthanhaudio.vn'
      };
      setCurrentUser(user);
      localStorage.setItem('phucthanh_user_session', JSON.stringify(user));
      setLoginLoading(false);
      showToast(`Đăng nhập thành công: ${user.name}!`);
    }, 350);
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('phucthanh_user_session');
    showToast('Đã đăng xuất khỏi hệ thống');
  };

  const [activeTab, setActiveTab] = useState('dashboard');
  const [kpiData, setKpiData] = useState(null);
  const [products, setProducts] = useState([]);
  const [contracts, setContracts] = useState([]);
  const [quotes, setQuotes] = useState([]);
  const [leads, setLeads] = useState([]);
  const [warranties, setWarranties] = useState([]);

  const [intakePackages, setIntakePackages] = useState([]);
  const [selectedPkgId, setSelectedPkgId] = useState('karaoke_vip');
  const [selectedSolution, setSelectedSolution] = useState(null);
  const [intakeTaxSearching, setIntakeTaxSearching] = useState(false);
  const [intakeSuccessResult, setIntakeSuccessResult] = useState(null);
  const [intakeForm, setIntakeForm] = useState({
    customer_name: '',
    contact_name: '',
    phone: '',
    email: '',
    tax_id: '',
    address: '',
    scale_info: '',
    preferred_brand: '',
    estimated_budget: 0,
    source: 'Web Intake Form',
    notes: ''
  });

  // Kanban Drag & Drop State
  const [draggedLeadId, setDraggedLeadId] = useState(null);
  const [dragOverCol, setDragOverCol] = useState(null);
  const [leadSearch, setLeadSearch] = useState('');
  const [showNewLeadModal, setShowNewLeadModal] = useState(false);
  const [showPipelineQrModal, setShowPipelineQrModal] = useState(false);
  const [newLeadForm, setNewLeadForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    demand: '',
    estimated_value: 50000000,
    source: 'Web form',
    sales_rep: 'Nguyễn Văn Tuấn'
  });
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Quote Studio State
  const [quoteForm, setQuoteForm] = useState({
    company_name: '',
    contact_name: '',
    phone: '',
    email: '',
    project_name: '',
    include_vat: true,
    send_zbs: true,
    items: []
  });

  // Contract Wizard State
  const [createdContract, setCreatedContract] = useState(null);
  const [contractForm, setContractForm] = useState({
    mst: '',
    phone: '',
    company_name: '',
    address: '',
    contract_type: 'Cung cấp thiết bị âm thanh',
    total_amount: 0,
    warranty_months: 24,
    send_zbs: true
  });
  const [mstSearching, setMstSearching] = useState(false);

  // ZBS Manager State
  const [zbsForm, setZbsForm] = useState({
    phone: '',
    template_id: '584044',
    customer_name: '',
    order_code: '',
    money: '',
    service: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Helper download file chuẩn định dạng Word .docx qua Blob & RFC headers
  const triggerDownload = async (url, filename) => {
    const finalFilename = filename.endsWith('.docx') ? filename : `${filename}.docx`;
    showToast(`Đang chuẩn bị tải file Word: ${finalFilename}...`);

    // Chuẩn hóa đường dẫn tương đối (relative URL) để tránh lỗi CORS và mất thuộc tính download
    let fetchUrl = url;
    if (fetchUrl.startsWith('http://127.0.0.1:8000')) {
      fetchUrl = fetchUrl.replace('http://127.0.0.1:8000', '');
    } else if (fetchUrl.startsWith('http://localhost:8000')) {
      fetchUrl = fetchUrl.replace('http://localhost:8000', '');
    }

    try {
      const response = await fetch(fetchUrl);
      if (!response.ok) {
        throw new Error(`Tải file thất bại với mã trạng thái: ${response.status}`);
      }
      const rawBlob = await response.blob();

      // Tạo Blob chuẩn MIME type của Microsoft Word DOCX
      const docxBlob = new Blob([rawBlob], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Tạo Blob URL cục bộ và kích hoạt tải về với tên file .docx chuẩn xác
      const blobUrl = window.URL.createObjectURL(docxBlob);
      const link = document.createElement('a');
      link.href = blobUrl;
      link.download = finalFilename;
      link.setAttribute('download', finalFilename);
      document.body.appendChild(link);
      link.click();

      // Dọn dẹp DOM và giải phóng bộ nhớ blob
      setTimeout(() => {
        if (document.body.contains(link)) {
          document.body.removeChild(link);
        }
        window.URL.revokeObjectURL(blobUrl);
      }, 3000);

      showToast(`Đã tải xong: ${finalFilename}!`);
    } catch (err) {
      console.warn('Tải file qua Blob gặp lỗi, kích hoạt phương thức dự phòng direct link:', err);
      // Phương thức dự phòng: direct link
      const directLink = document.createElement('a');
      directLink.href = fetchUrl;
      directLink.download = finalFilename;
      directLink.setAttribute('download', finalFilename);
      document.body.appendChild(directLink);
      directLink.click();
      setTimeout(() => {
        if (document.body.contains(directLink)) {
          document.body.removeChild(directLink);
        }
      }, 1000);
      showToast(`Đang tải file: ${finalFilename}`);
    }
  };


  const fetchInitialData = async () => {
    setLoading(true);
    try {
      const [kpiRes, prodRes, contRes, quotRes, leadRes, warRes] = await Promise.all([
        fetch(`${API_BASE}/kpi/summary`).then(r => r.json()).catch(() => null),
        fetch(`${API_BASE}/products`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/contracts`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/quotes`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/leads`).then(r => r.json()).catch(() => []),
        fetch(`${API_BASE}/warranties`).then(r => r.json()).catch(() => [])
      ]);
      if (kpiRes) setKpiData(kpiRes);
      if (prodRes && Array.isArray(prodRes)) setProducts(prodRes);
      if (contRes && Array.isArray(contRes)) setContracts(contRes);
      if (quotRes && Array.isArray(quotRes)) setQuotes(quotRes);
      if (leadRes && Array.isArray(leadRes)) setLeads(leadRes);
      if (warRes && Array.isArray(warRes)) setWarranties(warRes);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // NV6: Inventory State
  const [inventoryData, setInventoryData] = useState({ total_value: 0, total_skus: 0, low_stock_count: 0, items: [] });
  const [loadingInventory, setLoadingInventory] = useState(false);
  const [invFilter, setInvFilter] = useState('all'); // 'all', 'low_stock'
  const [showTxModal, setShowTxModal] = useState(false);
  const [txForm, setTxForm] = useState({ product_id: '', product_name: '', type: 'nhap', quantity: 1, reason: 'Nhập hàng từ nhà phân phối', staff_name: 'Thủ kho Nguyễn Văn Nam' });

  const fetchInventory = async () => {
    setLoadingInventory(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/items`);
      const data = await res.json();
      if (data && data.success) {
        setInventoryData(data);
      }
    } catch (e) {
      console.error("Lỗi nạp tồn kho:", e);
    } finally {
      setLoadingInventory(false);
    }
  };

  useEffect(() => {
    if (activeTab === 'inventory') {
      fetchInventory();
    }
  }, [activeTab]);

  const handleCreateTx = async () => {
    if (!txForm.product_id) {
      showToast('Vui lòng chọn thiết bị', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/inventory/transaction`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(txForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(data.message || 'Ghi nhận giao dịch kho thành công!');
        setShowTxModal(false);
        fetchInventory();
      } else {
        showToast(data.detail || 'Lỗi ghi nhận kho', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối ghi nhận kho', 'error');
    } finally {
      setLoading(false);
    }
  };


  useEffect(() => {
    fetchInitialData();
  }, []);

  // Kanban Drag & Drop Handlers
  const handleDragStart = (e, leadId) => {
    setDraggedLeadId(leadId);
    e.dataTransfer.setData('text/plain', leadId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, stageId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverCol !== stageId) {
      setDragOverCol(stageId);
    }
  };

  const handleDragLeave = (e, stageId) => {
    if (dragOverCol === stageId) {
      setDragOverCol(null);
    }
  };

  const handleDropLead = async (e, targetStage) => {
    e.preventDefault();
    setDragOverCol(null);
    const leadId = draggedLeadId || e.dataTransfer.getData('text/plain');
    if (!leadId) return;

    const lead = leads.find(l => l.id === leadId);
    if (!lead) return;
    const currentStage = lead.fields?.Stage || 'New';
    if (currentStage === targetStage) return;

    // Optimistic UI Update
    setLeads(prev => prev.map(item =>
      item.id === leadId
        ? { ...item, fields: { ...item.fields, Stage: targetStage } }
        : item
    ));

    const stageNames = {
      'New': 'Lead Mới',
      'Qualified': 'Khảo Sát & Demo',
      'Dam phan': 'Đàm Phán / Báo Giá',
      'Won': 'Ký HĐ Thành Công',
      'Lost': 'Thất Bại / Hủy'
    };

    const compName = lead.fields?.['Ten cty Khach'] || 'Khách hàng';
    showToast(`Đã chuyển "${compName}" sang cột "${stageNames[targetStage] || targetStage}"!`);

    // Call Backend API to sync Airtable
    try {
      const res = await fetch(`${API_BASE}/leads/${leadId}/stage`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ stage: targetStage })
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        showToast('Lỗi cập nhật lên Airtable', 'error');
        fetchInitialData();
      }
    } catch (err) {
      showToast('Lỗi kết nối tới máy chủ cập nhật trạng thái', 'error');
      fetchInitialData();
    }
  };

  const handleCreateNewLead = async () => {
    if (!newLeadForm.company_name.trim() || !newLeadForm.phone.trim()) {
      showToast('Vui lòng nhập Tên công ty và Số điện thoại', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newLeadForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã thêm Lead mới cho ${newLeadForm.company_name}!`);
        setShowNewLeadModal(false);
        setNewLeadForm({
          company_name: '',
          contact_name: '',
          phone: '',
          email: '',
          demand: '',
          estimated_value: 50000000,
          source: 'Web form',
          sales_rep: 'Nguyễn Văn Tuấn'
        });
        fetchInitialData();
      } else {
        showToast(data.error || 'Lỗi thêm Lead mới', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối tạo Lead', 'error');
    } finally {
      setLoading(false);
    }
  };

  // VietQR Tax Lookup
  const handleLookupTax = async () => {
    if (!contractForm.mst) return;
    setMstSearching(true);
    try {
      const res = await fetch(`${API_BASE}/lookup/tax`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mst: contractForm.mst })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setContractForm(prev => ({
          ...prev,
          company_name: data.company_name || '',
          address: data.address || ''
        }));
        showToast(`Đã tìm thấy: ${data.company_name}`);
      } else {
        showToast(data.detail || 'Không tìm thấy MST', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối tra cứu MST', 'error');
    } finally {
      setMstSearching(false);
    }
  };

  // Submit Contract
  const handleCreateContract = async () => {
    if (!contractForm.mst || !contractForm.phone) {
      showToast('Vui lòng nhập MST và Số điện thoại', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/contracts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(contractForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCreatedContract({
          id: data.contract_id,
          filename: `${data.contract_id}.docx`,
          company: contractForm.company_name || 'Khách hàng đối tác',
          amount: contractForm.total_amount || 0
        });
        showToast(`Tạo thành công HĐ ${data.contract_id}! Đang tải file...`);
        fetchInitialData();
        const filename = data.contract_id + '.docx';
        triggerDownload(`/api/v1/contracts/${data.contract_id}/${filename}`, filename);
      } else {
        showToast(data.error || 'Lỗi tạo hợp đồng', 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi yêu cầu tạo hợp đồng', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch Intake Solutions from Backend
  useEffect(() => {
    fetch(`${API_BASE}/intake/solutions`)
      .then(r => r.json())
      .then(data => {
        if (data && data.packages) {
          setIntakePackages(data.packages);
          if (data.packages.length > 0 && !selectedSolution) {
            setSelectedPkgId(data.packages[0].id);
            setSelectedSolution(data.packages[0].services[0]);
          }
        }
      })
      .catch(err => console.error("Error loading intake solutions:", err));
  }, []);

  // VietQR Lookup inside Intake
  const handleIntakeTaxLookup = async () => {
    if (!intakeForm.tax_id) return;
    setIntakeTaxSearching(true);
    try {
      const res = await fetch(`${API_BASE}/lookup/tax`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mst: intakeForm.tax_id.trim() })
      });
      const data = await res.json();
      if (data.success && data.data) {
        setIntakeForm(prev => ({
          ...prev,
          customer_name: data.data.name || prev.customer_name,
          address: data.data.address || prev.address
        }));
        showToast('Đã tra cứu pháp nhân thành công!');
      } else {
        showToast(data.error || 'Không tìm thấy MST', 'error');
      }
    } catch (e) {
      showToast('Lỗi tra cứu MST', 'error');
    } finally {
      setIntakeTaxSearching(false);
    }
  };

  // Submit Intake Form
  const handleSubmitIntake = async () => {
    if (!intakeForm.customer_name.trim() || !intakeForm.phone.trim()) {
      showToast('Vui lòng nhập Tên đơn vị và Số điện thoại', 'error');
      return;
    }
    const currentPkg = intakePackages.find(p => p.id === selectedPkgId) || intakePackages[0];
    const currentSvc = selectedSolution || (currentPkg?.services[0]);

    setLoading(true);
    try {
      const payload = {
        ...intakeForm,
        package_id: currentPkg?.id || 'karaoke_vip',
        package_name: currentPkg?.name || 'Karaoke & VIP Lounge',
        solution_type: currentSvc?.name || 'Dàn Karaoke Kinh Doanh Chuẩn VIP'
      };
      const res = await fetch(`${API_BASE}/intake/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setIntakeSuccessResult(data);
        showToast(`Tiếp nhận thành công mã ${data.tracking_code}!`);
        fetchInitialData();
      } else {
        showToast(data.error || data.detail || 'Lỗi tiếp nhận hồ sơ', 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi hồ sơ Intake', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Add Item to Quote
  const addProductToQuote = (prod) => {
    const f = prod.fields || {};
    const newItem = {
      product_id: prod.id,
      name: f['Ten SP'] || 'Thiết bị âm thanh',
      brand: f['Thuong hieu'] || 'SR Italy',
      unit: f['Don vi tinh'] || 'Cái',
      quantity: 1,
      price: f['Don gia ban'] || 0
    };
    setQuoteForm(prev => ({
      ...prev,
      items: [...prev.items, newItem]
    }));
    showToast(`Đã thêm ${newItem.name}`);
  };

  // Remove Item from Quote
  const removeItemFromQuote = (index) => {
    setQuoteForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  // Submit Quote
  const handleCreateQuote = async () => {
    if (quoteForm.items.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 sản phẩm', 'error');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/quotes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(quoteForm)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        showToast(`Đã sinh Báo giá ISO ${data.quote_id}!`);
        fetchInitialData();
        const filename = data.quote_id + '.docx';
        triggerDownload(`/api/v1/quotes/${data.quote_id}/${filename}`, filename);
      } else {
        showToast(data.error || 'Lỗi tạo báo giá', 'error');
      }
    } catch (e) {
      showToast('Lỗi gửi yêu cầu tạo báo giá', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Send ZBS Test
  const handleSendZBS = async () => {
    setLoading(true);
    try {
      const templateData = {
        customer_name: zbsForm.customer_name,
        date: new Date().toLocaleDateString('vi-VN'),
        order_code: zbsForm.order_code,
        money: zbsForm.money,
        service: zbsForm.service
      };
      const res = await fetch(`${API_BASE}/zbs/send`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          phone: zbsForm.phone,
          template_id: zbsForm.template_id,
          template_data: templateData
        })
      });
      const data = await res.json();
      if (data.success) {
        showToast(`Đã bắn tin Zalo ZBS tới ${zbsForm.phone}!`);
      } else {
        showToast(data.error || 'Không gửi được tin ZBS', 'error');
      }
    } catch (e) {
      showToast('Lỗi kết nối gửi ZBS', 'error');
    } finally {
      setLoading(false);
    }
  };

  const quoteSubtotal = quoteForm.items.reduce((acc, it) => acc + (it.price * it.quantity), 0);
  const quoteVat = quoteForm.include_vat ? Math.round(quoteSubtotal * 0.1) : 0;
  const quoteGrandTotal = quoteSubtotal + quoteVat;

  // Render Login Screen if not authenticated
  if (!currentUser) {
    return (
      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0F172A 0%, #1E293B 50%, #0F172A 100%)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background Ambient Glow */}
        <div style={{
          position: 'absolute',
          top: '-10%',
          left: '50%',
          transform: 'translateX(-50%)',
          width: '600px',
          height: '600px',
          background: 'radial-gradient(circle, rgba(211, 16, 39, 0.18) 0%, rgba(0,0,0,0) 70%)',
          pointerEvents: 'none',
          zIndex: 0
        }} />

        <div style={{
          background: '#FFFFFF',
          maxWidth: 440,
          width: '100%',
          padding: '36px 32px',
          borderRadius: 18,
          boxShadow: '0 20px 40px -8px rgba(0, 0, 0, 0.25)',
          position: 'relative',
          zIndex: 1
        }}>
          {/* Logo Top */}
          <div style={{ textAlign: 'center', marginBottom: 24 }}>
            <div style={{ display: 'inline-block', position: 'relative', marginBottom: 14 }}>
              <img 
                src="/746412010_1444709327687147_3281768804330503498_n.jpg" 
                alt="Phúc Thanh Audio Logo"
                style={{
                  width: 90,
                  height: 90,
                  borderRadius: '50%',
                  objectFit: 'cover',
                  border: '3.5px solid #D31027',
                  boxShadow: '0 8px 24px rgba(211, 16, 39, 0.25)',
                  display: 'block',
                  margin: '0 auto'
                }}
              />
              <span style={{
                position: 'absolute',
                bottom: 3,
                right: 3,
                background: '#10B981',
                width: 16,
                height: 16,
                borderRadius: '50%',
                border: '2.5px solid #FFFFFF'
              }} title="Hệ thống trực tuyến" />
            </div>

            <h2 style={{
              fontSize: 22,
              fontWeight: 900,
              color: '#0F172A',
              letterSpacing: '-0.02em',
              margin: 0
            }}>
              PHÚC THANH <span style={{ color: '#D31027' }}>AUDIO</span>
            </h2>
            <p style={{ fontSize: 13, color: '#64748B', margin: '4px 0 0 0' }}>
              Hệ Thống Quản Trị & Tự Động Hóa Chuyển Đổi Số
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
              <span className="badge badge-red" style={{ fontSize: 10.5 }}>CỔNG ĐĂNG NHẬP NỘI BỘ</span>
              <span className="badge badge-blue" style={{ fontSize: 10.5 }}>AIRTABLE & ZBS ACTIVE</span>
            </div>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            {loginError && (
              <div style={{
                background: '#FEF2F2',
                border: '1px solid #FECACA',
                color: '#DC2626',
                padding: '10px 14px',
                borderRadius: 8,
                fontSize: 12.5,
                display: 'flex',
                alignItems: 'center',
                gap: 8
              }}>
                <span>⚠️</span> {loginError}
              </div>
            )}

            <div>
              <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                Email Quản Trị / Tài Khoản
              </label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="email"
                  required
                  className="input-field"
                  placeholder="name@phucthanhaudio.vn"
                  value={loginForm.email}
                  onChange={e => setLoginForm({...loginForm, email: e.target.value})}
                  style={{ paddingLeft: 38, fontSize: 13.5 }}
                />
                <span style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Mail size={16} />
                </span>
              </div>
            </div>

            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                <label style={{ fontSize: 12, fontWeight: 700, color: '#334155' }}>
                  Mật Khẩu Truy Cập
                </label>
                <span style={{ fontSize: 11.5, color: '#D31027', cursor: 'pointer', fontWeight: 600 }}>
                  Quên mật khẩu?
                </span>
              </div>
              <div style={{ position: 'relative' }}>
                <input 
                  type={showPassword ? 'text' : 'password'}
                  required
                  className="input-field"
                  placeholder="••••••••••••"
                  value={loginForm.password}
                  onChange={e => setLoginForm({...loginForm, password: e.target.value})}
                  style={{ paddingLeft: 38, paddingRight: 40, fontSize: 13.5 }}
                />
                <span style={{
                  position: 'absolute',
                  left: 12,
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#94A3B8',
                  display: 'flex',
                  alignItems: 'center'
                }}>
                  <Lock size={16} />
                </span>
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: 10,
                    top: '50%',
                    transform: 'translateY(-50%)',
                    background: 'none',
                    border: 'none',
                    color: '#94A3B8',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    padding: 4
                  }}
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12.5, color: '#475569' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: 7, cursor: 'pointer' }}>
                <input type="checkbox" defaultChecked style={{ accentColor: '#D31027' }} />
                <span>Ghi nhớ phiên làm việc trên máy này</span>
              </label>
            </div>

            <button 
              type="submit" 
              className="btn-primary" 
              disabled={loginLoading}
              style={{
                width: '100%',
                justifyContent: 'center',
                padding: '12px',
                fontSize: 14.5,
                fontWeight: 800,
                marginTop: 4
              }}
            >
              {loginLoading ? 'Đang xác thực thông tin...' : 'Đăng Nhập Quản Trị'}
            </button>
          </form>

          <div style={{ textAlign: 'center', marginTop: 24, paddingTop: 16, borderTop: '1px solid #F1F5F9' }}>
            <p style={{ fontSize: 11, color: '#94A3B8', margin: 0 }}>
              Bản quyền © 2026 Phúc Thanh Audio Group • Bảo mật dữ liệu nội bộ
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: '#F8FAFC', color: '#0F172A' }}>

      {/* Toast Alert */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: 24,
          right: 24,
          zIndex: 9999,
          background: toast.type === 'error' ? '#DC2626' : '#16A34A',
          color: '#FFFFFF',
          padding: '12px 22px',
          borderRadius: 10,
          fontWeight: 600,
          boxShadow: '0 10px 30px rgba(0,0,0,0.12)',
          fontSize: 14
        }}>
          {toast.msg}
        </div>
      )}

      {/* Top Brand Bar */}
      <div style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        padding: '8px 24px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        fontSize: 12
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ color: '#D31027', fontWeight: 800, letterSpacing: '0.04em' }}>
            PHÂN PHỐI CHÍNH HÃNG:
          </span>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto' }}>
            {BRANDS.map((b, i) => (
              <span key={i} className="brand-pill">{b}</span>
            ))}
          </div>
        </div>
        <div style={{ display: 'flex', gap: 16, color: '#64748B', fontWeight: 600 }}>
          <span>SOUND • LIGHT • TECHNOLOGY</span>
          <span>Hotline: 0909.112.233</span>
        </div>
      </div>

      {/* Main Header */}
      <header style={{
        background: '#FFFFFF',
        borderBottom: '1px solid #E2E8F0',
        position: 'sticky',
        top: 0,
        zIndex: 100,
        boxShadow: '0 1px 3px rgba(0,0,0,0.02)'
      }}>
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '14px 24px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>

          {/* Logo & Brand */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <img
              src="/746412010_1444709327687147_3281768804330503498_n.jpg"
              alt="Phúc Thanh Audio"
              style={{
                width: 46,
                height: 46,
                borderRadius: '50%',
                objectFit: 'cover',
                border: '2px solid #D31027'
              }}
            />
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontSize: 20, fontWeight: 900, color: '#0F172A', display: 'flex', alignItems: 'center', gap: 6 }}>
                  PHÚC THANH <span style={{ color: '#D31027' }}>AUDIO</span>
                </h1>
                <span className="badge badge-red" style={{ fontSize: 10 }}>HỆ THỐNG QUẢN TRỊ</span>
              </div>
              <p style={{ fontSize: 12, color: '#64748B' }}>
                Giải Pháp Âm Thanh Chuyên Nghiệp Sân Khấu • Hội Trường • Karaoke VIP
              </p>
            </div>
          </div>

          {/* Executive Header Actions */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={fetchInitialData}
              className="btn-secondary"
              style={{ padding: '7px 16px', fontSize: 13, fontWeight: 700 }}
              title="Đồng bộ dữ liệu thời gian thực từ Airtable & Redis"
            >
              {loading ? 'Đang đồng bộ...' : 'Đồng bộ dữ liệu'}
            </button>

            {/* User Profile & Logout */}
            {currentUser && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '4px 10px 4px 6px',
                background: '#F8FAFC',
                border: '1px solid #E2E8F0',
                borderRadius: 24
              }}>
                <span style={{
                  fontSize: 11.5,
                  fontWeight: 900,
                  color: '#FFFFFF',
                  width: 30,
                  height: 30,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #D31027 0%, #E11D48 100%)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  boxShadow: '0 2px 8px rgba(211, 16, 39, 0.25)',
                  letterSpacing: '0.02em'
                }}>
                  {currentUser.avatar || 'PT'}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', lineHeight: 1.15 }}>
                  <span style={{ fontSize: 12.5, fontWeight: 800, color: '#0F172A' }}>{currentUser.name}</span>
                  <span style={{ fontSize: 10.5, color: '#D31027', fontWeight: 600 }}>{currentUser.role}</span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Đăng xuất"
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    marginLeft: 6,
                    padding: '5px 9px',
                    borderRadius: 16,
                    border: '1px solid #FCA5A5',
                    background: '#FEF2F2',
                    color: '#DC2626',
                    fontSize: 11,
                    fontWeight: 700,
                    cursor: 'pointer',
                    transition: 'all 0.15s ease'
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#FEE2E2'}
                  onMouseLeave={e => e.currentTarget.style.background = '#FEF2F2'}
                >
                  <LogOut size={13} />
                  <span>Thoát</span>
                </button>
              </div>
            )}
          </div>

        </div>

        {/* Clean Typography Tabs without icons */}
        <div style={{ maxWidth: 1440, margin: '0 auto', padding: '0 24px', display: 'flex', gap: 8, overflowX: 'auto' }}>
          {[
            { id: 'dashboard', label: 'Dashboard CEO' },
            { id: 'quotes', label: 'Báo Giá ISO' },
            { id: 'contracts', label: 'Tạo Hợp Đồng 1-Click' },
            { id: 'pipeline', label: 'Pipeline Bán Hàng' },
            { id: 'inventory', label: 'Kho Thiết Bị & Cảnh Báo Tồn' },
            { id: 'warranties', label: 'Trung Tâm Bảo Hành' },
            { id: 'zbs', label: 'Zalo ZBS WIFIM' },
          ].map(tab => {
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  padding: '12px 18px',
                  border: 'none',
                  background: 'transparent',
                  color: isActive ? '#D31027' : '#475569',
                  fontFamily: "'Be Vietnam Pro', Arial, sans-serif",
                  fontWeight: isActive ? 800 : 600,
                  fontSize: 14,
                  cursor: 'pointer',
                  borderBottom: isActive ? '3px solid #D31027' : '3px solid transparent',
                  transition: 'all 0.15s ease',
                  whiteSpace: 'nowrap'
                }}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </header>

      {/* Main Content Area */}
      <main style={{ flex: 1, maxWidth: 1440, width: '100%', margin: '0 auto', padding: '24px' }}>

        {/* ==================== TAB 1: DASHBOARD CEO ==================== */}
        {activeTab === 'dashboard' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.015em' }}>Bảng Điều Khiển Tổng Quan (CEO)</h2>
                <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                  Số liệu điều hành thời gian thực từ cơ sở dữ liệu Airtable Phúc Thanh Audio & tự động hóa
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span className="badge badge-green" style={{ fontSize: 11.5, padding: '5px 11px' }}>
                  ● Airtable Connected ({kpiData?.airtable_reports_count || 6} kỳ báo cáo)
                </span>
                <span className="badge badge-gold" style={{ fontSize: 11.5, padding: '5px 11px' }}>
                  Cập nhật: {kpiData?.last_updated || 'Vừa xong'}
                </span>
              </div>
            </div>

            {/* Clean Refined KPI Cards Grid (Subtle, Not Overwhelming) */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 22, marginBottom: 30 }}>

              <div className="white-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#D31027' }}></div>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>TỔNG DOANH THU HỢP ĐỒNG</p>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginTop: 6, letterSpacing: '-0.02em' }}>
                  {(kpiData?.total_revenue || 0).toLocaleString('vi-VN')} đ
                </h3>
                <p style={{ fontSize: 12, color: '#16A34A', marginTop: 8, fontWeight: 500, display: 'flex', alignItems: 'center', gap: 5 }}>
                  <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#16A34A' }}></span>
                  Từ {kpiData?.total_contracts || contracts.length} hợp đồng lưu trên Airtable
                </p>
              </div>

              <div className="white-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#F59E0B' }}></div>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>BÁO GIÁ ISO ĐÃ PHÁT HÀNH</p>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginTop: 6, letterSpacing: '-0.02em' }}>
                  {kpiData?.total_quotes || quotes.length} Báo giá
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
                  Tự động điền theo mẫu ISO Phúc Thanh Audio
                </p>
              </div>

              <div className="white-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#10B981' }}></div>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>LEADS & PIPELINE DEALS</p>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginTop: 6, letterSpacing: '-0.02em' }}>
                  {kpiData?.total_leads || leads.length} Khách hàng
                </h3>
                <p style={{ fontSize: 12, color: '#0284C7', marginTop: 8, fontWeight: 500 }}>
                  {kpiData?.won_deals || 0} Deal đã chốt thành công (Won)
                </p>
              </div>

              <div className="white-card" style={{ padding: '22px 24px', position: 'relative', overflow: 'hidden' }}>
                <div style={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, background: '#EF4444' }}></div>
                <p style={{ color: '#64748B', fontSize: 11, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em' }}>BẢO HÀNH ĐANG XỬ LÝ</p>
                <h3 style={{ fontSize: 22, fontWeight: 700, color: '#1E293B', marginTop: 6, letterSpacing: '-0.02em' }}>
                  {kpiData?.active_warranties || warranties.length} Phiếu
                </h3>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 8 }}>
                  KTV phụ trách cập nhật tiến độ
                </p>
              </div>

            </div>

            {/* ============================================================== */}
            {/* 4 BIỂU ĐỒ TRỰC QUAN DOANH THU & CHỈ SỐ KINH DOANH DYNAMIC      */}
            {/* ============================================================== */}
            {(() => {
              // 1. Dữ liệu xu hướng từ kpiData.monthly_trend
              const trend = (kpiData?.monthly_trend && kpiData.monthly_trend.length > 0) ? kpiData.monthly_trend : [
                { month: 'Tháng 4', actual: 140000000, target: 300000000 },
                { month: 'Tháng 5', actual: 195000000, target: 300000000 },
                { month: 'Tháng 6', actual: 230000000, target: 300000000 },
                { month: 'Tháng 7', actual: 290000000, target: 300000000 },
                { month: 'Tháng 8', actual: 340000000, target: 300000000 },
                { month: 'Tháng 9', actual: 420000000, target: 300000000 }
              ];
              const maxTrendVal = Math.max(...trend.map(t => Math.max(t.actual || 0, t.target || 0)), 450000000);
              const targetVal = trend[0]?.target || 300000000;
              const targetY = Math.round(168 - (targetVal / maxTrendVal) * (168 - 42));

              const trendPoints = trend.map((t, idx) => {
                const x = 80 + idx * ((480 - 80) / Math.max(trend.length - 1, 1));
                const y = 168 - ((t.actual || 0) / maxTrendVal) * (168 - 42);
                return {
                  x: Math.round(x),
                  y: Math.round(y),
                  val: `${Math.round((t.actual || 0) / 1000000)} Tr`,
                  month: t.month,
                  actual: t.actual,
                  target: t.target
                };
              });

              let splinePath = '';
              let areaPath = '';
              if (trendPoints.length > 0) {
                splinePath = `M ${trendPoints[0].x} ${trendPoints[0].y}`;
                areaPath = `M ${trendPoints[0].x} 168 L ${trendPoints[0].x} ${trendPoints[0].y}`;
                for (let i = 1; i < trendPoints.length; i++) {
                  const prev = trendPoints[i - 1];
                  const curr = trendPoints[i];
                  const cp1x = Math.round(prev.x + (curr.x - prev.x) / 2);
                  const cp1y = prev.y;
                  const cp2x = Math.round(prev.x + (curr.x - prev.x) / 2);
                  const cp2y = curr.y;
                  splinePath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                  areaPath += ` C ${cp1x} ${cp1y}, ${cp2x} ${cp2y}, ${curr.x} ${curr.y}`;
                }
                const lastPt = trendPoints[trendPoints.length - 1];
                areaPath += ` L ${lastPt.x} 168 Z`;
              }

              const lastActual = trend[trend.length - 1]?.actual || 0;
              const prevActual = trend.length >= 2 ? (trend[trend.length - 2]?.actual || 1) : 1;
              const momGrowth = (((lastActual - prevActual) / prevActual) * 100).toFixed(1);
              const targetPct = Math.round((lastActual / (targetVal || 1)) * 100);

              // 2. Nhóm giải pháp từ kpiData.solution_breakdown
              const solutions = kpiData?.solution_breakdown || [];
              const totalRevVal = kpiData?.total_revenue || 0;
              let accumulatedPct = 0;
              const donutSlices = solutions.map(s => {
                const pct = s.percent || 0;
                const offset = -accumulatedPct;
                accumulatedPct += pct;
                return {
                  ...s,
                  strokeDasharray: `${pct} 100`,
                  strokeDashoffset: offset
                };
              });

              // 3. Kênh bán hàng từ kpiData.channel_performance
              const channels = kpiData?.channel_performance || [];
              const maxChannelVal = Math.max(...channels.map(c => Math.max(c.target || 0, c.actual || 0)), 1200);

              // 4. Ma trận danh mục từ kpiData.category_values và product_categories
              const catEntries = Object.entries(kpiData?.category_values || {});
              const catCounts = kpiData?.product_categories || {};
              const totalCatVal = catEntries.reduce((sum, [, v]) => sum + v, 0) || 1;
              const categoryColors = [
                { bg: 'linear-gradient(145deg, #FFF5F5 0%, #FFFFFF 100%)', border: '#FECACA', text: '#D31027', badgeBg: '#DCFCE7', badgeColor: '#166534' },
                { bg: 'linear-gradient(145deg, #F0F9FF 0%, #FFFFFF 100%)', border: '#BAE6FD', text: '#0284C7', badgeBg: '#E0F2FE', badgeColor: '#0369A1' },
                { bg: 'linear-gradient(145deg, #F5F3FF 0%, #FFFFFF 100%)', border: '#DDD6FE', text: '#7C3AED', badgeBg: '#EDE9FE', badgeColor: '#6D28D9' },
                { bg: 'linear-gradient(145deg, #F0FDF4 0%, #FFFFFF 100%)', border: '#BBF7D0', text: '#16A34A', badgeBg: '#DCFCE7', badgeColor: '#15803D' }
              ];
              const categories = catEntries.map(([catName, val], idx) => ({
                name: catName,
                val,
                count: catCounts[catName] || 1,
                pct: Math.round((val / totalCatVal) * 100),
                theme: categoryColors[idx % categoryColors.length]
              })).sort((a, b) => b.val - a.val);

              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(480px, 1fr))', gap: 20, marginBottom: 28 }}>

                  {/* BIỂU ĐỒ 1: BIỂU ĐỒ DIỆN TÍCH / ĐƯỜNG UỐN LƯỢN DYNAMIC */}
                  <div className="white-card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                          <h4 style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                            Xu Hướng Doanh Thu Dự Án & Đường Chỉ Tiêu
                          </h4>
                          <span style={{ fontSize: 10.5, background: '#FEF2F2', color: '#D31027', padding: '2px 7px', borderRadius: 4, fontWeight: 700 }}>
                            {trend[0]?.month || 'T4'} - {trend[trend.length - 1]?.month || 'T9'}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                          Số liệu thực tế từ Hợp đồng & Báo cáo kết nối Database thời gian thực
                        </p>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#D31027' }}>
                          <span style={{ width: 12, height: 3, borderRadius: 2, background: '#D31027' }}></span> Thực Đạt
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#D97706' }}>
                          <span style={{ width: 12, height: 2, borderTop: '2px dashed #D97706' }}></span> Chỉ Tiêu
                        </span>
                      </div>
                    </div>

                    {/* SVG Spline Area Chart */}
                    <div style={{ flex: 1, minHeight: 220, position: 'relative', width: '100%' }}>
                      <svg viewBox="0 0 540 225" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        <defs>
                          <linearGradient id="splineAreaGrad" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor="#D31027" stopOpacity="0.25" />
                            <stop offset="65%" stopColor="#D31027" stopOpacity="0.06" />
                            <stop offset="100%" stopColor="#D31027" stopOpacity="0.00" />
                          </linearGradient>
                          <filter id="splineShadow" x="-10%" y="-10%" width="130%" height="130%">
                            <feDropShadow dx="0" dy="3" stdDeviation="3" floodColor="#D31027" floodOpacity="0.25" />
                          </filter>
                        </defs>

                        {/* Horizontal Grid lines */}
                        <line x1="45" y1="42" x2="520" y2="42" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="45" y1="84" x2="520" y2="84" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="45" y1="126" x2="520" y2="126" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="45" y1="168" x2="520" y2="168" stroke="#CBD5E1" strokeWidth="1.2" />

                        {/* Y-Axis Labels */}
                        <text x="36" y="46" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">{Math.round(maxTrendVal / 1000000)} Tr</text>
                        <text x="36" y="88" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">{Math.round(maxTrendVal * 0.66 / 1000000)} Tr</text>
                        <text x="36" y="130" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">{Math.round(maxTrendVal * 0.33 / 1000000)} Tr</text>
                        <text x="36" y="172" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">0</text>

                        {/* Target line */}
                        <line
                          x1="45"
                          y1={targetY}
                          x2="520"
                          y2={targetY}
                          stroke="#D97706"
                          strokeWidth="2"
                          strokeDasharray="6 4"
                        />
                        <g transform={`translate(415, ${targetY - 12})`}>
                          <rect width="102" height="22" rx="5" fill="#FEF3C7" stroke="#FDE68A" strokeWidth="1" />
                          <text x="51" y="15.5" textAnchor="middle" fontSize="10.5" fill="#B45309" fontWeight="800">
                            Chỉ tiêu: {Math.round(targetVal / 1000000)} Tr
                          </text>
                        </g>

                        {/* Area fill path */}
                        {areaPath && <path d={areaPath} fill="url(#splineAreaGrad)" />}

                        {/* Spline curve */}
                        {splinePath && (
                          <path
                            d={splinePath}
                            fill="none"
                            stroke="#D31027"
                            strokeWidth="3.5"
                            strokeLinecap="round"
                            filter="url(#splineShadow)"
                          />
                        )}

                        {/* Dynamic Data Points */}
                        {trendPoints.map((pt, i) => (
                          <g key={i} style={{ cursor: 'pointer' }}>
                            <circle cx={pt.x} cy={pt.y} r="8" fill="#D31027" fillOpacity="0.16" />
                            <circle cx={pt.x} cy={pt.y} r="4.5" fill="#FFFFFF" stroke="#D31027" strokeWidth="2.5" />
                            <text
                              x={pt.x}
                              y={pt.y - 12}
                              textAnchor="middle"
                              fontSize="11"
                              fill="#0F172A"
                              fontWeight="800"
                            >
                              {pt.val}
                            </text>
                            <text
                              x={pt.x}
                              y="190"
                              textAnchor="middle"
                              fontSize="11.5"
                              fill={i === trendPoints.length - 1 ? '#D31027' : '#64748B'}
                              fontWeight={i === trendPoints.length - 1 ? '800' : '600'}
                            >
                              {pt.month}
                            </text>
                          </g>
                        ))}
                      </svg>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 12, color: '#64748B' }}>
                      <span>Tăng trưởng tháng gần nhất: <strong style={{ color: Number(momGrowth) >= 0 ? '#16A34A' : '#DC2626' }}>{Number(momGrowth) >= 0 ? `+${momGrowth}%` : `${momGrowth}%`} MoM</strong></span>
                      <span>Trạng thái kế hoạch: <strong style={{ color: targetPct >= 100 ? '#16A34A' : '#D31027' }}>Đạt {targetPct}% Chỉ tiêu</strong></span>
                    </div>
                  </div>

                  {/* BIỂU ĐỒ 2: CƠ CẤU DOANH SỐ THEO NHÓM GIẢI PHÁP (DONUT CHART DYNAMIC) */}
                  <div className="white-card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ marginBottom: 14 }}>
                      <h4 style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                        Cơ Cấu Doanh Số Theo Nhóm Giải Pháp
                      </h4>
                      <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                        Tỷ trọng doanh số tính từ Hợp đồng thực tế trong Database
                      </p>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-around', flex: 1, gap: 16 }}>
                      {/* SVG Donut Chart */}
                      <div style={{ position: 'relative', width: 170, height: 170, flexShrink: 0 }}>
                        <svg viewBox="0 0 36 36" style={{ width: '100%', height: '100%', transform: 'rotate(-90deg)' }}>
                          <path
                            d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                            fill="none"
                            stroke="#F1F5F9"
                            strokeWidth="4.2"
                          />
                          {donutSlices.map((sl, idx) => (
                            <path
                              key={idx}
                              d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                              fill="none"
                              stroke={sl.color || '#D31027'}
                              strokeWidth="4.5"
                              strokeDasharray={sl.strokeDasharray}
                              strokeDashoffset={sl.strokeDashoffset}
                            />
                          ))}
                        </svg>
                        <div style={{
                          position: 'absolute',
                          inset: 0,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          justifyContent: 'center',
                          pointerEvents: 'none'
                        }}>
                          <span style={{ fontSize: 10.5, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>Tổng HĐ</span>
                          <span style={{ fontSize: 17, fontWeight: 900, color: '#0F172A' }}>
                            {(totalRevVal / 1000000000).toFixed(2)} Tỷ
                          </span>
                        </div>
                      </div>

                      {/* Dynamic Legend List */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, flex: 1 }}>
                        {solutions.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontSize: 12 }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                              <span style={{ width: 10, height: 10, borderRadius: 2, background: item.color, flexShrink: 0 }}></span>
                              <span style={{ color: '#334155', fontWeight: 600 }}>{item.name}</span>
                            </div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                              <strong style={{ color: '#0F172A' }}>{(item.value / 1000000000).toFixed(2)} Tỷ</strong>
                              <span style={{ color: '#64748B', fontSize: 11, minWidth: 28, textAlign: 'right' }}>{item.percent}%</span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B' }}>
                      <span>Nhóm dẫn đầu: <strong>{solutions[0]?.name || 'Karaoke VIP & Lounge'}</strong></span>
                      <span style={{ color: '#16A34A', fontWeight: 700 }}>Đạt {solutions[0]?.percent || 0}% Tỷ trọng</span>
                    </div>
                  </div>

                  {/* BIỂU ĐỒ 3: HIỆU SUẤT KÊNH BÁN HÀNG (GROUPED COLUMN CHART DYNAMIC) */}
                  <div className="white-card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <h4 style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Hiệu Suất Kênh Bán Hàng (Chỉ Tiêu vs Thực Thu)
                        </h4>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                          Đối chiếu KPI kế hoạch và doanh số thực tế từng kênh kinh doanh
                        </p>
                      </div>
                      <div style={{ display: 'flex', gap: 12, fontSize: 11.5, fontWeight: 700, flexShrink: 0 }}>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#94A3B8' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#F8FAFC', border: '1px solid #CBD5E1' }}></span> Chỉ Tiêu
                        </span>
                        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, color: '#D31027' }}>
                          <span style={{ width: 10, height: 10, borderRadius: 2, background: '#D31027' }}></span> Thực Thu
                        </span>
                      </div>
                    </div>

                    {/* SVG Grouped Column Chart */}
                    <div style={{ flex: 1, minHeight: 220, position: 'relative', width: '100%' }}>
                      <svg viewBox="0 0 520 220" style={{ width: '100%', height: '100%', overflow: 'visible' }}>
                        {/* Grid lines */}
                        <line x1="45" y1="35" x2="500" y2="35" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="45" y1="78" x2="500" y2="78" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="45" y1="122" x2="500" y2="122" stroke="#F1F5F9" strokeWidth="1" />
                        <line x1="45" y1="168" x2="500" y2="168" stroke="#CBD5E1" strokeWidth="1.2" />

                        {/* Y-Axis Labels */}
                        <text x="36" y="39" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">{maxChannelVal} Tr</text>
                        <text x="36" y="82" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">{Math.round(maxChannelVal * 0.66)} Tr</text>
                        <text x="36" y="126" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">{Math.round(maxChannelVal * 0.33)} Tr</text>
                        <text x="36" y="172" textAnchor="end" fontSize="10.5" fill="#94A3B8" fontWeight="600">0</text>

                        {/* Dynamic Columns for each Channel */}
                        {channels.map((col, idx) => {
                          const colW = 22;
                          const gap = 6;
                          const colX = 65 + idx * 110;
                          const targetY = 168 - ((col.target / maxChannelVal) * (168 - 35));
                          const actualY = 168 - ((col.actual / maxChannelVal) * (168 - 35));
                          const targetH = Math.max(168 - targetY, 2);
                          const actualH = Math.max(168 - actualY, 2);
                          const isHigh = col.rate >= 100;

                          return (
                            <g key={idx}>
                              {/* Target Bar */}
                              <rect
                                x={colX}
                                y={targetY}
                                width={colW}
                                height={targetH}
                                rx="3"
                                fill="#F8FAFC"
                                stroke="#CBD5E1"
                                strokeWidth="1"
                              />
                              <text
                                x={colX + colW / 2}
                                y={targetY - 5}
                                textAnchor="middle"
                                fontSize="9"
                                fill="#64748B"
                                fontWeight="700"
                              >
                                {col.target}
                              </text>

                              {/* Actual Bar */}
                              <rect
                                x={colX + colW + gap}
                                y={actualY}
                                width={colW}
                                height={actualH}
                                rx="3"
                                fill="#D31027"
                              />
                              <text
                                x={colX + colW + gap + colW / 2}
                                y={actualY - 5}
                                textAnchor="middle"
                                fontSize="10"
                                fill="#D31027"
                                fontWeight="800"
                              >
                                {col.actual}
                              </text>

                              {/* Completion Badge */}
                              <g transform={`translate(${colX + (colW * 2 + gap) / 2 - 20}, ${Math.min(targetY, actualY) - 24})`}>
                                <rect
                                  width="40"
                                  height="15"
                                  rx="3.5"
                                  fill={isHigh ? '#DCFCE7' : '#FEF3C7'}
                                  stroke={isHigh ? '#86EFAC' : '#FDE68A'}
                                  strokeWidth="0.8"
                                />
                                <text
                                  x="20"
                                  y="11"
                                  textAnchor="middle"
                                  fontSize="9.5"
                                  fill={isHigh ? '#15803D' : '#B45309'}
                                  fontWeight="800"
                                >
                                  {col.rate}%
                                </text>
                              </g>

                              {/* X-axis Label */}
                              <text
                                x={colX + (colW * 2 + gap) / 2}
                                y="190"
                                textAnchor="middle"
                                fontSize="10.5"
                                fill="#475569"
                                fontWeight="600"
                              >
                                {col.channel}
                              </text>
                            </g>
                          );
                        })}
                      </svg>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B' }}>
                      <span>Kênh dẫn đầu: <strong style={{ color: '#D31027' }}>{channels.reduce((prev, curr) => (curr.rate > prev.rate ? curr : prev), channels[0] || {}).channel || 'Đại lý'}</strong></span>
                      <span>Trung bình thực thu: <strong style={{ color: '#16A34A' }}>{channels.length > 0 ? Math.round(channels.reduce((sum, c) => sum + c.rate, 0) / channels.length) : 100}% chỉ tiêu</strong></span>
                    </div>
                  </div>

                  {/* BIỂU ĐỒ 4: MA TRẬN DANH MỤC THIẾT BỊ (PORTFOLIO TREEMAP DYNAMIC) */}
                  <div className="white-card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                      <div>
                        <h4 style={{ fontSize: 15.5, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                          Ma Trận Danh Mục Thiết Bị Âm Thanh
                        </h4>
                        <p style={{ fontSize: 12, color: '#64748B', margin: '4px 0 0 0' }}>
                          Phân bổ tỷ trọng giá trị kho và số lượng theo từng danh mục thực tế
                        </p>
                      </div>
                      <span style={{ fontSize: 11, background: '#EFF6FF', color: '#0284C7', padding: '3px 8px', borderRadius: 6, fontWeight: 700, flexShrink: 0 }}>
                        {categories.length} Nhóm Sản Phẩm
                      </span>
                    </div>

                    {/* Dynamic Treemap Grid Blocks */}
                    <div style={{ flex: 1, display: 'grid', gridTemplateColumns: '1.4fr 1fr', gridTemplateRows: '1fr 1fr', gap: 12, minHeight: 220 }}>
                      {categories.length > 0 && (
                        <div style={{
                          gridRow: '1 / span 2',
                          background: categories[0].theme.bg,
                          border: `1.5px solid ${categories[0].theme.border}`,
                          borderRadius: 10,
                          padding: '16px 18px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between',
                          boxShadow: '0 2px 6px rgba(211, 16, 39, 0.04)'
                        }}>
                          <div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 11, fontWeight: 800, textTransform: 'uppercase', color: categories[0].theme.text, letterSpacing: '0.04em' }}>
                                {categories[0].pct}% GIÁ TRỊ KHO
                              </span>
                              <span style={{ fontSize: 10.5, background: categories[0].theme.badgeBg, color: categories[0].theme.badgeColor, fontWeight: 800, padding: '2px 6px', borderRadius: 4 }}>
                                Top 1 Doanh Mục
                              </span>
                            </div>
                            <h5 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', margin: '8px 0 2px 0' }}>
                              {categories[0].name}
                            </h5>
                            <p style={{ fontSize: 11.5, color: '#64748B', margin: 0 }}>
                              {categories[0].count} mã sản phẩm chính hãng
                            </p>
                          </div>

                          <div>
                            <div style={{ fontSize: 24, fontWeight: 900, color: categories[0].theme.text, lineHeight: 1.1 }}>
                              {categories[0].val >= 1000000000 ? `${(categories[0].val / 1000000000).toFixed(2)} Tỷ` : `${Math.round(categories[0].val / 1000000)} Tr`}
                            </div>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 8, paddingTop: 8, borderTop: `1px dashed ${categories[0].theme.border}`, fontSize: 11, color: '#475569' }}>
                              <span>Tồn kho an toàn</span>
                              <strong>Chủ lực dự án</strong>
                            </div>
                          </div>
                        </div>
                      )}

                      {categories.length > 1 && (
                        <div style={{
                          background: categories[1].theme.bg,
                          border: `1.5px solid ${categories[1].theme.border}`,
                          borderRadius: 10,
                          padding: '12px 14px',
                          display: 'flex',
                          flexDirection: 'column',
                          justifyContent: 'space-between'
                        }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <span style={{ fontSize: 10.5, fontWeight: 800, color: categories[1].theme.text }}>{categories[1].pct}% GIÁ TRỊ</span>
                            <strong style={{ fontSize: 14, fontWeight: 900, color: categories[1].theme.text }}>
                              {categories[1].val >= 1000000000 ? `${(categories[1].val / 1000000000).toFixed(2)} Tỷ` : `${Math.round(categories[1].val / 1000000)} Tr`}
                            </strong>
                          </div>
                          <div>
                            <h5 style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', margin: '4px 0 2px 0' }}>
                              {categories[1].name}
                            </h5>
                            <p style={{ fontSize: 10.5, color: '#64748B', margin: 0 }}>
                              {categories[1].count} SKU cấu hình
                            </p>
                          </div>
                        </div>
                      )}

                      {/* Split blocks for 3rd and 4th categories */}
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                        {categories.slice(2, 4).map((cat, cIdx) => (
                          <div key={cIdx} style={{
                            background: cat.theme.bg,
                            border: `1.5px solid ${cat.theme.border}`,
                            borderRadius: 10,
                            padding: '10px 12px',
                            display: 'flex',
                            flexDirection: 'column',
                            justifyContent: 'space-between'
                          }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontSize: 9.5, fontWeight: 800, color: cat.theme.text }}>{cat.pct}%</span>
                              <strong style={{ fontSize: 12, fontWeight: 800, color: cat.theme.text }}>
                                {cat.val >= 1000000000 ? `${(cat.val / 1000000000).toFixed(1)}T` : `${Math.round(cat.val / 1000000)}M`}
                              </strong>
                            </div>
                            <div>
                              <h6 style={{ fontSize: 11.5, fontWeight: 800, color: '#0F172A', margin: '3px 0 1px 0' }}>
                                {cat.name}
                              </h6>
                              <p style={{ fontSize: 10, color: '#64748B', margin: 0 }}>{cat.count} Thiết bị</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>

                    <div style={{ marginTop: 12, paddingTop: 10, borderTop: '1px solid #F1F5F9', display: 'flex', justifyContent: 'space-between', fontSize: 11.5, color: '#64748B' }}>
                      <span>Danh mục chủ lực: <strong style={{ color: '#D31027' }}>{categories[0]?.name || 'Loa'}</strong></span>
                      <span>Tiêu chuẩn: <strong>Bảo hành chính hãng 24 - 36 Tháng</strong></span>
                    </div>
                  </div>

                </div>
              );
            })()}

            {/* Executive Status & Workflow Shortcuts (Clean, No Bloat) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1.4fr 1fr', gap: 24 }}>

              {/* System & Automation Infrastructure */}
              <div className="white-card" style={{ padding: '22px 24px' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#10B981' }}></span>
                  Hạ Tầng Tự Động Hóa & Cơ Sở Dữ Liệu
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Airtable Base</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>10 Bảng Dữ Liệu</div>
                    <div style={{ fontSize: 11.5, color: '#16A34A', marginTop: 4, fontWeight: 500 }}>● Bảng `Bao cao` Active</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Đệm Hiệu Năng</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>Redis Cache</div>
                    <div style={{ fontSize: 11.5, color: '#0284C7', marginTop: 4, fontWeight: 500 }}>● Phản hồi &lt; 50ms</div>
                  </div>
                  <div style={{ padding: '14px 16px', background: '#F8FAFC', borderRadius: 10, border: '1px solid #E2E8F0' }}>
                    <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tự Động Hóa</div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: '#0F172A', marginTop: 4 }}>VietQR + ZBS</div>
                    <div style={{ fontSize: 11.5, color: '#16A34A', marginTop: 4, fontWeight: 500 }}>● Sẵn sàng kết nối</div>
                  </div>
                </div>
              </div>

              {/* Quick Operation Navigation */}
              <div className="white-card" style={{ padding: '22px 24px' }}>
                <h4 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#D31027' }}></span>
                  Truy Cập Nhanh Nghiệp Vụ
                </h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <button onClick={() => setActiveTab('contracts')} className="btn-secondary" style={{ padding: '10px 12px', justifyContent: 'center' }}>
                    📄 Quản Lý Hợp Đồng
                  </button>
                  <button onClick={() => setActiveTab('quotes')} className="btn-secondary" style={{ padding: '10px 12px', justifyContent: 'center' }}>
                    📊 Báo Giá ISO
                  </button>
                  <button onClick={() => setActiveTab('pipeline')} className="btn-secondary" style={{ padding: '10px 12px', justifyContent: 'center' }}>
                    🎯 Pipeline Khách Hàng
                  </button>
                  <button onClick={() => setActiveTab('inventory')} className="btn-secondary" style={{ padding: '10px 12px', justifyContent: 'center' }}>
                    📦 Kho Thiết Bị
                  </button>
                </div>
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 2: QUOTE STUDIO ==================== */}
        {activeTab === 'quotes' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Quote Studio — Báo Giá Chuẩn ISO</h2>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
                Chọn thiết bị âm thanh từ Airtable, tự động tính tổng tiền + thuế VAT và xuất file Word theo mẫu ISO
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>

                <div className="white-card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                    Thông Tin Khách Hàng & Dự Án
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Tên Công ty / Khách hàng</label>
                      <input
                        className="input-field"
                        value={quoteForm.company_name}
                        onChange={e => setQuoteForm({ ...quoteForm, company_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Người liên hệ</label>
                      <input
                        className="input-field"
                        value={quoteForm.contact_name}
                        onChange={e => setQuoteForm({ ...quoteForm, contact_name: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Số điện thoại (Nhận Zalo)</label>
                      <input
                        className="input-field"
                        value={quoteForm.phone}
                        onChange={e => setQuoteForm({ ...quoteForm, phone: e.target.value })}
                      />
                    </div>
                    <div>
                      <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Tên Dự án / Công trình</label>
                      <input
                        className="input-field"
                        value={quoteForm.project_name}
                        onChange={e => setQuoteForm({ ...quoteForm, project_name: e.target.value })}
                      />
                    </div>
                  </div>
                </div>

                <div className="white-card" style={{ padding: 20 }}>
                  <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 12 }}>
                    Danh Mục Thiết Bị Âm Thanh (Từ Airtable)
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10, maxHeight: 280, overflowY: 'auto' }}>
                    {products.map(p => {
                      const f = p.fields || {};
                      return (
                        <div
                          key={p.id}
                          onClick={() => addProductToQuote(p)}
                          style={{
                            padding: 12,
                            background: '#F8FAFC',
                            borderRadius: 10,
                            border: '1px solid #E2E8F0',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          <div style={{ fontWeight: 700, fontSize: 13, color: '#0F172A' }}>{f['Ten SP']}</div>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 6 }}>
                            <span className="badge badge-red" style={{ fontSize: 10 }}>{f['Thuong hieu']}</span>
                            <span style={{ fontWeight: 800, color: '#D97706', fontSize: 13 }}>
                              {(f['Don gia ban'] || 0).toLocaleString('vi-VN')} đ
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

              </div>

              <div className="white-card" style={{ padding: 22, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 14 }}>Chi Tiết Báo Giá ({quoteForm.items.length} thiết bị)</h4>

                <div style={{ flex: 1, overflowY: 'auto', maxHeight: 320, marginBottom: 18 }}>
                  {quoteForm.items.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 20px', color: '#94A3B8' }}>
                      <p>Chưa có sản phẩm nào. Hãy bấm vào sản phẩm bên trái để thêm vào báo giá.</p>
                    </div>
                  ) : (
                    quoteForm.items.map((it, idx) => (
                      <div key={idx} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '10px 12px',
                        borderBottom: '1px solid #E2E8F0',
                        fontSize: 13
                      }}>
                        <div style={{ flex: 1 }}>
                          <div style={{ fontWeight: 700, color: '#0F172A' }}>{it.name}</div>
                          <div style={{ color: '#64748B', fontSize: 11 }}>{it.price.toLocaleString('vi-VN')} đ × {it.quantity} {it.unit}</div>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                          <span style={{ fontWeight: 700, color: '#0F172A' }}>{(it.price * it.quantity).toLocaleString('vi-VN')} đ</span>
                          <button onClick={() => removeItemFromQuote(idx)} style={{ background: 'transparent', border: 'none', color: '#DC2626', cursor: 'pointer' }}>
                            <Trash2 size={15} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, marginBottom: 18, border: '1px solid #E2E8F0' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#475569' }}>
                    <span>Cộng tiền hàng:</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{quoteSubtotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6, fontSize: 13, color: '#475569' }}>
                    <span>Thuế GTGT (VAT 10%):</span>
                    <span style={{ fontWeight: 700, color: '#0F172A' }}>{quoteVat.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', paddingTop: 8, borderTop: '1px solid #CBD5E1', fontSize: 15, fontWeight: 900, color: '#D31027' }}>
                    <span>TỔNG CỘNG:</span>
                    <span>{quoteGrandTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <button
                  onClick={handleCreateQuote}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading}
                >
                  Xuất Báo Giá ISO (.docx) & Sync Airtable
                </button>
              </div>

            </div>
          </div>
        )}

        {/* ==================== TAB 3: CONTRACT WIZARD & MANAGEMENT ==================== */}
        {activeTab === 'contracts' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 26 }}>
              <div>
                <h2 style={{ fontSize: 20, fontWeight: 700, color: '#0F172A', letterSpacing: '-0.015em' }}>
                  Quản Lý & Tạo Hợp Đồng Tự Động
                </h2>
                <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                  Tra cứu MST tự động điền pháp nhân qua VietQR API, kết xuất file Word (.docx) chuẩn Phúc Thanh Audio và đồng bộ Airtable
                </p>
              </div>
              <span className="badge badge-gold" style={{ fontSize: 11.5, padding: '5px 12px' }}>
                Mẫu Hợp Đồng v2 Chuẩn ISO
              </span>
            </div>

            {/* Banner Hợp Đồng Vừa Tạo Thành Công & Nút Tải Word Trực Tiếp */}
            {createdContract && (
              <div style={{
                background: '#F0FDF4',
                border: '1.5px solid #86EFAC',
                borderRadius: 12,
                padding: '16px 22px',
                marginBottom: 26,
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                boxShadow: '0 2px 10px rgba(34, 197, 94, 0.08)'
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: 18 }}>🎉</span>
                    <h4 style={{ color: '#166534', fontWeight: 700, fontSize: 14.5, margin: 0 }}>
                      Đã Tạo Thành Công Hợp Đồng: {createdContract.id}
                    </h4>
                  </div>
                  <p style={{ color: '#15803D', fontSize: 12.5, margin: '4px 0 0 26px' }}>
                    Khách hàng: <strong>{createdContract.company}</strong> — Giá trị: <strong>{Number(createdContract.amount).toLocaleString('vi-VN')} đ</strong>. File Word đang được tải xuống!
                  </p>
                </div>
                <button
                  onClick={() => triggerDownload(`/api/v1/contracts/${createdContract.id}/${createdContract.filename}`, createdContract.filename)}
                  className="btn-primary"
                  style={{ padding: '8px 18px', fontSize: 13, whiteSpace: 'nowrap' }}
                >
                  📥 Bấm Tải File Word (.docx)
                </button>
              </div>
            )}

            {/* FORM TẠO HỢP ĐỒNG 1-CLICK */}
            <div className="white-card" style={{ padding: '24px 28px', marginBottom: 30 }}>
              <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', marginBottom: 18 }}>
                Tạo Hợp Đồng Mới (Tra Cứu Mã Số Thuế Tự Động)
              </h3>

              <div style={{ marginBottom: 18 }}>
                <label style={{ fontSize: 11.5, fontWeight: 600, color: '#D31027', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  BƯỚC 1: TRA CỨU MÃ SỐ THUẾ (VIETQR API)
                </label>
                <div style={{ display: 'flex', gap: 10 }}>
                  <input
                    className="input-field"
                    placeholder="Nhập MST doanh nghiệp (ví dụ: 0101248141, 0300588569...)"
                    value={contractForm.mst}
                    onChange={e => setContractForm({ ...contractForm, mst: e.target.value })}
                  />
                  <button
                    onClick={handleLookupTax}
                    className="btn-primary"
                    style={{ whiteSpace: 'nowrap' }}
                    disabled={mstSearching}
                  >
                    {mstSearching ? 'Đang tra cứu...' : 'Tra Cứu Pháp Nhân'}
                  </button>
                </div>
              </div>

              <div style={{ background: '#F8FAFC', padding: 16, borderRadius: 10, border: '1px solid #E2E8F0', marginBottom: 20 }}>
                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Tên Doanh Nghiệp (Bên Mua)</label>
                  <input
                    className="input-field"
                    placeholder="Tự động điền đầy đủ tên công ty sau khi tra MST"
                    value={contractForm.company_name}
                    onChange={e => setContractForm({ ...contractForm, company_name: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Địa Chỉ Đăng Ký Trụ Sở</label>
                  <input
                    className="input-field"
                    placeholder="Tự động điền địa chỉ pháp lý theo cơ quan thuế"
                    value={contractForm.address}
                    onChange={e => setContractForm({ ...contractForm, address: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14, marginBottom: 22 }}>
                <div>
                  <label style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Số Điện Thoại Ký HĐ</label>
                  <input
                    className="input-field"
                    value={contractForm.phone}
                    onChange={e => setContractForm({ ...contractForm, phone: e.target.value })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Giá Trị Hợp Đồng (VNĐ)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={contractForm.total_amount}
                    onChange={e => setContractForm({ ...contractForm, total_amount: parseInt(e.target.value) || 0 })}
                  />
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Loại Hợp Đồng</label>
                  <select
                    className="input-field"
                    value={contractForm.contract_type}
                    onChange={e => setContractForm({ ...contractForm, contract_type: e.target.value })}
                  >
                    <option value="Cung cấp thiết bị âm thanh">Cung cấp thiết bị âm thanh sân khấu</option>
                    <option value="Thi công lắp đặt âm thanh hội trường">Thi công lắp đặt hội trường / bar</option>
                    <option value="Bảo trì hệ thống âm thanh">Bảo trì hệ thống âm thanh chuyên nghiệp</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>Thời Hạn Bảo Hành (Tháng)</label>
                  <input
                    type="number"
                    className="input-field"
                    value={contractForm.warranty_months}
                    onChange={e => setContractForm({ ...contractForm, warranty_months: parseInt(e.target.value) || 24 })}
                  />
                </div>
              </div>

              <button
                onClick={handleCreateContract}
                className="btn-primary"
                style={{ width: '100%', padding: '12px', fontSize: 14, justifyContent: 'center' }}
                disabled={loading}
              >
                {loading ? 'Đang tạo hợp đồng & sinh file Word...' : 'Tạo Hợp Đồng Tự Động & Tải File Word (.docx)'}
              </button>
            </div>

            {/* BẢNG DANH SÁCH HỢP ĐỒNG ĐÃ PHÁT HÀNH TRÊN HỆ THỐNG */}
            <div className="white-card" style={{ padding: '24px 28px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                <div>
                  <h3 style={{ fontSize: 15, fontWeight: 700, color: '#0F172A', margin: 0 }}>
                    Danh Sách Hợp Đồng Đã Phát Hành & Đang Triển Khai
                  </h3>
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: '4px 0 0 0' }}>
                    Tổng cộng <strong>{contracts.length} hợp đồng</strong> đã lưu trữ trên cơ sở dữ liệu Airtable Phúc Thanh Audio
                  </p>
                </div>
                <button onClick={fetchInitialData} className="btn-secondary" style={{ fontSize: 12 }}>
                  🔄 Làm mới dữ liệu
                </button>
              </div>

              <div style={{ overflowX: 'auto', width: '100%' }}>
                <table className="data-table" style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead>
                    <tr>
                      <th style={{ width: '18%', whiteSpace: 'nowrap' }}>Mã HĐ</th>
                      <th style={{ width: '28%' }}>Khách hàng / Doanh nghiệp</th>
                      <th style={{ width: '20%' }}>Loại Hợp Đồng</th>
                      <th style={{ width: '14%', textAlign: 'right', whiteSpace: 'nowrap' }}>Giá trị (VNĐ)</th>
                      <th style={{ width: '10%', textAlign: 'center', whiteSpace: 'nowrap' }}>Trạng thái</th>
                      <th style={{ width: '10%', textAlign: 'center', whiteSpace: 'nowrap' }}>Thao tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {contracts.map(c => {
                      const f = c.fields || {};
                      const maHd = f['Ma HD'] || c.id;
                      return (
                        <tr key={c.id}>
                          <td style={{ fontWeight: 700, color: '#D31027', whiteSpace: 'nowrap' }}>
                            {maHd}
                          </td>
                          <td>
                            <strong style={{ color: '#0F172A', display: 'block', fontSize: 13.5 }}>{f['Nguoi ky KH'] || 'Khách hàng đối tác'}</strong>
                            {f['MST KH'] && <span style={{ fontSize: 11, color: '#94A3B8' }}>MST: {f['MST KH']}</span>}
                          </td>
                          <td style={{ color: '#475569' }}>
                            {f['Loai HD'] || 'Cung cấp thiết bị'}
                          </td>
                          <td style={{ textAlign: 'right', fontWeight: 700, color: '#0F172A', whiteSpace: 'nowrap' }}>
                            {(f['Gia tri HD'] || 0).toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <span className="badge badge-red">{f['Trang thai'] || 'Cho ky'}</span>
                          </td>
                          <td style={{ textAlign: 'center', whiteSpace: 'nowrap' }}>
                            <button
                              onClick={() => triggerDownload(`/api/v1/contracts/${maHd}/${maHd}.docx`, `${maHd}.docx`)}
                              className="btn-secondary"
                              style={{ padding: '6px 14px', fontSize: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}
                            >
                              📥 Tải .docx
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

          </div>
        )}

        {/* ==================== TAB 4: PIPELINE CRM (KANBAN BOARD DND) ==================== */}
        {activeTab === 'pipeline' && (
          <div>
            {/* Header & Controls (Matching Image 2 with QR, Copy Zalo, Xem Form) */}
            <div style={{ marginBottom: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 16, marginBottom: 16 }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Pipeline Bán Hàng — CRM Kanban</h2>
                    <span className="badge badge-red" style={{ fontSize: 11 }}>DRAG & DROP REALTIME</span>
                  </div>
                  <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                    Quản lý hành trình từ Lead mới đến khi Chốt hợp đồng (Won), tự động đồng bộ thời gian thực lên Airtable
                  </p>
                </div>
              </div>

              {/* Action Toolbar (Matching Image 2) */}
              <div style={{
                background: '#FFFFFF',
                border: '1px solid #E2E8F0',
                borderRadius: 12,
                padding: '10px 14px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flex: 1, minWidth: 260 }}>
                  <input
                    type="text"
                    className="input-field"
                    placeholder="Tìm tên khách, số điện thoại, vị trí, dự án..."
                    value={leadSearch}
                    onChange={e => setLeadSearch(e.target.value)}
                    style={{ maxWidth: 360, padding: '7px 12px', fontSize: 13 }}
                  />
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <button
                    onClick={fetchInitialData}
                    className="btn-secondary"
                    style={{ padding: '7px 12px', fontSize: 12.5 }}
                    title="Làm mới danh sách Lead từ Airtable"
                  >
                    Làm Mới
                  </button>

                  <button
                    onClick={() => {
                      const url = window.location.origin + '/intake';
                      navigator.clipboard.writeText(url);
                      showToast('Đã sao chép link Form tiếp nhận Zalo!');
                    }}
                    className="btn-secondary"
                    style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 700 }}
                    title="Sao chép đường link gửi qua Zalo cho khách hàng"
                  >
                    Copy Link Form Zalo
                  </button>

                  <button
                    onClick={() => setShowPipelineQrModal(true)}
                    className="btn-secondary"
                    style={{ padding: '7px 14px', fontSize: 12.5, fontWeight: 700 }}
                    title="Mở mã QR Form để quét trên điện thoại"
                  >
                    Mã QR Form
                  </button>

                  <a
                    href="/intake"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                    style={{
                      padding: '7px 14px',
                      fontSize: 12.5,
                      fontWeight: 700,
                      borderColor: '#D31027',
                      color: '#D31027',
                      textDecoration: 'none',
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 4
                    }}
                    title="Mở trang Form tiếp nhận trong Tab mới riêng biệt (giữ nguyên trang hiện tại)"
                  >
                    Xem Form ↗
                  </a>

                  <button
                    onClick={() => setShowNewLeadModal(true)}
                    className="btn-primary"
                    style={{ padding: '7px 16px', fontSize: 13 }}
                  >
                    + Tạo Lead Mới
                  </button>
                </div>
              </div>
            </div>

            {/* QR Modal for Pipeline (Matching Image 2) */}
            {showPipelineQrModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 10000,
                padding: 20
              }}>
                <div className="white-card" style={{ maxWidth: 360, width: '100%', padding: 26, textAlign: 'center' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: '#0F172A' }}>Mã QR Form Tiếp Nhận</h4>
                    <button
                      onClick={() => setShowPipelineQrModal(false)}
                      style={{ background: 'transparent', border: 'none', fontSize: 22, cursor: 'pointer', color: '#64748B' }}
                    >
                      ×
                    </button>
                  </div>
                  <div style={{ background: '#F8FAFC', padding: 14, borderRadius: 12, border: '1px solid #E2E8F0', display: 'inline-block', marginBottom: 14 }}>
                    <img
                      src={`https://api.qrserver.com/v1/create-qr-code/?size=240x240&data=${encodeURIComponent(getPublicIntakeUrl())}`}
                      alt="QR Code"
                      style={{ width: 220, height: 220, display: 'block' }}
                    />
                  </div>
                  <p style={{ fontSize: 12.5, color: '#64748B', margin: '0 0 16px 0', lineHeight: 1.4 }}>
                    Đưa khách hàng quét bằng camera Zalo hoặc tải ảnh mã QR để in/gửi cho khách
                  </p>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(getPublicIntakeUrl());
                        showToast('Đã copy link form tiếp nhận Zalo!');
                        setShowPipelineQrModal(false);
                      }}
                      className="btn-primary"
                      style={{ flex: 1, justifyContent: 'center', fontSize: 12.5 }}
                    >
                      Copy Link
                    </button>
                    <a
                      href="/intake"
                      target="_blank"
                      rel="noopener noreferrer"
                      onClick={() => setShowPipelineQrModal(false)}
                      className="btn-secondary"
                      style={{
                        flex: 1,
                        justifyContent: 'center',
                        fontSize: 12.5,
                        textDecoration: 'none',
                        display: 'inline-flex',
                        alignItems: 'center'
                      }}
                    >
                      Mở Tab Mới ↗
                    </a>
                  </div>
                </div>
              </div>
            )}

            {/* Pipeline Overview Stats */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
              gap: 12,
              marginBottom: 20
            }}>
              <div className="white-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Số Deal</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#0F172A' }}>{leads.length} Khách hàng</div>
                </div>
              </div>
              <div className="white-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Tổng Giá Trị Dự Kiến</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#D31027' }}>
                    {leads.reduce((sum, l) => sum + (l.fields?.['Gia tri uoc tinh'] || 0), 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
              <div className="white-card" style={{ padding: '12px 18px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: 11, color: '#64748B', fontWeight: 600, textTransform: 'uppercase' }}>Deal Đã Chốt (Won)</div>
                  <div style={{ fontSize: 20, fontWeight: 900, color: '#16A34A' }}>
                    {leads.filter(l => (l.fields?.Stage || 'New') === 'Won').reduce((sum, l) => sum + (l.fields?.['Gia tri uoc tinh'] || 0), 0).toLocaleString('vi-VN')} đ
                  </div>
                </div>
              </div>
            </div>

            {/* Modal: Thêm Lead Mới */}
            {showNewLeadModal && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: 'rgba(15, 23, 42, 0.45)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
                padding: 20
              }}>
                <div className="white-card" style={{ width: '100%', maxWidth: 540, padding: 26, boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, borderBottom: '1px solid #E2E8F0', pb: 12 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A' }}>Thêm Khách Hàng / Lead Mới</h3>
                    <button
                      onClick={() => setShowNewLeadModal(false)}
                      style={{ background: 'transparent', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Tên Doanh Nghiệp / Quán / Dự Án *</label>
                      <input
                        className="input-field"
                        placeholder="Ví dụ: Karaoke King Club, Vũ trường Blue Sky..."
                        value={newLeadForm.company_name}
                        onChange={e => setNewLeadForm({ ...newLeadForm, company_name: e.target.value })}
                      />
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Người Đại Diện / Liên Hệ</label>
                        <input
                          className="input-field"
                          placeholder="Anh Hùng, Chị Lan..."
                          value={newLeadForm.contact_name}
                          onChange={e => setNewLeadForm({ ...newLeadForm, contact_name: e.target.value })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Số Điện Thoại (Zalo) *</label>
                        <input
                          className="input-field"
                          placeholder="0909..."
                          value={newLeadForm.phone}
                          onChange={e => setNewLeadForm({ ...newLeadForm, phone: e.target.value })}
                        />
                      </div>
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Giá Trị Dự Kiến (VNĐ)</label>
                        <input
                          type="number"
                          className="input-field"
                          value={newLeadForm.estimated_value}
                          onChange={e => setNewLeadForm({ ...newLeadForm, estimated_value: parseInt(e.target.value) || 0 })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Nguồn Tiếp Cận</label>
                        <select
                          className="input-field"
                          value={newLeadForm.source}
                          onChange={e => setNewLeadForm({ ...newLeadForm, source: e.target.value })}
                        >
                          <option value="Web form">Web form</option>
                          <option value="Facebook">Facebook</option>
                          <option value="Zalo">Zalo</option>
                          <option value="Dien thoai">Điện thoại</option>
                          <option value="Gioi thieu">Giới thiệu</option>
                          <option value="DauThau.info">Đấu thầu</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>Nhu Cầu Dự Án / Ghi Chú</label>
                      <textarea
                        className="input-field"
                        rows={3}
                        placeholder="Nâng cấp hệ thống âm thanh Line Array, cấu hình loa sub..."
                        value={newLeadForm.demand}
                        onChange={e => setNewLeadForm({ ...newLeadForm, demand: e.target.value })}
                      />
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10, marginTop: 22, borderTop: '1px solid #E2E8F0', paddingTop: 14 }}>
                    <button
                      onClick={() => setShowNewLeadModal(false)}
                      className="btn-secondary"
                    >
                      Hủy Bỏ
                    </button>
                    <button
                      onClick={handleCreateNewLead}
                      className="btn-primary"
                      disabled={loading}
                    >
                      {loading ? 'Đang lưu...' : 'Lưu Lead Lên Airtable'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Kanban Columns (5 Stages) */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(5, minmax(260px, 1fr))',
              gap: 16,
              alignItems: 'start',
              overflowX: 'auto',
              paddingBottom: 24
            }}>
              {[
                {
                  id: 'New',
                  title: 'Lead Mới Tiếp Nhận',
                  accentColor: '#0284C7',
                  badgeBg: '#E0F2FE',
                  badgeColor: '#0369A1'
                },
                {
                  id: 'Qualified',
                  title: 'Khảo Sát & Demo',
                  accentColor: '#D97706',
                  badgeBg: '#FEF3C7',
                  badgeColor: '#B45309'
                },
                {
                  id: 'Dam phan',
                  title: 'Đàm Phán & Báo Giá',
                  accentColor: '#D31027',
                  badgeBg: '#FEE2E2',
                  badgeColor: '#B91C1C'
                },
                {
                  id: 'Won',
                  title: 'Ký Hợp Đồng (Won)',
                  accentColor: '#16A34A',
                  badgeBg: '#DCFCE7',
                  badgeColor: '#15803D'
                },
                {
                  id: 'Lost',
                  title: 'Thất Bại / Đã Hủy',
                  accentColor: '#64748B',
                  badgeBg: '#F1F5F9',
                  badgeColor: '#475569'
                }
              ].map(col => {
                const stageLeads = leads
                  .filter(l => (l.fields?.Stage || 'New') === col.id)
                  .filter(l => {
                    if (!leadSearch.trim()) return true;
                    const q = leadSearch.toLowerCase();
                    const cty = (l.fields?.['Ten cty Khach'] || '').toLowerCase();
                    const nlh = (l.fields?.['Nguoi lien he'] || '').toLowerCase();
                    const phone = (l.fields?.['So dien thoai'] || '').toLowerCase();
                    return cty.includes(q) || nlh.includes(q) || phone.includes(q);
                  });

                const totalColValue = stageLeads.reduce((sum, l) => sum + (l.fields?.['Gia tri uoc tinh'] || 0), 0);
                const isDragOver = dragOverCol === col.id;

                return (
                  <div
                    key={col.id}
                    onDragOver={e => handleDragOver(e, col.id)}
                    onDragLeave={e => handleDragLeave(e, col.id)}
                    onDrop={e => handleDropLead(e, col.id)}
                    style={{
                      background: isDragOver ? '#F8FAFC' : '#FFFFFF',
                      borderRadius: 14,
                      border: isDragOver ? `2px dashed ${col.accentColor}` : '1px solid #E2E8F0',
                      boxShadow: isDragOver ? '0 10px 15px -3px rgba(0,0,0,0.06)' : '0 1px 3px rgba(0,0,0,0.02)',
                      padding: '14px 12px',
                      minHeight: 560,
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.15s ease'
                    }}
                  >
                    {/* Column Header */}
                    <div style={{
                      paddingBottom: 10,
                      marginBottom: 12,
                      borderBottom: '1px solid #E2E8F0'
                    }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                        <span style={{ fontWeight: 800, fontSize: 13.5, color: col.accentColor }}>
                          {col.title}
                        </span>
                        <span style={{
                          background: col.badgeBg,
                          color: col.badgeColor,
                          padding: '2px 8px',
                          borderRadius: 20,
                          fontSize: 11,
                          fontWeight: 800
                        }}>
                          {stageLeads.length}
                        </span>
                      </div>
                      <div style={{ fontSize: 11.5, color: '#64748B', fontWeight: 600 }}>
                        {totalColValue.toLocaleString('vi-VN')} đ
                      </div>
                    </div>

                    {/* Cards Container */}
                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                      {stageLeads.length === 0 ? (
                        <div style={{
                          flex: 1,
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          textAlign: 'center',
                          padding: '40px 10px',
                          color: '#94A3B8',
                          fontSize: 12,
                          border: '1px dashed #CBD5E1',
                          borderRadius: 10
                        }}>
                          Kéo thẻ khách hàng vào đây
                        </div>
                      ) : (
                        stageLeads.map(lead => {
                          const f = lead.fields || {};
                          const score = f['Lead Score'] || 80;
                          const isBeingDragged = draggedLeadId === lead.id;

                          return (
                            <div
                              key={lead.id}
                              draggable={true}
                              onDragStart={e => handleDragStart(e, lead.id)}
                              style={{
                                background: '#FFFFFF',
                                border: '1px solid #E2E8F0',
                                borderRadius: 10,
                                padding: '12px 14px',
                                boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                                cursor: 'grab',
                                opacity: isBeingDragged ? 0.45 : 1,
                                transition: 'transform 0.15s ease, box-shadow 0.15s ease',
                                userSelect: 'none'
                              }}
                              onMouseEnter={e => e.currentTarget.style.boxShadow = '0 4px 10px rgba(0,0,0,0.08)'}
                              onMouseLeave={e => e.currentTarget.style.boxShadow = '0 1px 3px rgba(0,0,0,0.04)'}
                            >
                              {/* Card Header: Company & Score */}
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 8, marginBottom: 6 }}>
                                <span style={{ fontWeight: 800, fontSize: 13.5, color: '#0F172A', lineHeight: 1.3 }}>
                                  {f['Ten cty Khach'] || 'Chưa đặt tên'}
                                </span>
                                <span style={{
                                  background: score >= 85 ? '#FEE2E2' : '#FEF3C7',
                                  color: score >= 85 ? '#B91C1C' : '#B45309',
                                  fontSize: 10.5,
                                  fontWeight: 800,
                                  padding: '2px 6px',
                                  borderRadius: 4,
                                  whiteSpace: 'nowrap'
                                }}>
                                  Score: {score}
                                </span>
                              </div>

                              {/* Demand Excerpt */}
                              <p style={{
                                fontSize: 12,
                                color: '#475569',
                                margin: '0 0 10px 0',
                                lineHeight: 1.4,
                                display: '-webkit-box',
                                WebkitLineClamp: 2,
                                WebkitBoxOrient: 'vertical',
                                overflow: 'hidden'
                              }}>
                                {f['Nhu cau Du an'] || 'Quan tâm hệ thống âm thanh Phúc Thanh Audio'}
                              </p>

                              {/* Contact Details */}
                              <div style={{ fontSize: 11.5, color: '#64748B', marginBottom: 8 }}>
                                <span style={{ fontWeight: 600, color: '#334155' }}>{f['Nguoi lien he'] || 'Khách liên hệ'}</span>
                                {f['So dien thoai'] && <span> • {f['So dien thoai']}</span>}
                              </div>

                              {/* Card Footer: Value & Source */}
                              <div style={{
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center',
                                paddingTop: 8,
                                borderTop: '1px solid #F1F5F9',
                                fontSize: 12
                              }}>
                                <span style={{ fontWeight: 800, color: col.id === 'Won' ? '#16A34A' : '#D31027', fontSize: 13 }}>
                                  {(f['Gia tri uoc tinh'] || 0).toLocaleString('vi-VN')} đ
                                </span>
                                <span style={{
                                  background: '#F1F5F9',
                                  color: '#475569',
                                  fontSize: 10,
                                  fontWeight: 600,
                                  padding: '2px 7px',
                                  borderRadius: 4
                                }}>
                                  {f['Nguon lead'] || 'Web'}
                                </span>
                              </div>

                            </div>
                          );
                        })
                      )}
                    </div>

                  </div>
                );
              })}
            </div>

          </div>
        )}

        {/* ==================== TAB 5: WARRANTY HUB ==================== */}

        {/* ==================== TAB: KHO THIẾT BỊ & CẢNH BÁO TỒN (NV6) ==================== */}
        {activeTab === 'inventory' && (
          <div>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 22, flexWrap: 'wrap', gap: 16 }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Kho Thiết Bị & Cảnh Báo Tồn Kho</h2>
                  <span className="badge badge-red" style={{ fontSize: 11 }}>REALTIME AIRTABLE</span>
                </div>
                <p style={{ color: '#64748B', fontSize: 13, marginTop: 4 }}>
                  Theo dõi số lượng tồn, giá trị tồn kho thiết bị âm thanh và cảnh báo tự động khi chạm ngưỡng an toàn
                </p>
              </div>
              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={fetchInventory}
                  className="btn-secondary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                  disabled={loadingInventory}
                >
                  Đồng bộ kho
                </button>
                <button
                  onClick={() => {
                    if (inventoryData.items.length > 0) {
                      setTxForm(prev => ({ ...prev, product_id: inventoryData.items[0].sku, product_name: inventoryData.items[0].name }));
                    }
                    setShowTxModal(true);
                  }}
                  className="btn-primary"
                  style={{ display: 'flex', alignItems: 'center', gap: 6 }}
                >
                  + Tạo Phiếu Nhập / Xuất Kho
                </button>
              </div>
            </div>

            {/* 3 Metric Cards */}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 20, marginBottom: 24 }}>
              <div className="white-card" style={{ padding: 22 }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>TỔNG GIÁ TRỊ TỒN KHO</span>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
                  {(inventoryData.total_value || 0).toLocaleString('vi-VN')} đ
                </div>
                <p style={{ fontSize: 12, color: '#16A34A', fontWeight: 700, marginTop: 4 }}>
                  ● Định giá theo đơn giá nhập trung bình
                </p>
              </div>

              <div className="white-card" style={{ padding: 22 }}>
                <span style={{ fontSize: 12, color: '#64748B', fontWeight: 700, textTransform: 'uppercase' }}>TỔNG MÃ HÀNG (SKU)</span>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#0F172A', marginTop: 8 }}>
                  {inventoryData.total_skus || inventoryData.items.length || 0} Mặt Hàng
                </div>
                <p style={{ fontSize: 12, color: '#64748B', marginTop: 4 }}>
                  SR Made in Italy, LSS, Crown, Studiomaster
                </p>
              </div>

              <div className="white-card" style={{ padding: 22, borderLeft: '4px solid #D31027' }}>
                <span style={{ fontSize: 12, color: '#D31027', fontWeight: 700, textTransform: 'uppercase' }}>CẢNH BÁO TỒN TỐI THIỂU (LOW STOCK)</span>
                <div style={{ fontSize: 26, fontWeight: 900, color: '#D31027', marginTop: 8 }}>
                  {inventoryData.low_stock_count || 0} Thiết Bị Sắp Hết
                </div>
                <p style={{ fontSize: 12, color: '#B45309', fontWeight: 700, marginTop: 4 }}>
                  ⚠️ Cần gửi lệnh đặt hàng Nhà phân phối ngay
                </p>
              </div>
            </div>

            {/* Low Stock Alert Warning Banner */}
            {inventoryData.items.filter(it => it.stock <= it.min_threshold).length > 0 && (
              <div style={{
                background: '#FEF2F2',
                border: '1.5px solid #FECACA',
                borderRadius: 12,
                padding: '16px 20px',
                marginBottom: 24,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                flexWrap: 'wrap',
                gap: 12
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#FEE2E2', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#DC2626', fontSize: 18, fontWeight: 900 }}>
                    !
                  </div>
                  <div>
                    <h4 style={{ fontSize: 14.5, fontWeight: 800, color: '#991B1B', margin: 0 }}>
                      Cảnh Báo Tồn Kho: Có {inventoryData.items.filter(it => it.stock <= it.min_threshold).length} thiết bị chạm hoặc dưới ngưỡng an toàn (Min)!
                    </h4>
                    <div style={{ display: 'flex', gap: 8, marginTop: 4, flexWrap: 'wrap' }}>
                      {inventoryData.items.filter(it => it.stock <= it.min_threshold).map((it, idx) => (
                        <span key={idx} style={{ fontSize: 11.5, background: '#FFFFFF', border: '1px solid #FCA5A5', color: '#B91C1C', padding: '2px 8px', borderRadius: 6, fontWeight: 700 }}>
                          {it.name} (Tồn: {it.stock} {it.unit} / Min: {it.min_threshold})
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                <button
                  onClick={() => setInvFilter(invFilter === 'low_stock' ? 'all' : 'low_stock')}
                  className="btn-secondary"
                  style={{ fontSize: 12, padding: '6px 12px', background: '#FFFFFF', color: '#991B1B', borderColor: '#FCA5A5' }}
                >
                  {invFilter === 'low_stock' ? 'Xem Tất Cả Thiết Bị' : 'Lọc Thiết Bị Cần Nhập Gấp'}
                </button>
              </div>
            )}

            {/* Inventory Table */}
            <div className="white-card" style={{ padding: 22 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
                <h4 style={{ fontSize: 17, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                  Bảng Danh Mục Thiết Bị Âm Thanh & Số Lượng Tồn Kho
                </h4>
                <div style={{ display: 'flex', gap: 10 }}>
                  <button
                    onClick={() => setInvFilter('all')}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1px solid #E2E8F0',
                      background: invFilter === 'all' ? '#0F172A' : '#FFFFFF',
                      color: invFilter === 'all' ? '#FFFFFF' : '#475569',
                      cursor: 'pointer'
                    }}
                  >
                    Tất Cả ({inventoryData.items.length})
                  </button>
                  <button
                    onClick={() => setInvFilter('low_stock')}
                    style={{
                      padding: '5px 12px',
                      fontSize: 12,
                      fontWeight: 700,
                      borderRadius: 6,
                      border: '1px solid #FECACA',
                      background: invFilter === 'low_stock' ? '#DC2626' : '#FFFFFF',
                      color: invFilter === 'low_stock' ? '#FFFFFF' : '#DC2626',
                      cursor: 'pointer'
                    }}
                  >
                    Cần Nhập Gấp ({inventoryData.items.filter(it => it.stock <= it.min_threshold).length})
                  </button>
                </div>
              </div>

              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
                  <thead>
                    <tr style={{ background: '#F8FAFC', borderBottom: '2px solid #E2E8F0' }}>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Mã SKU</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Tên Thiết Bị</th>
                      <th style={{ padding: '12px 14px', textAlign: 'left', fontWeight: 800, color: '#334155' }}>Thương Hiệu</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>SL Tồn</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Ngưỡng Min</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Giá Nhập TB</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Giá Bán Niêm Yết</th>
                      <th style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#334155' }}>Thành Tiền Tồn</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Trạng Thái</th>
                      <th style={{ padding: '12px 14px', textAlign: 'center', fontWeight: 800, color: '#334155' }}>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inventoryData.items || [])
                      .filter(it => invFilter === 'all' || it.stock <= it.min_threshold)
                      .map((it, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #F1F5F9' }}>
                          <td style={{ padding: '12px 14px', fontWeight: 800, color: '#D31027' }}>{it.sku}</td>
                          <td style={{ padding: '12px 14px', fontWeight: 700, color: '#0F172A' }}>{it.name}</td>
                          <td style={{ padding: '12px 14px', color: '#475569' }}>
                            <span style={{ background: '#F1F5F9', padding: '3px 8px', borderRadius: 4, fontSize: 11.5, fontWeight: 600 }}>
                              {it.brand}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 900, color: it.stock <= it.min_threshold ? '#DC2626' : '#0F172A', fontSize: 14 }}>
                            {it.stock} {it.unit}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#64748B', fontWeight: 600 }}>
                            {it.min_threshold} {it.unit}
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', color: '#475569' }}>
                            {it.import_price?.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 700, color: '#0F172A' }}>
                            {it.sale_price?.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'right', fontWeight: 800, color: '#0369A1' }}>
                            {it.total_value?.toLocaleString('vi-VN')} đ
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <span style={{
                              display: 'inline-block',
                              padding: '3px 8px',
                              borderRadius: 999,
                              fontSize: 11,
                              fontWeight: 800,
                              background: it.status === 'Hết hàng' ? '#FEF2F2' : (it.status === 'Cần nhập gấp' ? '#FFFBEB' : '#F0FDF4'),
                              color: it.status === 'Hết hàng' ? '#DC2626' : (it.status === 'Cần nhập gấp' ? '#B45309' : '#15803D'),
                              border: `1px solid ${it.status === 'Hết hàng' ? '#FECACA' : (it.status === 'Cần nhập gấp' ? '#FDE68A' : '#BBF7D0')}`
                            }}>
                              {it.status}
                            </span>
                          </td>
                          <td style={{ padding: '12px 14px', textAlign: 'center' }}>
                            <button
                              onClick={() => {
                                setTxForm({
                                  product_id: it.sku,
                                  product_name: it.name,
                                  type: 'nhap',
                                  quantity: it.min_threshold * 2,
                                  reason: 'Nhập hàng dự trữ an toàn',
                                  staff_name: 'Thủ kho Nguyễn Văn Nam'
                                });
                                setShowTxModal(true);
                              }}
                              className="btn-secondary"
                              style={{ padding: '4px 10px', fontSize: 12 }}
                            >
                              Nhập/Xuất
                            </button>
                          </td>
                        </tr>
                      ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Modal Nhập/Xuất Kho Nhanh */}
            {showTxModal && (
              <div style={{
                position: 'fixed',
                inset: 0,
                background: 'rgba(15, 23, 42, 0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 9999,
                padding: 16
              }}>
                <div style={{
                  background: '#FFFFFF',
                  borderRadius: 16,
                  width: '100%',
                  maxWidth: 520,
                  padding: 24,
                  boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 8px 10px -6px rgba(0, 0, 0, 0.1)'
                }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
                    <h3 style={{ fontSize: 18, fontWeight: 800, color: '#0F172A', margin: 0 }}>
                      Tạo Phiếu Nhập / Xuất Kho Thiết Bị
                    </h3>
                    <button
                      onClick={() => setShowTxModal(false)}
                      style={{ background: 'none', border: 'none', fontSize: 20, cursor: 'pointer', color: '#64748B' }}
                    >
                      ×
                    </button>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Loại Giao Dịch Kho
                      </label>
                      <div style={{ display: 'flex', gap: 10 }}>
                        <button
                          type="button"
                          onClick={() => setTxForm({ ...txForm, type: 'nhap', reason: 'Nhập hàng từ nhà sản xuất' })}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 800,
                            border: `2px solid ${txForm.type === 'nhap' ? '#16A34A' : '#E2E8F0'}`,
                            background: txForm.type === 'nhap' ? '#DCFCE7' : '#FFFFFF',
                            color: txForm.type === 'nhap' ? '#15803D' : '#64748B',
                            cursor: 'pointer'
                          }}
                        >
                          + NHẬP KHO (Vào kho)
                        </button>
                        <button
                          type="button"
                          onClick={() => setTxForm({ ...txForm, type: 'xuat', reason: 'Xuất lắp đặt công trình dự án' })}
                          style={{
                            flex: 1,
                            padding: '10px',
                            borderRadius: 8,
                            fontSize: 13,
                            fontWeight: 800,
                            border: `2px solid ${txForm.type === 'xuat' ? '#D31027' : '#E2E8F0'}`,
                            background: txForm.type === 'xuat' ? '#FEF2F2' : '#FFFFFF',
                            color: txForm.type === 'xuat' ? '#D31027' : '#64748B',
                            cursor: 'pointer'
                          }}
                        >
                          - XUẤT KHO (Bán/Dự án)
                        </button>
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Thiết Bị Âm Thanh
                      </label>
                      <select
                        className="input-field"
                        value={txForm.product_id}
                        onChange={e => {
                          const selected = inventoryData.items.find(it => it.sku === e.target.value);
                          setTxForm({
                            ...txForm,
                            product_id: e.target.value,
                            product_name: selected?.name || e.target.value
                          });
                        }}
                      >
                        {inventoryData.items.map(it => (
                          <option key={it.sku} value={it.sku}>
                            [{it.sku}] {it.name} (Tồn: {it.stock} {it.unit})
                          </option>
                        ))}
                      </select>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                      <div>
                        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                          Số Lượng
                        </label>
                        <input
                          type="number"
                          min="1"
                          className="input-field"
                          value={txForm.quantity}
                          onChange={e => setTxForm({ ...txForm, quantity: Math.max(1, parseInt(e.target.value) || 1) })}
                        />
                      </div>
                      <div>
                        <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                          Người Thực Hiện
                        </label>
                        <input
                          type="text"
                          className="input-field"
                          value={txForm.staff_name}
                          onChange={e => setTxForm({ ...txForm, staff_name: e.target.value })}
                        />
                      </div>
                    </div>

                    <div>
                      <label style={{ fontSize: 12.5, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 6 }}>
                        Lý Do Nhập / Xuất Kho
                      </label>
                      <input
                        type="text"
                        className="input-field"
                        value={txForm.reason}
                        onChange={e => setTxForm({ ...txForm, reason: e.target.value })}
                      />
                    </div>

                    <div style={{ display: 'flex', gap: 10, marginTop: 10 }}>
                      <button
                        type="button"
                        onClick={() => setShowTxModal(false)}
                        className="btn-secondary"
                        style={{ flex: 1, padding: '11px', justifyContent: 'center' }}
                      >
                        Hủy Bỏ
                      </button>
                      <button
                        type="button"
                        onClick={handleCreateTx}
                        className="btn-primary"
                        style={{ flex: 1, padding: '11px', justifyContent: 'center' }}
                        disabled={loading}
                      >
                        {loading ? 'Đang lưu...' : 'Xác Nhận & Cập Nhật Tồn'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

          </div>
        )}


        {activeTab === 'warranties' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Trung Tâm Bảo Hành & Sửa Chữa (KTV)</h2>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
                Theo dõi tiếp nhận thiết bị, phân công kỹ thuật viên và gửi Zalo ZBS thông báo cho khách khi hoàn thành
              </p>
            </div>

            <div className="white-card" style={{ padding: 22 }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13.5 }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid #E2E8F0', color: '#64748B', textAlign: 'left', background: '#F8FAFC' }}>
                    <th style={{ padding: '10px 12px' }}>Mã Phiếu</th>
                    <th style={{ padding: '10px 12px' }}>Thiết bị</th>
                    <th style={{ padding: '10px 12px' }}>Serial / Model</th>
                    <th style={{ padding: '10px 12px' }}>Mô tả lỗi</th>
                    <th style={{ padding: '10px 12px' }}>Trạng thái</th>
                    <th style={{ padding: '10px 12px' }}>Thông báo Zalo</th>
                  </tr>
                </thead>
                <tbody>
                  {warranties.map(w => {
                    const f = w.fields || {};
                    return (
                      <tr key={w.id} style={{ borderBottom: '1px solid #F1F5F9' }}>
                        <td style={{ padding: '11px 12px', fontWeight: 800, color: '#D31027' }}>{f['Ma phieu BH'] || w.id}</td>
                        <td style={{ padding: '11px 12px', fontWeight: 700, color: '#0F172A' }}>{f['Ten thiet bi']}</td>
                        <td style={{ padding: '11px 12px', color: '#64748B' }}>{f['Model']} - {f['Serial Number']}</td>
                        <td style={{ padding: '11px 12px', color: '#D97706', fontWeight: 600 }}>{f['Mo ta loi']}</td>
                        <td style={{ padding: '11px 12px' }}>
                          <span className="badge badge-gold">{f['Trang thai'] || 'Đang xử lý'}</span>
                        </td>
                        <td style={{ padding: '11px 12px' }}>
                          <button
                            onClick={() => showToast(`Đã gửi tin ZBS thông báo lịch hẹn tới khách hàng!`)}
                            className="btn-success"
                            style={{ padding: '5px 12px', fontSize: 12 }}
                          >
                            Bắn ZBS
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ==================== TAB 6: ZALO ZBS WIFIM ==================== */}
        {activeTab === 'zbs' && (
          <div>
            <div style={{ marginBottom: 20 }}>
              <h2 style={{ fontSize: 24, fontWeight: 800, color: '#0F172A' }}>Quản Trị Tin Nhắn Zalo ZBS (WIFIM API)</h2>
              <p style={{ color: '#64748B', fontSize: 13, marginTop: 2 }}>
                Trình giả lập và gửi tin nhắn Chăm sóc khách hàng tự động qua 5 mẫu template Zalo OA đã được duyệt
              </p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>

              <div className="white-card" style={{ padding: 24 }}>
                <h4 style={{ fontSize: 16, fontWeight: 800, color: '#0F172A', marginBottom: 16 }}>Cấu Hình Gửi Tin ZBS</h4>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Chọn Mẫu Template Zalo</label>
                  <select
                    className="input-field"
                    value={zbsForm.template_id}
                    onChange={e => setZbsForm({ ...zbsForm, template_id: e.target.value })}
                  >
                    <option value="584044">Template 584044: Hợp đồng mẫu / Khởi động dự án</option>
                    <option value="422511">Template 422511: Xác nhận đơn hàng / Báo giá</option>
                    <option value="584045">Template 584045: Yêu cầu thanh toán / Nhắc nợ</option>
                    <option value="584042">Template 584042: Xác nhận lịch hẹn khảo sát / Bảo hành</option>
                    <option value="274649">Template 274649: Cảm ơn quý khách hoàn thành dịch vụ</option>
                  </select>
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Số Điện Thoại Nhận Tin</label>
                  <input
                    className="input-field"
                    value={zbsForm.phone}
                    onChange={e => setZbsForm({ ...zbsForm, phone: e.target.value })}
                  />
                </div>

                <div style={{ marginBottom: 12 }}>
                  <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Tên Khách Hàng (customer_name)</label>
                  <input
                    className="input-field"
                    value={zbsForm.customer_name}
                    onChange={e => setZbsForm({ ...zbsForm, customer_name: e.target.value })}
                  />
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 18 }}>
                  <div>
                    <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Mã Đơn / HĐ (order_code)</label>
                    <input
                      className="input-field"
                      value={zbsForm.order_code}
                      onChange={e => setZbsForm({ ...zbsForm, order_code: e.target.value })}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, color: '#475569', fontWeight: 600 }}>Số tiền (money)</label>
                    <input
                      className="input-field"
                      value={zbsForm.money}
                      onChange={e => setZbsForm({ ...zbsForm, money: e.target.value })}
                    />
                  </div>
                </div>

                <button
                  onClick={handleSendZBS}
                  className="btn-primary"
                  style={{ width: '100%', justifyContent: 'center' }}
                  disabled={loading}
                >
                  Gửi Tin Zalo ZBS Ngay
                </button>
              </div>

              {/* Mobile Phone Mockup Preview */}
              <div style={{ display: 'flex', justifyContent: 'center' }}>
                <div style={{
                  width: 320,
                  height: 480,
                  background: '#FFFFFF',
                  borderRadius: 36,
                  border: '8px solid #0F172A',
                  padding: '20px 16px',
                  boxShadow: '0 20px 40px -10px rgba(0,0,0,0.12)',
                  display: 'flex',
                  flexDirection: 'column'
                }}>
                  <div style={{ width: 50, height: 4, background: '#CBD5E1', borderRadius: 2, margin: '0 auto 16px' }}></div>

                  {/* Zalo OA Header */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, paddingBottom: 10, borderBottom: '1px solid #E2E8F0' }}>
                    <img
                      src="/logo.jpg"
                      alt="PT"
                      style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover' }}
                    />
                    <div>
                      <div style={{ fontSize: 12, fontWeight: 800, color: '#0F172A' }}>Phúc Thanh Audio OA</div>
                      <div style={{ fontSize: 10, color: '#16A34A', fontWeight: 600 }}>Tài khoản xác thực ✓</div>
                    </div>
                  </div>

                  {/* Message Bubble Preview */}
                  <div style={{
                    marginTop: 16,
                    background: '#F8FAFC',
                    borderRadius: 12,
                    padding: 12,
                    border: '1px solid #E2E8F0'
                  }}>
                    <div style={{ fontSize: 11, fontWeight: 800, color: '#D31027', marginBottom: 4 }}>
                      THÔNG BÁO TỰ ĐỘNG (ZBS)
                    </div>
                    <div style={{ fontSize: 12, color: '#334155', lineHeight: 1.5 }}>
                      Kính chào <b>{zbsForm.customer_name}</b>, Phúc Thanh Audio xin gửi thông báo:
                      <div style={{ marginTop: 6, padding: 8, background: '#FFFFFF', borderRadius: 6, border: '1px solid #E2E8F0' }}>
                        <div>• Mã giao dịch: <b>{zbsForm.order_code}</b></div>
                        <div>• Giá trị: <b style={{ color: '#D97706' }}>{zbsForm.money}</b></div>
                        <div>• Dịch vụ: {zbsForm.service}</div>
                      </div>
                      <div style={{ fontSize: 10, color: '#64748B', marginTop: 6 }}>
                        Ngày gửi: {new Date().toLocaleDateString('vi-VN')}
                      </div>
                    </div>
                  </div>

                </div>
              </div>

            </div>
          </div>
        )}

      </main>

      {/* Footer */}
      <footer style={{
        background: '#FFFFFF',
        borderTop: '1px solid #E2E8F0',
        padding: '14px 24px',
        fontSize: 12,
        color: '#64748B',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        maxWidth: 1440,
        margin: '0 auto',
        width: '100%'
      }}>
        <span>Phúc Thanh Audio Group © 2026 — Professional Audio System (Sound • Light • Technology).</span>
        <span style={{ color: '#D31027', fontWeight: 700 }}>Tư vấn & Lắp đặt Âm thanh Sân khấu • Hội trường • Karaoke VIP</span>
      </footer>
    </div>
  );
}
