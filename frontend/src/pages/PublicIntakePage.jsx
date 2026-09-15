import React, { useState, useEffect } from 'react';
import { API_BASE, HOTLINE, ZALO_URL } from '../config';


export default function PublicIntakePage() {
  const [solutions, setSolutions] = useState([]);
  const [selectedSolution, setSelectedSolution] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);
  const [submittedData, setSubmittedData] = useState(null);

  useEffect(() => {
    fetch(`${API_BASE}/intake/solutions`)
      .then(r => r.json())
      .then(data => {
        if (data && data.packages && data.packages.length > 0) {
          const list = data.packages.map(p => ({
            id: p.id,
            label: p.name,
            desc: p.description
          }));
          setSolutions(list);
          setSelectedSolution(list[0].id);
        }
      })
      .catch(err => console.error("Error loading solutions:", err));
  }, []);

  const [formData, setFormData] = useState({
    customer_name: '',
    contact_name: '',
    phone: '',
    address: '',
    estimated_budget: '',
    notes: ''
  });

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.phone.trim()) {
      showToast('Vui lòng nhập số điện thoại hoặc Zalo để nhận tư vấn', 'error');
      return;
    }

    setLoading(true);
    try {
      const sol = solutions.find(s => s.id === selectedSolution) || solutions[0] || { id: 'karaoke_vip', label: 'Karaoke & VIP Lounge', desc: '' };
      const payload = {
        customer_name: formData.customer_name.trim() || 'Khách hàng quan tâm âm thanh',
        contact_name: formData.contact_name.trim() || formData.customer_name.trim() || 'Khách liên hệ',
        phone: formData.phone.trim(),
        address: formData.address.trim(),
        package_id: sol.id,
        package_name: sol.label,
        solution_type: sol.label,
        scale_info: formData.notes || sol.desc,
        preferred_brand: 'SR Italy / LSS / Studiomaster',
        estimated_budget: parseInt(formData.estimated_budget) || 0,
        source: 'Web Form Tinh Gọn (Zalo)',
        notes: formData.notes
      };

      const res = await fetch(`${API_BASE}/intake/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSubmittedData({
          ...data,
          customer_name: payload.customer_name,
          phone: payload.phone,
          solution_label: sol.label
        });
        showToast('Đã gửi yêu cầu tư vấn thành công!');
      } else {
        showToast(data.error || 'Lỗi gửi thông tin, vui lòng thử lại', 'error');
      }
    } catch (err) {
      showToast('Lỗi kết nối tới máy chủ tiếp nhận', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      width: '100%',
      background: '#F8FAFC',
      color: '#0F172A',
      fontFamily: "'Be Vietnam Pro', 'Inter', -apple-system, sans-serif",
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      padding: '24px 16px 60px',
      boxSizing: 'border-box'
    }}>

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
          boxShadow: '0 10px 25px rgba(0,0,0,0.12)',
          fontSize: 14,
          fontWeight: 700
        }}>
          {toast.msg}
        </div>
      )}

      {/* Top Utility */}
      <div style={{ width: '100%', maxWidth: 580, display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
        <a 
          href="/" 
          target="_blank" 
          rel="noopener noreferrer"
          style={{
            fontSize: 12,
            color: '#64748B',
            textDecoration: 'none',
            fontWeight: 600,
            background: '#FFFFFF',
            padding: '4px 10px',
            borderRadius: 6,
            border: '1px solid #E2E8F0'
          }}
        >
          Hệ thống Quản Trị ERP ↗
        </a>
      </div>

      {/* Header Container */}
      <header style={{ width: '100%', maxWidth: 580, textAlign: 'center', marginBottom: 20 }}>
        
        {/* Brand Badge */}
        <div style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 10,
          background: '#FFFFFF',
          border: '1px solid #E2E8F0',
          padding: '6px 18px',
          borderRadius: 999,
          boxShadow: '0 2px 6px rgba(0,0,0,0.03)',
          marginBottom: 12
        }}>
          <img 
            src="/logo.jpg" 
            alt="Phúc Thanh Audio" 
            style={{ width: 30, height: 30, borderRadius: '50%', border: '2px solid #D31027', objectFit: 'cover' }}
          />
          <div style={{ textAlign: 'left' }}>
            <span style={{ fontSize: 13, fontWeight: 900, color: '#0F172A' }}>
              PHÚC THANH <span style={{ color: '#D31027' }}>AUDIO</span>
            </span>
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 900, color: '#0F172A', margin: '0 0 6px 0' }}>
          Đăng Ký Tư Vấn & Báo Giá Âm Thanh
        </h1>
        <p style={{ fontSize: 13.5, color: '#64748B', margin: 0, lineHeight: 1.4 }}>
          Nhận phương án cấu hình chuẩn và báo giá dự toán trong vòng 15 phút
        </p>
      </header>

      {/* Form Container */}
      <main style={{ width: '100%', maxWidth: 580 }}>
        {submittedData ? (
          /* Màn hình thành công tinh gọn */
          <div style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: '36px 26px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)',
            textAlign: 'center'
          }}>
            <div style={{
              width: 54,
              height: 54,
              borderRadius: '50%',
              background: '#DCFCE7',
              color: '#16A34A',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 26,
              fontWeight: 900,
              margin: '0 auto 14px'
            }}>
              ✓
            </div>
            <h2 style={{ fontSize: 20, fontWeight: 800, color: '#0F172A', marginBottom: 6 }}>
              Tiếp Nhận Thành Công!
            </h2>
            <p style={{ color: '#64748B', fontSize: 13.5, margin: '0 0 20px 0' }}>
              Kỹ thuật viên Phúc Thanh Audio sẽ liên hệ với số <strong>{submittedData.phone}</strong> qua Zalo hoặc cuộc gọi để gửi phương án chi tiết.
            </p>

            <div style={{ background: '#F8FAFC', border: '1px solid #E2E8F0', borderRadius: 10, padding: 16, textAlign: 'left', marginBottom: 22, fontSize: 13 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Mã phiếu yêu cầu:</span>
                <span style={{ fontWeight: 800, color: '#D31027' }}>{submittedData.tracking_code}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
                <span style={{ color: '#64748B' }}>Nhu cầu tư vấn:</span>
                <span style={{ fontWeight: 700, color: '#0F172A' }}>{submittedData.solution_label}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: '#64748B' }}>Trạng thái xử lý:</span>
                <span style={{ color: '#16A34A', fontWeight: 700 }}>Đã chuyển kỹ sư phụ trách</span>
              </div>
            </div>

            <div style={{ display: 'flex', gap: 10, justifyContent: 'center' }}>
              <a
                href={ZALO_URL}
                target="_blank"
                rel="noreferrer"
                style={{
                  background: '#0068FF',
                  color: '#FFFFFF',
                  textDecoration: 'none',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 700
                }}
              >
                Nhắn Zalo Kỹ Sư ({HOTLINE})
              </a>
              <button
                type="button"
                onClick={() => setSubmittedData(null)}
                style={{
                  background: '#F1F5F9',
                  color: '#334155',
                  border: '1px solid #E2E8F0',
                  padding: '10px 18px',
                  borderRadius: 8,
                  fontSize: 13.5,
                  fontWeight: 700,
                  cursor: 'pointer'
                }}
              >
                Gửi Thêm Yêu Cầu
              </button>
            </div>
          </div>
        ) : (
          /* Form Tinh Gọn 1 Khối Thân Thiện */
          <form onSubmit={handleSubmit} style={{
            background: '#FFFFFF',
            borderRadius: 16,
            border: '1px solid #E2E8F0',
            padding: '24px 22px',
            boxShadow: '0 4px 20px -2px rgba(0,0,0,0.04)'
          }}>

            {/* Bước 1: Chọn Nhu Cầu Nhanh */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: 8 }}>
                1. Nhu cầu âm thanh của bạn là gì?
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: 8 }}>
                {solutions.map(sol => {
                  const isSelected = selectedSolution === sol.id;
                  return (
                    <button
                      key={sol.id}
                      type="button"
                      onClick={() => setSelectedSolution(sol.id)}
                      style={{
                        background: isSelected ? '#FEF2F2' : '#FFFFFF',
                        border: isSelected ? '2px solid #D31027' : '1px solid #CBD5E1',
                        borderRadius: 10,
                        padding: '10px 8px',
                        cursor: 'pointer',
                        textAlign: 'center',
                        transition: 'all 0.15s ease'
                      }}
                    >
                      <div style={{ fontSize: 13, fontWeight: 800, color: isSelected ? '#D31027' : '#0F172A' }}>
                        {sol.label}
                      </div>
                      <div style={{ fontSize: 11, color: isSelected ? '#B91C1C' : '#64748B', marginTop: 2 }}>
                        {sol.desc}
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Bước 2: Thông tin liên hệ nhanh */}
            <div style={{ marginBottom: 18 }}>
              <label style={{ fontSize: 13, fontWeight: 800, color: '#0F172A', display: 'block', marginBottom: 10 }}>
                2. Thông tin nhận tư vấn & báo giá
              </label>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                
                {/* Số điện thoại / Zalo */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Số điện thoại / Zalo nhận báo giá <span style={{ color: '#D31027' }}>*</span>
                  </label>
                  <input 
                    type="tel"
                    required
                    placeholder="Ví dụ: 0908 123 456..."
                    value={formData.phone}
                    onChange={e => setFormData({...formData, phone: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '10px 14px',
                      borderRadius: 8,
                      border: '1.5px solid #CBD5E1',
                      fontSize: 14,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Tên Quán / Doanh Nghiệp / Cá Nhân */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Tên Quán / Dự Án / Đơn Vị
                    </label>
                    <input 
                      type="text"
                      placeholder="Karaoke King Club, Cafe Mộc..."
                      value={formData.customer_name}
                      onChange={e => setFormData({...formData, customer_name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13.5,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                  <div>
                    <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                      Người liên hệ (Tùy chọn)
                    </label>
                    <input 
                      type="text"
                      placeholder="Anh Nam, Chị Lan..."
                      value={formData.contact_name}
                      onChange={e => setFormData({...formData, contact_name: e.target.value})}
                      style={{
                        width: '100%',
                        padding: '9px 12px',
                        borderRadius: 8,
                        border: '1px solid #CBD5E1',
                        fontSize: 13.5,
                        boxSizing: 'border-box'
                      }}
                    />
                  </div>
                </div>

                {/* Địa chỉ / Khu vực */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Khu vực hoặc địa chỉ lắp đặt (Tùy chọn)
                  </label>
                  <input 
                    type="text"
                    placeholder="Quận/Huyện, Tỉnh/Thành phố..."
                    value={formData.address}
                    onChange={e => setFormData({...formData, address: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

                {/* Ngân sách dự kiến */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Mức đầu tư dự kiến
                  </label>
                  <select
                    value={formData.estimated_budget}
                    onChange={e => setFormData({...formData, estimated_budget: parseInt(e.target.value) || 0})}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13.5,
                      background: '#FFFFFF',
                      boxSizing: 'border-box'
                    }}
                  >
                    <option value={50000000}>Tiết kiệm: Dưới 50 - 100 Triệu</option>
                    <option value={150000000}>Tiêu chuẩn: 100 - 250 Triệu</option>
                    <option value={350000000}>Cao cấp: 250 - 500 Triệu</option>
                    <option value={800000000}>Dự án lớn / Sân khấu: Trên 500 Triệu</option>
                  </select>
                </div>

                {/* Ghi chú */}
                <div>
                  <label style={{ fontSize: 12, fontWeight: 700, color: '#334155', display: 'block', marginBottom: 4 }}>
                    Mô tả thêm nhu cầu (nếu có)
                  </label>
                  <textarea 
                    rows={2}
                    placeholder="Ví dụ: Phòng 35m2 cần 1 cặp loa sub và 2 cặp loa full..."
                    value={formData.notes}
                    onChange={e => setFormData({...formData, notes: e.target.value})}
                    style={{
                      width: '100%',
                      padding: '9px 12px',
                      borderRadius: 8,
                      border: '1px solid #CBD5E1',
                      fontSize: 13.5,
                      boxSizing: 'border-box'
                    }}
                  />
                </div>

              </div>
            </div>

            {/* Nút gửi */}
            <button
              type="submit"
              disabled={loading}
              style={{
                width: '100%',
                background: '#D31027',
                color: '#FFFFFF',
                border: 'none',
                borderRadius: 10,
                padding: '13px 20px',
                fontSize: 15,
                fontWeight: 800,
                cursor: 'pointer',
                boxShadow: '0 4px 14px rgba(211,16,39,0.25)'
              }}
            >
              {loading ? 'Đang gửi thông tin...' : 'Gửi Yêu Cầu Tư Vấn & Báo Giá Miễn Phí'}
            </button>

            <div style={{ textAlign: 'center', marginTop: 12, fontSize: 12, color: '#94A3B8' }}>
              Cam kết bảo mật thông tin • Kỹ sư gọi lại tư vấn trong 15 phút
            </div>

          </form>
        )}
      </main>

    </div>
  );
}
