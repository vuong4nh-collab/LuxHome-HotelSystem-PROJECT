import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle2, BedDouble, Calendar, MapPin, AlertCircle,
  CreditCard, XCircle, ArrowRight, RefreshCw, QrCode, ReceiptText, ChevronRight
} from 'lucide-react';
import api from '../api';

const STATUS_TABS = [
  { id: 'pending', label: 'Chờ thanh toán', apiStatus: ['Pending'] },
  { id: 'confirmed', label: 'Đã đặt', apiStatus: ['Confirmed'] },
  { id: 'staying', label: 'Đang lưu trú', apiStatus: ['CheckedIn'] },
  { id: 'completed', label: 'Đã hoàn thành', apiStatus: ['CheckedOut'] },
  { id: 'cancelled', label: 'Đã hủy', apiStatus: ['Cancelled', 'NoShow'] },
];

export default function OrdersTab({
  user,
  localBookings = [],
  onGoToCheckIn,
  onGoToQR,
  onGoToCheckout,
  onBookAgain,
  onRequireAuth
}) {
  const [activeSubTab, setActiveSubTab] = useState('pending');
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [cancelModalBooking, setCancelModalBooking] = useState(null);
  const [cancelReason, setCancelReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    setError('');
    try {
      if (user) {
        const { data } = await api.get('/bookings/my');
        const fetched = data?.data || [];
        // Normalize
        const normalized = fetched.map(b => ({
          id: b.id,
          code: `BK${String(b.id).padStart(4, '0')}`,
          roomName: b.room?.roomType?.name || `Phòng ${b.room?.room_number || ''}`,
          roomNumber: b.room?.room_number || 'Sắp xếp khi nhận phòng',
          hotelName: b.room?.roomType?.hotel_name || 'LuxStay Grand Resort & Spa',
          checkIn: b.checkin_date,
          checkOut: b.checkout_date,
          totalPrice: Number(b.room_price_total || 0),
          status: b.status,
          raw: b,
        }));
        setBookings(normalized);
      } else {
        // Fallback local bookings
        const mappedLocal = (localBookings || []).map((b, idx) => ({
          id: b.id || idx + 1,
          code: b.code || (typeof b.id === 'string' ? b.id : `BK${String(b.id || idx + 1).padStart(4, '0')}`),
          roomName: b.roomName || 'Phòng Deluxe Hướng Biển',
          roomNumber: b.roomNumber || '101',
          hotelName: b.hotelName || 'LuxStay Grand Hotel',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          totalPrice: Number(b.totalPrice || 0),
          status: b.status?.includes('Active') || b.status?.includes('Nhận Phòng') ? 'CheckedIn'
            : b.status?.includes('Confirmed') ? 'Confirmed'
            : b.status?.includes('Hủy') ? 'Cancelled'
            : b.status || 'Confirmed',
          raw: b,
        }));
        setBookings(mappedLocal);
      }
    } catch (err) {
      console.warn('Could not fetch bookings:', err);
      // Fallback
      if (localBookings?.length) {
        setBookings(localBookings.map((b, idx) => ({
          id: b.id || idx + 1,
          code: typeof b.id === 'string' ? b.id : `BK${String(b.id).padStart(4, '0')}`,
          roomName: b.roomName || 'Deluxe Ocean View',
          roomNumber: b.roomNumber || '101',
          hotelName: 'LuxStay Grand',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          totalPrice: Number(b.totalPrice || 0),
          status: b.status || 'Confirmed',
          raw: b,
        })));
      } else {
        setError('Không thể tải danh sách đơn đặt. Vui lòng thử lại.');
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, localBookings]);

  const formatCurrency = (val) =>
    Number(val || 0).toLocaleString('vi-VN') + ' đ';

  const filterBookings = (subTabId) => {
    const tabDef = STATUS_TABS.find(t => t.id === subTabId);
    if (!tabDef) return [];
    return bookings.filter(b => {
      const st = String(b.status || '').toLowerCase();
      return tabDef.apiStatus.some(target => target.toLowerCase() === st);
    });
  };

  const getCountForTab = (subTabId) => {
    return filterBookings(subTabId).length;
  };

  const handleCancelBooking = async () => {
    if (!cancelModalBooking) return;
    setActionLoading(true);
    try {
      if (user && cancelModalBooking.id && !String(cancelModalBooking.id).startsWith('local')) {
        await api.put(`/bookings/${cancelModalBooking.id}/cancel`, {
          cancellation_reason: cancelReason || 'Khách yêu cầu hủy qua ứng dụng'
        });
      }
      setBookings(prev => prev.map(b => b.id === cancelModalBooking.id ? { ...b, status: 'Cancelled' } : b));
      setCancelModalBooking(null);
      setCancelReason('');
      alert('Đã hủy đơn đặt phòng thành công.');
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể hủy đơn này lúc này.');
    } finally {
      setActionLoading(false);
    }
  };

  const currentList = filterBookings(activeSubTab);

  return (
    <main className="tab-orders-view">
      {/* Top Header */}
      <div className="tab-orders-header">
        <div className="section-title" style={{ padding: 0, margin: 0 }}>
          <span>Đơn Hàng Của Tôi</span>
        </div>
        <button
          type="button"
          className="refresh-btn"
          onClick={fetchBookings}
          disabled={loading}
          title="Làm mới"
        >
          <RefreshCw size={16} className={loading ? 'spin-icon' : ''} />
        </button>
      </div>

      {/* Sub-tabs / Status Pills */}
      <div className="orders-subtabs-scroll">
        <div className="orders-subtabs">
          {STATUS_TABS.map((tab) => {
            const count = getCountForTab(tab.id);
            const isActive = activeSubTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                className={`order-subtab-btn ${isActive ? 'active' : ''}`}
                onClick={() => setActiveSubTab(tab.id)}
              >
                <span>{tab.label}</span>
                {count > 0 && <span className="tab-badge">{count}</span>}
              </button>
            );
          })}
        </div>
      </div>

      {/* Booking List */}
      <div className="orders-content-area">
        {loading ? (
          <div className="orders-empty-state">
            <RefreshCw size={24} className="spin-icon" style={{ margin: '0 auto 8px', color: 'var(--brand-primary)' }} />
            <p>Đang tải đơn hàng...</p>
          </div>
        ) : error ? (
          <div className="orders-empty-state">
            <AlertCircle size={28} style={{ margin: '0 auto 8px', color: 'var(--status-error)' }} />
            <p>{error}</p>
            <button type="button" className="btn-secondary-sm" onClick={fetchBookings} style={{ marginTop: '10px' }}>Thử lại</button>
          </div>
        ) : currentList.length === 0 ? (
          <div className="orders-empty-state">
            <div className="empty-icon-wrap">
              {activeSubTab === 'pending' ? <Clock size={32} />
                : activeSubTab === 'confirmed' ? <CheckCircle2 size={32} />
                : activeSubTab === 'staying' ? <BedDouble size={32} />
                : activeSubTab === 'completed' ? <ReceiptText size={32} />
                : <XCircle size={32} />}
            </div>
            <h3>Không có đơn hàng nào</h3>
            <p>
              {activeSubTab === 'pending' ? 'Bạn không có đơn nào đang chờ thanh toán.'
                : activeSubTab === 'confirmed' ? 'Không có đơn đặt phòng nào sắp tới.'
                : activeSubTab === 'staying' ? 'Bạn hiện không có chuyến lưu trú nào đang diễn ra.'
                : activeSubTab === 'completed' ? 'Chưa có kỳ nghỉ nào hoàn thành.'
                : 'Chưa có đơn hàng nào bị hủy.'}
            </p>
            {onBookAgain && (
              <button type="button" className="btn-explore-sm" onClick={onBookAgain}>
                Đặt phòng ngay <ArrowRight size={14} />
              </button>
            )}
          </div>
        ) : (
          <div className="orders-list">
            {currentList.map((bk) => (
              <article key={bk.id} className="order-booking-card">
                <div className="order-card-header">
                  <div className="order-code-wrap">
                    <span className="order-code">{bk.code}</span>
                    <span className={`order-status-pill status-${bk.status.toLowerCase()}`}>
                      {bk.status === 'Pending' ? 'Chờ thanh toán'
                        : bk.status === 'Confirmed' ? 'Đã xác nhận'
                        : bk.status === 'CheckedIn' ? 'Đang lưu trú'
                        : bk.status === 'CheckedOut' ? 'Đã hoàn thành'
                        : 'Đã hủy'}
                    </span>
                  </div>
                  <span className="order-price">{formatCurrency(bk.totalPrice)}</span>
                </div>

                <div className="order-card-body" onClick={() => setSelectedBooking(bk)}>
                  <h4 className="order-room-name">{bk.roomName}</h4>
                  <div className="order-meta-row">
                    <span><BedDouble size={14} /> Phòng: <strong>{bk.roomNumber}</strong></span>
                  </div>
                  <div className="order-meta-row">
                    <span><Calendar size={14} /> {bk.checkIn} → {bk.checkOut}</span>
                  </div>
                </div>

                {/* Actions per status */}
                <div className="order-card-actions">
                  {bk.status === 'Pending' && (
                    <>
                      <button
                        type="button"
                        className="btn-action-primary"
                        onClick={() => setShowPaymentModal(bk)}
                      >
                        <CreditCard size={15} /> Thanh toán ngay
                      </button>
                      <button
                        type="button"
                        className="btn-action-outline-danger"
                        onClick={() => setCancelModalBooking(bk)}
                      >
                        Hủy đơn
                      </button>
                    </>
                  )}

                  {bk.status === 'Confirmed' && (
                    <>
                      <button
                        type="button"
                        className="btn-action-primary"
                        onClick={() => onGoToCheckIn && onGoToCheckIn(bk)}
                      >
                        <CheckCircle2 size={15} /> Online Check-in
                      </button>
                      <button
                        type="button"
                        className="btn-action-outline-danger"
                        onClick={() => setCancelModalBooking(bk)}
                      >
                        Hủy đặt
                      </button>
                    </>
                  )}

                  {bk.status === 'CheckedIn' && (
                    <>
                      <button
                        type="button"
                        className="btn-action-primary"
                        onClick={() => onGoToQR && onGoToQR(bk)}
                      >
                        <QrCode size={15} /> Chìa khóa QR
                      </button>
                      <button
                        type="button"
                        className="btn-action-outline"
                        onClick={() => onGoToCheckout && onGoToCheckout(bk)}
                      >
                        Trả phòng
                      </button>
                    </>
                  )}

                  {bk.status === 'CheckedOut' && (
                    <>
                      <button
                        type="button"
                        className="btn-action-primary"
                        onClick={onBookAgain}
                      >
                        Đặt lại kỳ nghỉ
                      </button>
                      <button
                        type="button"
                        className="btn-action-outline"
                        onClick={() => setSelectedBooking(bk)}
                      >
                        <ReceiptText size={15} /> Chi tiết hóa đơn
                      </button>
                    </>
                  )}

                  {bk.status === 'Cancelled' && (
                    <div className="cancelled-note">
                      <span>Đơn đặt phòng đã được hủy thành công.</span>
                    </div>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* DETAIL MODAL */}
      {selectedBooking && (
        <div className="modal-pwa" onClick={() => setSelectedBooking(null)}>
          <div className="modal-pwa-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-pwa">
              <h3>Chi tiết đơn đặt phòng {selectedBooking.code}</h3>
              <button type="button" className="close-btn" onClick={() => setSelectedBooking(null)}>✕</button>
            </div>
            <div className="modal-body-pwa">
              <div className="detail-status-banner">
                <span>Trạng thái:</span>
                <strong>
                  {selectedBooking.status === 'Pending' ? 'Chờ thanh toán'
                    : selectedBooking.status === 'Confirmed' ? 'Đã đặt (Sẵn sàng check-in)'
                    : selectedBooking.status === 'CheckedIn' ? 'Đang lưu trú tại khách sạn'
                    : selectedBooking.status === 'CheckedOut' ? 'Đã hoàn thành lưu trú'
                    : 'Đã hủy'}
                </strong>
              </div>

              <div className="detail-section">
                <h4>Thông tin phòng</h4>
                <p><strong>Loại phòng:</strong> {selectedBooking.roomName}</p>
                <p><strong>Số phòng:</strong> {selectedBooking.roomNumber}</p>
                <p><strong>Nhận phòng:</strong> 14:00 - {selectedBooking.checkIn}</p>
                <p><strong>Trả phòng:</strong> 12:00 - {selectedBooking.checkOut}</p>
              </div>

              <div className="detail-section">
                <h4>Chi tiết thanh toán</h4>
                <div className="detail-price-row">
                  <span>Tiền phòng:</span>
                  <strong>{formatCurrency(selectedBooking.totalPrice)}</strong>
                </div>
                <div className="detail-price-row">
                  <span>Thuế & phí dịch vụ (10%):</span>
                  <span>Đã bao gồm</span>
                </div>
                <hr style={{ margin: '8px 0', borderColor: 'var(--border)' }} />
                <div className="detail-price-row total">
                  <span>TỔNG CỘNG:</span>
                  <strong style={{ color: 'var(--brand-primary)', fontSize: '16px' }}>
                    {formatCurrency(selectedBooking.totalPrice)}
                  </strong>
                </div>
              </div>
            </div>
            <div className="modal-footer-pwa">
              <button type="button" className="btn-primary-block" onClick={() => setSelectedBooking(null)}>
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="modal-pwa" onClick={() => setShowPaymentModal(null)}>
          <div className="modal-pwa-content payment-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-pwa">
              <h3>Thanh toán đơn {showPaymentModal.code}</h3>
              <button type="button" className="close-btn" onClick={() => setShowPaymentModal(null)}>✕</button>
            </div>
            <div className="modal-body-pwa" style={{ textAlign: 'center' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '13px' }}>
                Quét mã VietQR bên dưới để hoàn tất thanh toán giữ phòng ngay lập tức:
              </p>
              <div className="vietqr-box">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=VIETQR_PAYMENT_${showPaymentModal.code}_${showPaymentModal.totalPrice}`}
                  alt="VietQR Payment"
                  className="vietqr-img"
                />
                <div className="qr-badge">Chuyển khoản 24/7</div>
              </div>
              <div className="qr-details-table">
                <div className="row"><span>Ngân hàng:</span><strong>MB Bank (Quân Đội)</strong></div>
                <div className="row"><span>Số tài khoản:</span><strong>888899996666</strong></div>
                <div className="row"><span>Chủ tài khoản:</span><strong>LUXSTAY HOTEL GROUP</strong></div>
                <div className="row"><span>Số tiền:</span><strong style={{ color: 'var(--brand-primary)' }}>{formatCurrency(showPaymentModal.totalPrice)}</strong></div>
                <div className="row"><span>Nội dung CK:</span><strong>{showPaymentModal.code} LUXSTAY</strong></div>
              </div>
            </div>
            <div className="modal-footer-pwa">
              <button
                type="button"
                className="btn-primary-block"
                onClick={async () => {
                  try {
                    if (user && showPaymentModal.id && !String(showPaymentModal.id).startsWith('local')) {
                      await api.put(`/bookings/${showPaymentModal.id}/confirm`);
                    }
                    setBookings(prev => prev.map(b => b.id === showPaymentModal.id ? { ...b, status: 'Confirmed' } : b));
                    setShowPaymentModal(null);
                    alert('Xác nhận thanh toán thành công! Đơn đặt của bạn đã được chuyển sang mục "Đã đặt".');
                    setActiveSubTab('confirmed');
                  } catch (err) {
                    // Update state anyway for demonstration
                    setBookings(prev => prev.map(b => b.id === showPaymentModal.id ? { ...b, status: 'Confirmed' } : b));
                    setShowPaymentModal(null);
                    alert('Đã ghi nhận thanh toán! Đơn đặt chuyển sang mục "Đã đặt".');
                    setActiveSubTab('confirmed');
                  }
                }}
              >
                Tôi đã hoàn tất chuyển khoản
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CANCEL MODAL */}
      {cancelModalBooking && (
        <div className="modal-pwa" onClick={() => setCancelModalBooking(null)}>
          <div className="modal-pwa-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header-pwa">
              <h3>Hủy đặt phòng {cancelModalBooking.code}</h3>
              <button type="button" className="close-btn" onClick={() => setCancelModalBooking(null)}>✕</button>
            </div>
            <div className="modal-body-pwa">
              <p style={{ color: 'var(--text-secondary)', marginBottom: '12px' }}>
                Quý khách có chắc chắn muốn hủy đặt phòng này? Hành động này không thể hoàn tác.
              </p>
              <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '6px' }}>
                Lý do hủy phòng (tùy chọn):
              </label>
              <textarea
                className="pwa-input"
                rows={3}
                placeholder="Thay đổi lịch trình, tìm được phòng khác,..."
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
              />
            </div>
            <div className="modal-footer-pwa" style={{ display: 'flex', gap: '8px' }}>
              <button
                type="button"
                className="btn-action-outline"
                style={{ flex: 1 }}
                onClick={() => setCancelModalBooking(null)}
              >
                Không hủy
              </button>
              <button
                type="button"
                className="btn-action-danger"
                style={{ flex: 1 }}
                disabled={actionLoading}
                onClick={handleCancelBooking}
              >
                {actionLoading ? 'Đang hủy...' : 'Xác nhận hủy'}
              </button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
