import React, { useState, useEffect, useCallback } from 'react';
import { fetchBookings, confirmBookingApi, cancelBookingApi } from '../../services/bookingService';

const STATUS_LABEL = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đang ở',
  CheckedOut: 'Đã trả phòng',
  Cancelled: 'Đã huỷ',
  NoShow: 'Không đến',
};

const STATUS_CLASS = {
  Pending: 'pending',
  Confirmed: 'confirmed',
  CheckedIn: 'checkedin',
  CheckedOut: 'checkedout',
  Cancelled: 'cancelled',
  NoShow: 'noshow',
};

export default function HotelBookings({ onOpenNewBooking, onOpenInvoice }) {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [actionLoading, setActionLoading] = useState(null); // bookingId đang thực hiện

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await fetchBookings(params);
      setBookings(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách đặt phòng');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const handleConfirm = async (booking) => {
    if (!window.confirm(`Xác nhận booking ${booking.id}?`)) return;
    setActionLoading(booking.id);
    try {
      await confirmBookingApi(booking.id);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể xác nhận booking');
    } finally {
      setActionLoading(null);
    }
  };

  const handleCancel = async (booking) => {
    const reason = window.prompt('Lý do huỷ (tùy chọn):');
    if (reason === null) return; // user nhấn Cancel trên prompt
    setActionLoading(booking.id);
    try {
      await cancelBookingApi(booking.id, reason);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể huỷ booking');
    } finally {
      setActionLoading(null);
    }
  };

  // Chuẩn hoá field từ API backend (snake_case) sang hiển thị
  const getCustomerName = (bk) =>
    bk.customer?.full_name || bk.customerName || '—';
  const getPhone = (bk) =>
    bk.customer?.phone || bk.phone || '—';
  const getRoomNumber = (bk) =>
    bk.room?.room_number || bk.roomNumber || '—';
  const getCheckIn = (bk) =>
    bk.checkin_date || bk.checkIn || '—';
  const getCheckOut = (bk) =>
    bk.checkout_date || bk.checkOut || '—';
  const getTotal = (bk) =>
    (bk.room_price_total ?? bk.totalPrice ?? 0).toLocaleString('vi-VN');
  const getDeposit = (bk) =>
    (bk.deposit ?? 0).toLocaleString('vi-VN');

  return (
    <div className="tab-bookings">
      <div className="page-header flex-between">
        <div>
          <h2>Danh Sách Đặt Phòng</h2>
          <p>Quản lý toàn bộ thông tin đặt phòng trước và hiện tại</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button className="btn btn-outline" onClick={loadBookings} disabled={loading}>
            ↻ Làm mới
          </button>
          <button className="btn btn-gold" onClick={onOpenNewBooking}>
            + Đặt Phòng Trực Tiếp
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="panel">
        {loading ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            <span>⏳ Đang tải dữ liệu...</span>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            Không có đặt phòng nào{statusFilter ? ` với trạng thái "${STATUS_LABEL[statusFilter]}"` : ''}.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Mã Đặt</th>
                <th>Khách Hàng</th>
                <th>Số Điện Thoại</th>
                <th>Phòng</th>
                <th>Ngày Nhận</th>
                <th>Ngày Trả</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((bk) => {
                const busy = actionLoading === bk.id;
                return (
                  <tr key={bk.id}>
                    <td><strong>{bk.id}</strong></td>
                    <td>{getCustomerName(bk)}</td>
                    <td>{getPhone(bk)}</td>
                    <td><span className="room-pill">P.{getRoomNumber(bk)}</span></td>
                    <td>{getCheckIn(bk)}</td>
                    <td>{getCheckOut(bk)}</td>
                    <td>{getTotal(bk)} đ</td>
                    <td>
                      <span className={`status-badge ${STATUS_CLASS[bk.status] || ''}`}>
                        {STATUS_LABEL[bk.status] || bk.status}
                      </span>
                    </td>
                    <td style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      {bk.status === 'Pending' && (
                        <button
                          className="btn btn-sm btn-primary"
                          disabled={busy}
                          onClick={() => handleConfirm(bk)}
                        >
                          {busy ? '...' : 'Xác nhận'}
                        </button>
                      )}
                      {['Pending', 'Confirmed'].includes(bk.status) && (
                        <button
                          className="btn btn-sm btn-danger"
                          disabled={busy}
                          onClick={() => handleCancel(bk)}
                        >
                          {busy ? '...' : 'Huỷ'}
                        </button>
                      )}
                      <button
                        className="btn btn-sm btn-outline"
                        onClick={() => onOpenInvoice(bk)}
                      >
                        In Hóa Đơn
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
