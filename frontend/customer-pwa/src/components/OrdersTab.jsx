import React, { useState, useEffect } from 'react';
import {
  Clock, CheckCircle2, BedDouble, Calendar, MapPin, AlertCircle,
  CreditCard, XCircle, ArrowRight, RefreshCw, QrCode, ReceiptText, ChevronRight,
  Compass, Car, ShieldAlert, Sparkles, X, Copy, Phone, User
} from 'lucide-react';
import api from '../api';

const STATUS_TABS = [
  { id: 'pending', label: 'Chờ thanh toán', matchStatuses: ['PENDING_PAYMENT', 'Pending'] },
  { id: 'confirmed', label: 'Đã đặt', matchStatuses: ['CONFIRMED', 'Confirmed'] },
  { id: 'staying', label: 'Đang lưu trú', matchStatuses: ['IN_PROGRESS', 'CheckedIn'] },
  { id: 'completed', label: 'Đã hoàn thành', matchStatuses: ['COMPLETED', 'CheckedOut'] },
  { id: 'cancelled', label: 'Đã hủy', matchStatuses: ['CANCELLED', 'Cancelled', 'NoShow'] },
];

export default function OrdersTab({
  user,
  localOrders = [],
  onGoToCheckIn,
  onGoToQR,
  onRequireAuth,
}) {
  const [activeSubTab, setActiveSubTab] = useState('confirmed');
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(null);
  const [cancelLoading, setCancelLoading] = useState(false);
  const [copied, setCopied] = useState(false);

  const fetchOrders = async () => {
    setLoading(true);
    setError('');
    try {
      // First try unified orders endpoint
      const res = await api.get('/orders');
      const orderList = res.data?.data || [];

      if (orderList.length > 0) {
        setOrders(orderList);
      } else if (user) {
        // Fallback: check if legacy bookings exist and wrap them
        const bkRes = await api.get('/bookings/my').catch(() => null);
        const legacyBookings = bkRes?.data?.data || [];
        if (legacyBookings.length > 0) {
          const wrapped = legacyBookings.map((b) => ({
            id: b.id,
            order_code: `BK${String(b.id).padStart(4, '0')}`,
            order_status: b.status === 'CheckedIn' ? 'IN_PROGRESS' : b.status === 'CheckedOut' ? 'COMPLETED' : b.status === 'Cancelled' ? 'CANCELLED' : 'CONFIRMED',
            payment_status: 'PAID',
            total_amount: Number(b.room_price_total || 0),
            final_amount: Number(b.room_price_total || 0),
            contact_name: b.customer?.full_name || user.full_name,
            contact_phone: b.customer?.phone || user.phone,
            created_at: b.booking_date,
            hotelBookings: [b],
            tourBookings: [],
            carRentals: [],
            items: [
              {
                service_type: 'HOTEL',
                item_name: `Phòng ${b.room?.room_number || ''} (${b.room?.roomType?.name || 'Deluxe'})`,
                total_price: Number(b.room_price_total || 0),
              },
            ],
          }));
          setOrders(wrapped);
        } else {
          setOrders(localOrders || []);
        }
      } else {
        setOrders(localOrders || []);
      }
    } catch (err) {
      console.warn('Could not load orders:', err);
      setOrders(localOrders || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrders();
  }, [user]);

  // Filter orders according to active sub-tab
  const filteredOrders = orders.filter((ord) => {
    const status = ord.order_status || ord.status;
    const paymentStatus = ord.payment_status;

    if (activeSubTab === 'pending') {
      return status === 'PENDING_PAYMENT' || paymentStatus === 'UNPAID' || paymentStatus === 'PENDING' || status === 'Pending';
    }
    if (activeSubTab === 'confirmed') {
      return (status === 'CONFIRMED' || status === 'Confirmed') && paymentStatus !== 'UNPAID';
    }
    if (activeSubTab === 'staying') {
      return status === 'IN_PROGRESS' || status === 'CheckedIn';
    }
    if (activeSubTab === 'completed') {
      return status === 'COMPLETED' || status === 'CheckedOut';
    }
    if (activeSubTab === 'cancelled') {
      return status === 'CANCELLED' || status === 'Cancelled' || status === 'NoShow';
    }
    return true;
  });

  const handleCancelOrder = async () => {
    if (!showCancelModal) return;
    setCancelLoading(true);
    try {
      await api.post(`/orders/${showCancelModal.id}/cancel`);
      setShowCancelModal(null);
      setSelectedOrder(null);
      await fetchOrders();
    } catch (err) {
      alert(err.response?.data?.message || 'Hủy đơn hàng thất bại. Vui lòng liên hệ lễ tân.');
    } finally {
      setCancelLoading(false);
    }
  };

  const handlePayOrder = async (orderId) => {
    try {
      await api.post(`/orders/${orderId}/pay`, { paymentMethod: 'BankTransfer' });
      setShowPaymentModal(null);
      if (selectedOrder) {
        setSelectedOrder({ ...selectedOrder, payment_status: 'PAID', order_status: 'CONFIRMED' });
      }
      await fetchOrders();
    } catch (err) {
      alert('Xác nhận thanh toán thất bại.');
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="orders-tab-container">
      {/* Tab Navigation Header */}
      <div className="orders-subtabs-nav">
        {STATUS_TABS.map((tab) => {
          const count = orders.filter((ord) => {
            const st = ord.order_status || ord.status;
            const pay = ord.payment_status;
            if (tab.id === 'pending') return st === 'PENDING_PAYMENT' || pay === 'UNPAID' || pay === 'PENDING' || st === 'Pending';
            if (tab.id === 'confirmed') return (st === 'CONFIRMED' || st === 'Confirmed') && pay !== 'UNPAID';
            if (tab.id === 'staying') return st === 'IN_PROGRESS' || st === 'CheckedIn';
            if (tab.id === 'completed') return st === 'COMPLETED' || st === 'CheckedOut';
            if (tab.id === 'cancelled') return st === 'CANCELLED' || st === 'Cancelled';
            return false;
          }).length;

          return (
            <button
              key={tab.id}
              type="button"
              className={`order-subtab-btn ${activeSubTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <span>{tab.label}</span>
              {count > 0 && <span className="tab-count">{count}</span>}
            </button>
          );
        })}
      </div>

      {/* Main Content Area */}
      <div className="orders-content-area">
        {loading ? (
          <div className="orders-loading-state">
            <RefreshCw size={24} className="spin-icon" />
            <p>Đang tải danh sách đơn hàng hợp nhất...</p>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="orders-empty-state">
            <ReceiptText size={48} />
            <h4>Chưa có đơn hàng nào</h4>
            <p>
              {activeSubTab === 'pending' && 'Bạn không có đơn hàng nào đang chờ thanh toán.'}
              {activeSubTab === 'confirmed' && 'Bạn chưa có chuyến đi nào đã đặt xác nhận.'}
              {activeSubTab === 'staying' && 'Hiện tại bạn không có chuyến đi nào đang lưu trú.'}
              {activeSubTab === 'completed' && 'Chưa có lịch sử chuyến đi hoàn thành.'}
              {activeSubTab === 'cancelled' && 'Không có đơn hàng nào bị hủy.'}
            </p>
          </div>
        ) : (
          <div className="orders-cards-list">
            {filteredOrders.map((ord) => {
              const hasHotel = (ord.hotelBookings?.length || 0) > 0;
              const hasTour = (ord.tourBookings?.length || 0) > 0;
              const hasCar = (ord.carRentals?.length || 0) > 0;

              return (
                <div
                  key={ord.id}
                  className="unified-order-card"
                  onClick={() => setSelectedOrder(ord)}
                >
                  {/* Card Header */}
                  <div className="order-card-header">
                    <div className="order-code-box">
                      <ReceiptText size={16} className="text-purple" />
                      <strong>{ord.order_code}</strong>
                    </div>

                    <div className="order-status-pill">
                      {ord.order_status === 'CONFIRMED' && (
                        <span className="badge-confirmed"><CheckCircle2 size={12} /> Đã Xác Nhận</span>
                      )}
                      {(ord.order_status === 'PENDING_PAYMENT' || ord.payment_status === 'UNPAID' || ord.payment_status === 'PENDING') && (
                        <span className="badge-pending"><Clock size={12} /> Chờ Thanh Toán</span>
                      )}
                      {ord.order_status === 'IN_PROGRESS' && (
                        <span className="badge-staying"><Sparkles size={12} /> Đang Lưu Trú</span>
                      )}
                      {ord.order_status === 'COMPLETED' && (
                        <span className="badge-completed">Đã Hoàn Thành</span>
                      )}
                      {ord.order_status === 'CANCELLED' && (
                        <span className="badge-cancelled">Đã Hủy</span>
                      )}
                    </div>
                  </div>

                  {/* Multi-Service Badges */}
                  <div className="order-services-tags">
                    {hasHotel && (
                      <span className="srv-tag hotel">
                        <BedDouble size={12} /> Khách Sạn ({ord.hotelBookings.length})
                      </span>
                    )}
                    {hasTour && (
                      <span className="srv-tag tour">
                        <Compass size={12} /> Tour Du Lịch ({ord.tourBookings.length})
                      </span>
                    )}
                    {hasCar && (
                      <span className="srv-tag car">
                        <Car size={12} /> Thuê Xe ({ord.carRentals.length})
                      </span>
                    )}
                  </div>

                  {/* Service Summaries */}
                  <div className="order-service-snippets">
                    {ord.hotelBookings?.map((b, idx) => (
                      <div key={idx} className="snippet-row">
                        <span className="snippet-icon">🏨</span>
                        <div className="snippet-text">
                          <strong>Phòng {b.room?.room_number || 'Khách sạn'}</strong>
                          <small>({b.checkin_date} → {b.checkout_date})</small>
                        </div>
                      </div>
                    ))}

                    {ord.tourBookings?.map((t, idx) => (
                      <div key={idx} className="snippet-row">
                        <span className="snippet-icon">🚌</span>
                        <div className="snippet-text">
                          <strong>{t.tour?.name || 'Tour Du Lịch'}</strong>
                          <small>({t.tour_date} • {t.number_of_people} khách)</small>
                        </div>
                      </div>
                    ))}

                    {ord.carRentals?.map((c, idx) => (
                      <div key={idx} className="snippet-row">
                        <span className="snippet-icon">🚗</span>
                        <div className="snippet-text">
                          <strong>{c.car?.name || 'Xe Du Lịch'}</strong>
                          <small>({c.rental_days} ngày • {c.driver_required ? 'Có tài xế' : 'Tự lái'})</small>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Card Footer */}
                  <div className="order-card-footer">
                    <div className="order-total-price">
                      <span>Tổng toàn bộ:</span>
                      <strong>{Number(ord.final_amount || ord.total_amount).toLocaleString('vi-VN')} đ</strong>
                    </div>

                    <div className="card-actions-row">
                      {(ord.payment_status === 'UNPAID' || ord.payment_status === 'PENDING') && (
                        <button
                          type="button"
                          className="btn-card-pay"
                          onClick={(e) => {
                            e.stopPropagation();
                            setShowPaymentModal(ord);
                          }}
                        >
                          <QrCode size={14} /> Thanh Toán
                        </button>
                      )}
                      <button type="button" className="btn-card-detail">
                        Chi Tiết <ChevronRight size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Order Detail Modal */}
      {selectedOrder && (
        <div className="order-detail-backdrop" onClick={() => setSelectedOrder(null)}>
          <div className="order-detail-modal" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-btn"
              onClick={() => setSelectedOrder(null)}
            >
              <X size={20} />
            </button>

            <div className="detail-modal-header">
              <span className="detail-pill">ĐƠN HÀNG HỢP NHẤT</span>
              <h2>{selectedOrder.order_code}</h2>
              <div className="detail-status-row">
                <span className="status-label">Trạng thái: <strong>{selectedOrder.order_status}</strong></span>
                <span className="pay-status-label">Thanh toán: <strong>{selectedOrder.payment_status}</strong></span>
              </div>
            </div>

            <div className="detail-modal-body">
              {/* Customer Contact */}
              <div className="detail-section">
                <h4><User size={15} /> Thông Tin Khách Hàng</h4>
                <div className="info-grid">
                  <div><span>Họ và tên:</span> <strong>{selectedOrder.contact_name}</strong></div>
                  <div><span>Số điện thoại:</span> <strong>{selectedOrder.contact_phone}</strong></div>
                  {selectedOrder.contact_email && (
                    <div><span>Email:</span> <strong>{selectedOrder.contact_email}</strong></div>
                  )}
                </div>
              </div>

              {/* 🏨 Hotel Section */}
              {selectedOrder.hotelBookings?.length > 0 && (
                <div className="detail-section service-block hotel-block">
                  <h4><BedDouble size={16} /> Khách Sạn & Khu Nghỉ Dưỡng</h4>
                  {selectedOrder.hotelBookings.map((b) => (
                    <div key={b.id} className="service-detail-item">
                      <div className="item-title-row">
                        <strong>Phòng {b.room?.room_number} — {b.room?.roomType?.name || 'Deluxe'}</strong>
                        <span className="item-price">{Number(b.room_price_total).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="item-sub">
                        <span>Check-in: <strong>{b.checkin_date}</strong></span>
                        <span>Check-out: <strong>{b.checkout_date}</strong></span>
                        <span>Khách: <strong>{b.num_guests} người</strong></span>
                      </div>

                      {/* Checkin shortcut buttons */}
                      <div className="booking-shortcut-actions">
                        {onGoToCheckIn && (
                          <button
                            type="button"
                            className="btn-shortcut"
                            onClick={() => {
                              setSelectedOrder(null);
                              onGoToCheckIn(b);
                            }}
                          >
                            Online Check-in
                          </button>
                        )}
                        {onGoToQR && (
                          <button
                            type="button"
                            className="btn-shortcut"
                            onClick={() => {
                              setSelectedOrder(null);
                              onGoToQR(b);
                            }}
                          >
                            QR Khóa Phòng
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 🚌 Tour Section */}
              {selectedOrder.tourBookings?.length > 0 && (
                <div className="detail-section service-block tour-block">
                  <h4><Compass size={16} /> Tour Du Lịch</h4>
                  {selectedOrder.tourBookings.map((t) => (
                    <div key={t.id} className="service-detail-item">
                      <div className="item-title-row">
                        <strong>{t.tour?.name || 'Tour Du Lịch'}</strong>
                        <span className="item-price">{Number(t.total_price).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="item-sub">
                        <span>Ngày khởi hành: <strong>{t.tour_date}</strong></span>
                        <span>Số lượng: <strong>{t.number_of_people} người</strong></span>
                      </div>
                      {t.pickup_location && (
                        <div className="item-loc">
                          <MapPin size={13} /> Điểm đón: {t.pickup_location}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* 🚗 Car Section */}
              {selectedOrder.carRentals?.length > 0 && (
                <div className="detail-section service-block car-block">
                  <h4><Car size={16} /> Thuê Xe Du Lịch</h4>
                  {selectedOrder.carRentals.map((c) => (
                    <div key={c.id} className="service-detail-item">
                      <div className="item-title-row">
                        <strong>{c.car?.name || 'Xe Du Lịch'}</strong>
                        <span className="item-price">{Number(c.total_price).toLocaleString('vi-VN')} đ</span>
                      </div>
                      <div className="item-sub">
                        <span>Thời gian thuê: <strong>{c.rental_days} ngày</strong></span>
                        <span>Dịch vụ: <strong>{c.driver_required ? 'Có tài xế chuyên nghiệp' : 'Tự lái'}</strong></span>
                      </div>
                      <div className="item-loc">
                        <MapPin size={13} /> Nhận/Trả: {c.pickup_location || 'Sân bay / Khách sạn'}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Pricing breakdown */}
              <div className="detail-section pricing-section">
                <h4>Tổng Tiền Đơn Hàng</h4>
                <div className="pricing-rows">
                  <div className="p-row">
                    <span>Tổng phụ:</span>
                    <span>{Number(selectedOrder.total_amount).toLocaleString('vi-VN')} đ</span>
                  </div>
                  {Number(selectedOrder.discount_amount) > 0 && (
                    <div className="p-row discount">
                      <span>Giảm giá:</span>
                      <span>-{Number(selectedOrder.discount_amount).toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="p-row grand-total">
                    <span>Tổng thanh toán:</span>
                    <strong>{Number(selectedOrder.final_amount || selectedOrder.total_amount).toLocaleString('vi-VN')} đ</strong>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="detail-modal-footer">
              {selectedOrder.order_status !== 'CANCELLED' && (
                <button
                  type="button"
                  className="btn-cancel-order"
                  onClick={() => setShowCancelModal(selectedOrder)}
                >
                  <XCircle size={16} /> Hủy Đơn Hàng
                </button>
              )}

              {(selectedOrder.payment_status === 'UNPAID' || selectedOrder.payment_status === 'PENDING') && (
                <button
                  type="button"
                  className="btn-pay-now"
                  onClick={() => setShowPaymentModal(selectedOrder)}
                >
                  <QrCode size={16} /> Thanh Toán Đơn Hàng
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Payment QR Modal */}
      {showPaymentModal && (
        <div className="order-detail-backdrop" onClick={() => setShowPaymentModal(null)}>
          <div className="qr-pay-modal" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-btn" onClick={() => setShowPaymentModal(null)}>
              <X size={20} />
            </button>

            <div className="qr-pay-header">
              <QrCode size={24} className="text-purple" />
              <h3>Thanh Toán Đơn Hàng</h3>
              <p>Mã đơn: <strong>{showPaymentModal.order_code}</strong></p>
            </div>

            <div className="qr-pay-body">
              <div className="vietqr-wrap">
                <img
                  src={`https://api.vietqr.io/image/970422-0901000005-print.jpg?amount=${showPaymentModal.final_amount}&addInfo=${encodeURIComponent(showPaymentModal.order_code)}&accountName=LUXSTAY%20HOTEL`}
                  alt="VietQR Payment"
                  className="qr-img"
                />
              </div>

              <div className="bank-card-info">
                <div><span>Ngân hàng:</span> <strong>MB Bank</strong></div>
                <div><span>Số tài khoản:</span> <strong>0901000005</strong></div>
                <div><span>Số tiền:</span> <strong className="text-price">{Number(showPaymentModal.final_amount).toLocaleString('vi-VN')} đ</strong></div>
                <div>
                  <span>Nội dung:</span>
                  <strong className="copyable-pill" onClick={() => handleCopy(showPaymentModal.order_code)}>
                    {showPaymentModal.order_code} <Copy size={12} />
                  </strong>
                </div>
              </div>
              {copied && <p className="copy-tag">Đã sao chép nội dung chuyển khoản!</p>}
            </div>

            <div className="qr-pay-footer">
              <button
                type="button"
                className="btn-confirm-paid"
                onClick={() => handlePayOrder(showPaymentModal.id)}
              >
                Tôi Đã Chuyển Khoản Xong ✓
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {showCancelModal && (
        <div className="order-detail-backdrop" onClick={() => setShowCancelModal(null)}>
          <div className="cancel-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <ShieldAlert size={36} color="#DC2626" />
            <h3>Xác Nhận Hủy Đơn Hàng?</h3>
            <p>
              Đơn hàng <strong>{showCancelModal.order_code}</strong> sẽ được hủy theo chính sách hoàn tiền tương ứng cho từng dịch vụ (Khách sạn, Tour, Thuê xe).
            </p>

            <div className="cancel-actions">
              <button
                type="button"
                className="btn-back"
                onClick={() => setShowCancelModal(null)}
                disabled={cancelLoading}
              >
                Không, Giữ Lại
              </button>
              <button
                type="button"
                className="btn-do-cancel"
                onClick={handleCancelOrder}
                disabled={cancelLoading}
              >
                {cancelLoading ? 'Đang Hủy...' : 'Xác Nhận Hủy Đơn'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
