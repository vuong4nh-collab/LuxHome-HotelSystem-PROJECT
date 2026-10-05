import React, { useState, useEffect } from 'react';
import {
  X, Check, AlertCircle, CreditCard, QrCode, ShieldCheck,
  BedDouble, Compass, Car, ArrowRight, CheckCircle2, Copy
} from 'lucide-react';
import api from '../api';

const PAYMENT_METHODS = [
  { id: 'BankTransfer', name: 'Chuyển Khoản Ngân Hàng (VietQR)', icon: QrCode, desc: 'Quét mã QR thanh toán nhanh 24/7' },
  { id: 'Momo', name: 'Ví Điện Tử MoMo', icon: CreditCard, desc: 'Thanh toán tức thì qua ứng dụng MoMo' },
  { id: 'VNPay', name: 'Cổng VNPay (Thẻ ATM / Visa / Mastercard)', icon: CreditCard, desc: 'Hỗ trợ tất cả ngân hàng nội địa & quốc tế' },
  { id: 'Cash', name: 'Thanh Toán Tại Khách Sạn / Khi Nhận Dịch Vụ', icon: CheckCircle2, desc: 'Thanh toán trực tiếp bằng tiền mặt hoặc thẻ' },
];

export default function UnifiedCheckoutModal({
  isOpen,
  onClose,
  items = [],
  user,
  onSuccess,
}) {
  if (!isOpen) return null;

  const [customerName, setCustomerName] = useState(user?.full_name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [email, setEmail] = useState(user?.email || '');
  const [address, setAddress] = useState('');
  const [specialRequests, setSpecialRequests] = useState('');
  const [selectedPayment, setSelectedPayment] = useState('BankTransfer');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [createdOrder, setCreatedOrder] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (user) {
      if (!customerName) setCustomerName(user.full_name || '');
      if (!email) setEmail(user.email || '');
      if (!phone) setPhone(user.phone || '');
    }
  }, [user]);

  const totalAmount = items.reduce((sum, it) => sum + Number(it.totalPrice || 0), 0);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!customerName.trim() || !phone.trim() || !email.trim()) {
      setError('Vui lòng điền đầy đủ họ tên, số điện thoại và email liên hệ.');
      return;
    }

    setSubmitting(true);
    try {
      const hotelBookings = items
        .filter((it) => it.type === 'hotel')
        .map((it) => ({
          roomId: it.roomId || it.room_id,
          checkIn: it.checkIn || it.checkin_date,
          checkOut: it.checkOut || it.checkout_date,
          guests: it.guests || 2,
          specialRequests: it.specialRequests || specialRequests,
        }));

      const tourBookings = items
        .filter((it) => it.type === 'tour')
        .map((it) => ({
          tourId: it.tourId || it.tour_id,
          scheduleId: it.scheduleId || null,
          tourDate: it.tourDate,
          people: it.people || 1,
          pickupLocation: it.pickupLocation || '',
        }));

      const carRentals = items
        .filter((it) => it.type === 'car')
        .map((it) => ({
          carId: it.carId || it.car_id,
          pickup: it.pickupDatetime,
          return: it.returnDatetime,
          driverRequired: Boolean(it.driverRequired),
          pickupLocation: it.pickupLocation || '',
          dropoffLocation: it.dropoffLocation || '',
        }));

      const payload = {
        hotelBookings,
        tourBookings,
        carRentals,
        customerInfo: {
          fullName: customerName.trim(),
          phone: phone.trim(),
          email: email.trim(),
          address: address.trim(),
          notes: specialRequests.trim(),
        },
        paymentMethod: selectedPayment,
      };

      const res = await api.post('/checkout', payload);
      const order = res.data?.data;
      setCreatedOrder(order);
      if (onSuccess) onSuccess(order);
    } catch (err) {
      console.error('Checkout error:', err);
      setError(err.response?.data?.message || err.message || 'Đặt đơn hàng không thành công. Vui lòng thử lại.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="unified-checkout-backdrop" onClick={onClose}>
      <div className="unified-checkout-modal" onClick={(e) => e.stopPropagation()}>
        <button type="button" className="modal-close-btn" onClick={onClose}>
          <X size={20} />
        </button>

        {createdOrder ? (
          /* Confirmation & QR Payment View */
          <div className="checkout-success-view">
            <div className="success-icon-wrap">
              <CheckCircle2 size={56} color="#16A34A" />
            </div>

            <h3>Đặt Đơn Hàng Thành Công!</h3>
            <p className="success-desc">
              Mã đơn hàng: <strong className="order-code-pill">{createdOrder.order_code}</strong>
            </p>

            <div className="success-summary-card">
              <div className="summary-row">
                <span>Khách hàng:</span>
                <strong>{createdOrder.contact_name}</strong>
              </div>
              <div className="summary-row">
                <span>Số điện thoại:</span>
                <span>{createdOrder.contact_phone}</span>
              </div>
              <div className="summary-row">
                <span>Tổng thanh toán:</span>
                <strong className="success-price">
                  {Number(createdOrder.final_amount).toLocaleString('vi-VN')} đ
                </strong>
              </div>
              <div className="summary-row">
                <span>Phương thức:</span>
                <span>{selectedPayment === 'BankTransfer' ? 'Chuyển khoản QR' : selectedPayment}</span>
              </div>
            </div>

            {/* QR Payment Box if BankTransfer */}
            {selectedPayment === 'BankTransfer' && (
              <div className="qr-payment-card">
                <div className="qr-badge">
                  <QrCode size={16} /> Quét Mã VietQR Chuyển Khoản Nhanh
                </div>
                <div className="qr-code-img-wrap">
                  <img
                    src={`https://api.vietqr.io/image/970422-0901000005-print.jpg?amount=${createdOrder.final_amount}&addInfo=${encodeURIComponent(createdOrder.order_code)}&accountName=LUXSTAY%20HOTEL`}
                    alt="VietQR Payment"
                    className="vietqr-img"
                  />
                </div>
                <div className="qr-bank-details">
                  <div className="bank-info-line">
                    <span>Ngân hàng:</span> <strong>MB Bank (Quân Đội)</strong>
                  </div>
                  <div className="bank-info-line">
                    <span>Số tài khoản:</span> <strong>0901000005</strong>
                  </div>
                  <div className="bank-info-line">
                    <span>Chủ tài khoản:</span> <strong>LUXSTAY RESORT GROUP</strong>
                  </div>
                  <div className="bank-info-line">
                    <span>Nội dung chuyển khoản:</span>
                    <span className="copyable-code" onClick={() => handleCopy(createdOrder.order_code)}>
                      {createdOrder.order_code} <Copy size={13} />
                    </span>
                  </div>
                </div>
                {copied && <span className="copy-notice">Đã sao chép nội dung chuyển khoản!</span>}
              </div>
            )}

            <button
              type="button"
              className="btn-finish-checkout"
              onClick={onClose}
            >
              Xem Chi Tiết Đơn Hàng Của Tôi <ArrowRight size={18} />
            </button>
          </div>
        ) : (
          /* Checkout Form View */
          <form onSubmit={handleSubmit} className="checkout-form-view">
            <div className="checkout-modal-header">
              <h2>Xác Nhận & Đặt Toàn Bộ Chuyến Đi</h2>
              <p>Một đơn hàng duy nhất cho trọn gói phòng, tour du lịch & thuê xe</p>
            </div>

            {error && (
              <div className="checkout-alert-error">
                <AlertCircle size={18} /> {error}
              </div>
            )}

            <div className="checkout-modal-scroll">
              {/* Order Services Breakdown */}
              <div className="checkout-block">
                <h3>Các Dịch Vụ Trong Chuyến Đi ({items.length})</h3>
                <div className="mini-items-list">
                  {items.map((it, idx) => (
                    <div key={it.id || idx} className="mini-item-row">
                      <div className="mini-item-left">
                        {it.type === 'hotel' && <BedDouble size={16} className="text-purple" />}
                        {it.type === 'tour' && <Compass size={16} className="text-pink" />}
                        {it.type === 'car' && <Car size={16} className="text-teal" />}
                        <div>
                          <strong>{it.name}</strong>
                          <div className="mini-subtext">
                            {it.type === 'hotel' && `${it.nights} đêm (${it.checkIn} → ${it.checkOut})`}
                            {it.type === 'tour' && `Khởi hành: ${it.tourDate} • ${it.people} người`}
                            {it.type === 'car' && `Thuê ${it.rentalDays} ngày ${it.driverRequired ? '• Có tài xế' : '• Tự lái'}`}
                          </div>
                        </div>
                      </div>
                      <span className="mini-price">
                        {Number(it.totalPrice).toLocaleString('vi-VN')} đ
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Customer Contact Information */}
              <div className="checkout-block">
                <h3>Thông Tin Khách Hàng Đại Diện</h3>
                <div className="form-grid-2col">
                  <div className="form-field">
                    <label>Họ và tên *</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Nguyễn Văn A"
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Số điện thoại liên hệ *</label>
                    <input
                      type="tel"
                      className="form-input"
                      placeholder="0912345678"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="form-grid-2col" style={{ marginTop: '12px' }}>
                  <div className="form-field">
                    <label>Email nhận xác nhận *</label>
                    <input
                      type="email"
                      className="form-input"
                      placeholder="khachhang@email.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                  </div>

                  <div className="form-field">
                    <label>Địa chỉ liên hệ</label>
                    <input
                      type="text"
                      className="form-input"
                      placeholder="Hà Nội, TP.HCM..."
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                    />
                  </div>
                </div>

                <div className="form-field" style={{ marginTop: '12px' }}>
                  <label>Ghi chú đặc biệt cho chuyến đi</label>
                  <textarea
                    className="form-textarea"
                    rows="2"
                    placeholder="Yêu cầu tầng cao, giờ đón tour, đón xe tại sảnh khách sạn..."
                    value={specialRequests}
                    onChange={(e) => setSpecialRequests(e.target.value)}
                  ></textarea>
                </div>
              </div>

              {/* Payment Methods */}
              <div className="checkout-block">
                <h3>Phương Thức Thanh Toán</h3>
                <div className="payment-options-grid">
                  {PAYMENT_METHODS.map((pm) => {
                    const Icon = pm.icon;
                    const isSelected = selectedPayment === pm.id;
                    return (
                      <div
                        key={pm.id}
                        className={`payment-option-card ${isSelected ? 'active' : ''}`}
                        onClick={() => setSelectedPayment(pm.id)}
                      >
                        <div className="option-radio">
                          {isSelected && <div className="radio-dot" />}
                        </div>
                        <div className="option-info">
                          <div className="option-title">
                            <Icon size={16} /> {pm.name}
                          </div>
                          <p className="option-desc">{pm.desc}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Modal Sticky Footer */}
            <div className="checkout-modal-footer">
              <div className="checkout-total-box">
                <span className="label">Tổng Toàn Bộ Đơn Hàng ({items.length} dịch vụ)</span>
                <span className="amount">{totalAmount.toLocaleString('vi-VN')} đ</span>
              </div>

              <button
                type="submit"
                className="btn-submit-order"
                disabled={submitting}
              >
                {submitting ? 'Đang Xử Lý Đơn Hàng...' : 'Xác Nhận Đặt Chuyến Đi →'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
