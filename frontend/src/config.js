/**
 * Cấu hình hệ thống Frontend đọc từ biến môi trường (.env)
 * Cho phép tùy biến toàn diện khi deploy mà không cần can thiệp source code.
 */

// 1. API & Backend
export const API_BASE = import.meta.env.VITE_API_BASE || '/api/v1';

// 2. Thông tin thương hiệu
export const APP_TITLE = import.meta.env.VITE_APP_TITLE || 'Phúc Thanh Audio';
export const APP_SUBTITLE = import.meta.env.VITE_APP_SUBTITLE || 'Hệ Thống Quản Trị & Tự Động Hóa Chuyển Đổi Số';
export const COMPANY_NAME = import.meta.env.VITE_COMPANY_NAME || 'Công ty TNHH XNK TM DV Phúc Thanh Audio';
export const COMPANY_ADDRESS = import.meta.env.VITE_COMPANY_ADDRESS || '605 Lũy Bán Bích, P. Phú Thạnh, Q. Tân Phú, TP. Hồ Chí Minh';

// 3. Liên hệ & Hỗ trợ
export const HOTLINE = import.meta.env.VITE_HOTLINE || '0909.112.233';
export const ZALO_URL = import.meta.env.VITE_ZALO_URL || 'https://zalo.me/0909112233';

// 4. URL trang tiếp nhận công cộng (dùng sinh mã QR)
export const getPublicIntakeUrl = () => {
  const envUrl = import.meta.env.VITE_PUBLIC_INTAKE_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim();
  }
  return typeof window !== 'undefined' ? `${window.location.origin}/intake` : '/intake';
};
