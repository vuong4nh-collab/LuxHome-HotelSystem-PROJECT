/**
 * bookingService.js
 * Centralized API calls for Booking, Check-In/Out, and Invoice modules.
 * Uses the shared axios instance from api.js (token & 401 handling baked in).
 */
import api from '../api';

// ─────────────────────────────────────────────
//  BOOKINGS
// ─────────────────────────────────────────────

/** Lấy danh sách đặt phòng (phân trang + lọc theo status / date range) */
export const fetchBookings = (params = {}) =>
  api.get('/bookings', { params }).then((r) => r.data);

/** Lấy chi tiết một booking */
export const fetchBookingById = (id) =>
  api.get(`/bookings/${id}`).then((r) => r.data);

/** Tạo đặt phòng mới (staff direct walk-in hoặc từ luồng booking) */
export const createBooking = (payload) =>
  api.post('/bookings', payload).then((r) => r.data);

/** Xác nhận booking Pending → Confirmed */
export const confirmBookingApi = (id) =>
  api.put(`/bookings/${id}/confirm`).then((r) => r.data);

/** Huỷ booking */
export const cancelBookingApi = (id, reason) =>
  api.put(`/bookings/${id}/cancel`, { cancellation_reason: reason }).then((r) => r.data);

/** Booking của khách đang đăng nhập (customer portal) */
export const fetchMyBookings = () =>
  api.get('/bookings/my').then((r) => r.data);

// ─────────────────────────────────────────────
//  CHECK-IN / CHECK-OUT
// ─────────────────────────────────────────────

/** Xác nhận check-in — chuyển trạng thái sang CheckedIn, tạo invoice Draft */
export const doCheckIn = (bookingId) =>
  api.post(`/checkin/${bookingId}`).then((r) => r.data);

/** Xác nhận check-out — tính phụ phí, phát sinh task buồng phòng */
export const doCheckOut = (bookingId, payload = {}) =>
  api.post(`/checkout/${bookingId}`, payload).then((r) => r.data);

// ─────────────────────────────────────────────
//  INVOICES
// ─────────────────────────────────────────────

/** Lấy danh sách hoá đơn (lọc theo status / customer_id) */
export const fetchInvoices = (params = {}) =>
  api.get('/invoices', { params }).then((r) => r.data);

/** Chi tiết hoá đơn (kèm items + payments) */
export const fetchInvoiceById = (id) =>
  api.get(`/invoices/${id}`).then((r) => r.data);

/** Hoá đơn theo booking */
export const fetchInvoiceByBooking = (bookingId) =>
  api.get(`/invoices/booking/${bookingId}`).then((r) => r.data);

/** Thanh toán hoá đơn */
export const processPayment = (invoiceId, payload) =>
  api.post(`/invoices/${invoiceId}/pay`, payload).then((r) => r.data);
