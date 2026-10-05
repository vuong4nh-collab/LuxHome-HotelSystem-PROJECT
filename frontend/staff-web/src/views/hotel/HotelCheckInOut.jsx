import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchBookings,
  doCheckIn,
  doCheckOut,
  fetchInvoiceByBooking,
} from '../../services/bookingService';

const STATUS_LABEL = {
  Pending: 'Chờ xác nhận',
  Confirmed: 'Đã xác nhận',
  CheckedIn: 'Đang ở',
  CheckedOut: 'Đã trả phòng',
  Cancelled: 'Đã huỷ',
};

export default function HotelCheckInOut() {
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(null);
  // Modal checkout
  const [checkoutModal, setCheckoutModal] = useState(null); // booking object
  const [extraFee, setExtraFee] = useState('');
  const [extraNote, setExtraNote] = useState('');
  // Invoice preview
  const [invoiceData, setInvoiceData] = useState(null);
  const [invoiceLoading, setInvoiceLoading] = useState(false);

  const loadBookings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      // Lấy cả Confirmed + CheckedIn để hiển thị 2 cột
      const [confirmedRes, checkedInRes] = await Promise.all([
        fetchBookings({ status: 'Confirmed' }),
        fetchBookings({ status: 'CheckedIn' }),
      ]);
      setBookings([
        ...(confirmedRes.data || []),
        ...(checkedInRes.data || []),
      ]);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải dữ liệu check-in/out');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadBookings();
  }, [loadBookings]);

  const confirmedBookings = bookings.filter((b) => b.status === 'Confirmed');
  const checkedInBookings = bookings.filter((b) => b.status === 'CheckedIn');

  // Helpers để chuẩn hoá field API (snake_case) và mock (camelCase)
  const customerName = (b) => b.customer?.full_name || b.customerName || '—';
  const roomNumber = (b) => b.room?.room_number || b.roomNumber || '—';
  const phone = (b) => b.customer?.phone || b.phone || '—';
  const checkOutDate = (b) => b.checkout_date || b.checkOut || '—';

  // ─── Check-In ───────────────────────────────
  const handleCheckIn = async (booking) => {
    setActionLoading(booking.id);
    try {
      await doCheckIn(booking.id);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Check-in thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  // ─── Open checkout modal + load invoice preview ──
  const openCheckoutModal = async (booking) => {
    setCheckoutModal(booking);
    setExtraFee('');
    setExtraNote('');
    setInvoiceData(null);
    setInvoiceLoading(true);
    try {
      const res = await fetchInvoiceByBooking(booking.id);
      setInvoiceData(res.data);
    } catch {
      // Invoice chưa tồn tại — không sao, vẫn cho checkout
    } finally {
      setInvoiceLoading(false);
    }
  };

  // ─── Confirm Check-Out ──────────────────────
  const handleCheckOut = async () => {
    if (!checkoutModal) return;
    setActionLoading(checkoutModal.id);
    try {
      await doCheckOut(checkoutModal.id, {
        extra_fee: parseFloat(extraFee || '0'),
        extra_fee_note: extraNote,
      });
      setCheckoutModal(null);
      await loadBookings();
    } catch (err) {
      alert(err.response?.data?.message || 'Check-out thất bại');
    } finally {
      setActionLoading(null);
    }
  };

  const formatMoney = (val) =>
    (parseFloat(val) || 0).toLocaleString('vi-VN') + ' đ';

  if (loading) {
    return (
      <div className="tab-checkin">
        <div className="page-header">
          <h2>Quy Trình Check-In / Check-Out</h2>
          <p>Xử lý nhận phòng và thanh toán trả phòng cho khách hàng</p>
        </div>
        <div className="text-center" style={{ padding: '60px', color: 'var(--text-muted)' }}>
          ⏳ Đang tải dữ liệu...
        </div>
      </div>
    );
  }

  return (
    <div className="tab-checkin">
      <div className="page-header flex-between">
        <div>
          <h2>Quy Trình Check-In / Check-Out</h2>
          <p>Xử lý nhận phòng và thanh toán trả phòng cho khách hàng</p>
        </div>
        <button className="btn btn-outline" onClick={loadBookings}>
          ↻ Làm mới
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="grid-2col">
        {/* CỘT TRÁI: Dự kiến Check-In */}
        <div className="panel">
          <h3>📥 Dự Kiến Check-In Hôm Nay</h3>
          <div className="flow-list">
            {confirmedBookings.length === 0 && (
              <p className="text-muted">Không có check-in tồn đọng</p>
            )}
            {confirmedBookings.map((b) => {
              const busy = actionLoading === b.id;
              return (
                <div key={b.id} className="flow-item">
                  <div>
                    <h4>{customerName(b)} — P.{roomNumber(b)}</h4>
                    <p>Mã: {b.id} | SDT: {phone(b)}</p>
                    <p style={{ fontSize: '12px', color: 'var(--text-muted)' }}>
                      {STATUS_LABEL[b.status]}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-primary"
                    disabled={busy}
                    onClick={() => handleCheckIn(b)}
                  >
                    {busy ? '⏳ Đang xử lý...' : 'Xác Nhận Check-In 🔑'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>

        {/* CỘT PHẢI: Đang ở — Check-Out */}
        <div className="panel">
          <h3>📤 Đang Ở — Chuẩn Bị Check-Out</h3>
          <div className="flow-list">
            {checkedInBookings.length === 0 && (
              <p className="text-muted">Không có phòng sẵn sàng check-out</p>
            )}
            {checkedInBookings.map((b) => {
              const busy = actionLoading === b.id;
              return (
                <div key={b.id} className="flow-item">
                  <div>
                    <h4>{customerName(b)} — P.{roomNumber(b)}</h4>
                    <p>Mã: {b.id} | Ngày trả: {checkOutDate(b)}</p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-gold"
                    disabled={busy}
                    onClick={() => openCheckoutModal(b)}
                  >
                    {busy ? '⏳ Đang xử lý...' : 'Thanh Toán & Out 🧾'}
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* ─── MODAL CHECK-OUT ─── */}
      {checkoutModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Check-Out & Thanh Toán — P.{roomNumber(checkoutModal)}</h3>
              <button
                type="button"
                className="btn-close"
                onClick={() => setCheckoutModal(null)}
              >✕</button>
            </div>

            <div className="modal-body">
              {/* Thông tin khách */}
              <div className="invoice-meta grid-2col" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <p><strong>Khách hàng:</strong> {customerName(checkoutModal)}</p>
                  <p><strong>SĐT:</strong> {phone(checkoutModal)}</p>
                </div>
                <div>
                  <p><strong>Phòng:</strong> {roomNumber(checkoutModal)}</p>
                  <p><strong>Check-out dự kiến:</strong> {checkOutDate(checkoutModal)}</p>
                </div>
              </div>

              {/* Invoice preview */}
              {invoiceLoading ? (
                <p className="text-muted">⏳ Đang tải hóa đơn...</p>
              ) : invoiceData ? (
                <div className="invoice-summary" style={{ background: 'var(--bg-secondary, #f8f9fa)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền phòng:</span>
                    <strong>{formatMoney(invoiceData.room_charge)}</strong>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dịch vụ:</span>
                    <strong>{formatMoney(invoiceData.service_charge)}</strong>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Giảm giá:</span>
                    <strong>- {formatMoney(invoiceData.discount_amount)}</strong>
                  </p>
                  <hr />
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontWeight: 'bold', color: 'var(--primary, #321fdb)' }}>
                    <span>Tổng cộng (chưa VAT):</span>
                    <span>{formatMoney(invoiceData.total_amount || (parseFloat(invoiceData.room_charge || 0) + parseFloat(invoiceData.service_charge || 0) - parseFloat(invoiceData.discount_amount || 0)))}</span>
                  </p>
                </div>
              ) : (
                <p className="text-muted" style={{ marginBottom: '16px' }}>Chưa có hóa đơn — sẽ tạo khi xác nhận check-out.</p>
              )}

              {/* Phụ phí nếu có */}
              <div className="form-group">
                <label>Phụ phí phát sinh (nếu có)</label>
                <input
                  type="number"
                  className="form-control"
                  placeholder="0"
                  min="0"
                  value={extraFee}
                  onChange={(e) => setExtraFee(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Ghi chú phụ phí</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: Phí dịch vụ phòng, phí giờ trễ..."
                  value={extraNote}
                  onChange={(e) => setExtraNote(e.target.value)}
                />
              </div>
            </div>

            <div className="modal-footer">
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setCheckoutModal(null)}
              >
                Huỷ
              </button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#2eb85c', borderColor: '#2eb85c', color: '#fff' }}
                disabled={actionLoading === checkoutModal.id}
                onClick={handleCheckOut}
              >
                {actionLoading === checkoutModal.id ? '⏳ Đang xử lý...' : 'Xác Nhận Thu Tiền & Check-Out'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
