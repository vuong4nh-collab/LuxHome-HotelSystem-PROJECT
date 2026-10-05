import React, { useState, useEffect } from 'react';
import {
  KeyRound, QrCode, LogOut, CheckCircle2, AlertCircle, Camera, ShieldCheck,
  Sparkles, Wifi, Bell, Clock, RefreshCw, Smartphone, Check
} from 'lucide-react';
import api from '../api';

const CHECKIN_SUBTABS = [
  { id: 'online', label: 'Online check-in', icon: KeyRound },
  { id: 'qr', label: 'QR Code', icon: QrCode },
  { id: 'checkout', label: 'Check-out', icon: LogOut },
];

export default function CheckInTab({
  user,
  localBookings = [],
  initialSubTab = 'online',
  targetBookingId = null,
  onBookingUpdated,
  onExploreMore
}) {
  const [activeSubTab, setActiveSubTab] = useState(initialSubTab);
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedBooking, setSelectedBooking] = useState(null);

  // Online Check-in form state
  const [checkinForm, setCheckinForm] = useState({
    fullName: user?.full_name || '',
    idNumber: '',
    phone: user?.phone || '',
    arrivalTime: '14:00',
    specialRequests: '',
    agreedRules: true,
  });
  const [idFrontUploaded, setIdFrontUploaded] = useState(false);
  const [idBackUploaded, setIdBackUploaded] = useState(false);
  const [submittingCheckIn, setSubmittingCheckIn] = useState(false);
  const [checkInSuccess, setCheckInSuccess] = useState(false);

  // Digital key NFC simulation
  const [nfcScanning, setNfcScanning] = useState(false);
  const [doorUnlocked, setDoorUnlocked] = useState(false);

  // Check-out state
  const [rating, setRating] = useState(5);
  const [feedback, setFeedback] = useState('');
  const [submittingCheckOut, setSubmittingCheckOut] = useState(false);
  const [checkOutSuccess, setCheckOutSuccess] = useState(false);

  const fetchBookings = async () => {
    setLoading(true);
    try {
      if (user) {
        const { data } = await api.get('/bookings/my');
        const fetched = (data?.data || []).map(b => ({
          id: b.id,
          code: `BK${String(b.id).padStart(4, '0')}`,
          roomName: b.room?.roomType?.name || `Phòng ${b.room?.room_number || ''}`,
          roomNumber: b.room?.room_number || '302',
          hotelName: b.room?.roomType?.hotel_name || 'LuxStay Grand Resort',
          checkIn: b.checkin_date,
          checkOut: b.checkout_date,
          totalPrice: Number(b.room_price_total || 0),
          status: b.status,
          raw: b,
        }));
        setBookings(fetched);
      } else {
        const mapped = (localBookings || []).map((b, idx) => ({
          id: b.id || idx + 1,
          code: b.code || (typeof b.id === 'string' ? b.id : `BK${String(b.id || idx + 1).padStart(4, '0')}`),
          roomName: b.roomName || 'Deluxe King Suite',
          roomNumber: b.roomNumber || '302',
          hotelName: b.hotelName || 'LuxStay Grand',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          totalPrice: Number(b.totalPrice || 0),
          status: b.status?.includes('Active') || b.status?.includes('Nhận Phòng') ? 'CheckedIn'
            : b.status?.includes('Confirmed') ? 'Confirmed'
            : b.status || 'Confirmed',
          raw: b,
        }));
        setBookings(mapped);
      }
    } catch (err) {
      console.warn('Error fetching bookings for checkin:', err);
      // Fallback local
      if (localBookings?.length) {
        setBookings(localBookings.map((b, idx) => ({
          id: b.id || idx + 1,
          code: `BK${String(b.id || idx + 1).padStart(4, '0')}`,
          roomName: b.roomName || 'Deluxe King Suite',
          roomNumber: b.roomNumber || '302',
          hotelName: 'LuxStay Grand',
          checkIn: b.checkIn,
          checkOut: b.checkOut,
          totalPrice: Number(b.totalPrice || 0),
          status: b.status || 'Confirmed',
          raw: b,
        })));
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, [user, localBookings]);

  useEffect(() => {
    if (initialSubTab) setActiveSubTab(initialSubTab);
  }, [initialSubTab]);

  useEffect(() => {
    if (user) {
      setCheckinForm(prev => ({
        ...prev,
        fullName: prev.fullName || user.full_name || '',
        phone: prev.phone || user.phone || '',
      }));
    }
  }, [user]);

  // Select appropriate default booking depending on subtab
  useEffect(() => {
    if (bookings.length === 0) return;

    if (targetBookingId) {
      const match = bookings.find(b => String(b.id) === String(targetBookingId));
      if (match) {
        setSelectedBooking(match);
        return;
      }
    }

    if (activeSubTab === 'online') {
      const confirmed = bookings.find(b => b.status === 'Confirmed' || b.status === 'Pending');
      setSelectedBooking(confirmed || bookings[0]);
    } else if (activeSubTab === 'qr' || activeSubTab === 'checkout') {
      const staying = bookings.find(b => b.status === 'CheckedIn');
      setSelectedBooking(staying || bookings.find(b => b.status === 'Confirmed') || bookings[0]);
    }
  }, [bookings, activeSubTab, targetBookingId]);

  // Handle Online Check-in Submission
  const handlePerformCheckIn = async (e) => {
    e.preventDefault();
    if (!selectedBooking) return;
    if (!checkinForm.idNumber && !idFrontUploaded) {
      alert('Vui lòng nhập số CCCD / Hộ chiếu hoặc chụp ảnh giấy tờ tùy thân.');
      return;
    }

    setSubmittingCheckIn(true);
    try {
      if (user && selectedBooking.id && !String(selectedBooking.id).startsWith('local')) {
        await api.post(`/checkin/${selectedBooking.id}`);
      }

      // Update local state
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'CheckedIn' } : b));
      if (onBookingUpdated) onBookingUpdated({ ...selectedBooking, status: 'CheckedIn' });

      setCheckInSuccess(true);
      setTimeout(() => {
        setCheckInSuccess(false);
        setActiveSubTab('qr');
      }, 1400);
    } catch (err) {
      console.warn('Checkin api error:', err);
      // Fallback simulate
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'CheckedIn' } : b));
      setCheckInSuccess(true);
      setTimeout(() => {
        setCheckInSuccess(false);
        setActiveSubTab('qr');
      }, 1400);
    } finally {
      setSubmittingCheckIn(false);
    }
  };

  // Simulate NFC door unlock
  const handleSimulateDoorUnlock = () => {
    setNfcScanning(true);
    setTimeout(() => {
      setNfcScanning(false);
      setDoorUnlocked(true);
      setTimeout(() => setDoorUnlocked(false), 3500);
    }, 1200);
  };

  // Handle Online Check-out Submission
  const handlePerformCheckOut = async () => {
    if (!selectedBooking) return;
    setSubmittingCheckOut(true);
    try {
      if (user && selectedBooking.id && !String(selectedBooking.id).startsWith('local')) {
        await api.post(`/checkout/${selectedBooking.id}`);
      }

      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'CheckedOut' } : b));
      if (onBookingUpdated) onBookingUpdated({ ...selectedBooking, status: 'CheckedOut' });

      setCheckOutSuccess(true);
    } catch (err) {
      console.warn('Checkout api error:', err);
      setBookings(prev => prev.map(b => b.id === selectedBooking.id ? { ...b, status: 'CheckedOut' } : b));
      setCheckOutSuccess(true);
    } finally {
      setSubmittingCheckOut(false);
    }
  };

  const eligibleForCheckIn = bookings.filter(b => b.status === 'Confirmed' || b.status === 'Pending');
  const eligibleForStay = bookings.filter(b => b.status === 'CheckedIn');

  return (
    <main className="tab-checkin-view">
      {/* Top Header */}
      <div className="tab-checkin-header">
        <div className="section-title" style={{ padding: 0, margin: 0 }}>
          <span>Dịch Vụ Check-in &amp; Khóa Phòng</span>
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

      {/* Checkin Subtabs */}
      <div className="checkin-tabs-bar">
        {CHECKIN_SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`checkin-tab-item ${isActive ? 'active' : ''}`}
              onClick={() => {
                setActiveSubTab(tab.id);
                setCheckOutSuccess(false);
              }}
            >
              <Icon size={17} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      <div className="checkin-content-card">
        {/* ==================== SUBTAB 1: ONLINE CHECK-IN ==================== */}
        {activeSubTab === 'online' && (
          <div className="online-checkin-panel">
            {eligibleForCheckIn.length === 0 ? (
              <div className="checkin-empty-box">
                <CheckCircle2 size={44} style={{ color: 'var(--status-success)', margin: '0 auto 12px' }} />
                <h3>Không có phòng chờ check-in</h3>
                <p>
                  Quý khách hiện không có đơn đặt phòng nào cần làm thủ tục check-in.
                  Nếu bạn đã có phòng đang ở, hãy chuyển sang mục <strong>QR Code</strong> để lấy khóa số.
                </p>
                {eligibleForStay.length > 0 && (
                  <button
                    type="button"
                    className="btn-action-primary"
                    style={{ marginTop: '14px' }}
                    onClick={() => setActiveSubTab('qr')}
                  >
                    <QrCode size={16} /> Xem chìa khóa phòng ({eligibleForStay[0].roomNumber})
                  </button>
                )}
              </div>
            ) : (
              <>
                {/* Booking Selector */}
                {eligibleForCheckIn.length > 1 && (
                  <div className="checkin-booking-selector">
                    <label>Chọn kỳ nghỉ cần làm thủ tục:</label>
                    <select
                      value={selectedBooking?.id || ''}
                      onChange={(e) => {
                        const found = bookings.find(b => String(b.id) === e.target.value);
                        setSelectedBooking(found);
                      }}
                    >
                      {eligibleForCheckIn.map(b => (
                        <option key={b.id} value={b.id}>
                          {b.code} - {b.roomName} (Nhận: {b.checkIn})
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {selectedBooking && (
                  <div className="selected-booking-summary">
                    <div className="summary-left">
                      <span className="summary-badge">Sẵn sàng Check-in trực tuyến</span>
                      <h4>{selectedBooking.roomName}</h4>
                      <p>Mã đơn: <strong>{selectedBooking.code}</strong> • Dự kiến phòng: <strong>{selectedBooking.roomNumber}</strong></p>
                      <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                        Ngày nhận: <strong>{selectedBooking.checkIn} (từ 14:00)</strong>
                      </p>
                    </div>
                  </div>
                )}

                {/* Form */}
                <form onSubmit={handlePerformCheckIn} className="checkin-form">
                  <div className="form-legend">
                    <ShieldCheck size={18} style={{ color: 'var(--brand-primary)' }} />
                    <span>Xác thực thông tin lưu trú (Bộ Công An quy định)</span>
                  </div>

                  <div className="form-group">
                    <label>Họ và tên khách chính</label>
                    <input
                      type="text"
                      className="pwa-input"
                      required
                      value={checkinForm.fullName}
                      onChange={(e) => setCheckinForm({ ...checkinForm, fullName: e.target.value })}
                      placeholder="NGUYEN VAN A"
                    />
                  </div>

                  <div className="form-group">
                    <label>Số CCCD / Hộ chiếu (Passport)</label>
                    <input
                      type="text"
                      className="pwa-input"
                      value={checkinForm.idNumber}
                      onChange={(e) => setCheckinForm({ ...checkinForm, idNumber: e.target.value })}
                      placeholder="001201019999 hoặc B1234567"
                    />
                  </div>

                  <div className="form-row">
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Số điện thoại</label>
                      <input
                        type="tel"
                        className="pwa-input"
                        required
                        value={checkinForm.phone}
                        onChange={(e) => setCheckinForm({ ...checkinForm, phone: e.target.value })}
                        placeholder="0912345678"
                      />
                    </div>
                    <div className="form-group" style={{ flex: 1 }}>
                      <label>Giờ đến dự kiến</label>
                      <select
                        className="pwa-input"
                        value={checkinForm.arrivalTime}
                        onChange={(e) => setCheckinForm({ ...checkinForm, arrivalTime: e.target.value })}
                      >
                        <option value="12:00">12:00 (Sớm)</option>
                        <option value="14:00">14:00 (Đúng giờ)</option>
                        <option value="16:00">16:00</option>
                        <option value="18:00">18:00 (Buổi tối)</option>
                        <option value="20:00">Sau 20:00</option>
                      </select>
                    </div>
                  </div>

                  {/* ID Card Scan Mock */}
                  <div className="id-card-upload-box">
                    <label style={{ display: 'block', fontSize: '13px', fontWeight: '600', marginBottom: '8px' }}>
                      Hình ảnh CCCD / Hộ chiếu:
                    </label>
                    <div className="upload-slots">
                      <button
                        type="button"
                        className={`upload-slot ${idFrontUploaded ? 'done' : ''}`}
                        onClick={() => setIdFrontUploaded(!idFrontUploaded)}
                      >
                        <Camera size={20} />
                        <span>{idFrontUploaded ? '✓ Mặt trước đã chụp' : '+ Mặt trước CCCD'}</span>
                      </button>
                      <button
                        type="button"
                        className={`upload-slot ${idBackUploaded ? 'done' : ''}`}
                        onClick={() => setIdBackUploaded(!idBackUploaded)}
                      >
                        <Camera size={20} />
                        <span>{idBackUploaded ? '✓ Mặt sau đã chụp' : '+ Mặt sau CCCD'}</span>
                      </button>
                    </div>
                    <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '4px' }}>
                      Chụp ảnh giúp đẩy nhanh tốc độ nhận phòng tại quầy không quá 10 giây.
                    </small>
                  </div>

                  <div className="form-group">
                    <label>Yêu cầu tiện ích nhận phòng (tùy chọn)</label>
                    <input
                      type="text"
                      className="pwa-input"
                      placeholder="Phòng tầng cao, view thoáng, giường êm..."
                      value={checkinForm.specialRequests}
                      onChange={(e) => setCheckinForm({ ...checkinForm, specialRequests: e.target.value })}
                    />
                  </div>

                  <label className="checkbox-label" style={{ fontSize: '12px', color: 'var(--text-secondary)' }}>
                    <input
                      type="checkbox"
                      checked={checkinForm.agreedRules}
                      onChange={(e) => setCheckinForm({ ...checkinForm, agreedRules: e.target.checked })}
                      required
                    />
                    <span>Tôi cam kết thông tin khai báo là chính xác theo quy định lưu trú.</span>
                  </label>

                  <button
                    type="submit"
                    className="btn-primary-block"
                    disabled={submittingCheckIn || checkInSuccess}
                    style={{ marginTop: '16px' }}
                  >
                    {submittingCheckIn ? 'Đang kích hoạt khóa số...' : checkInSuccess ? '✓ Check-in thành công!' : 'Xác nhận Check-in Trực Tuyến'}
                  </button>
                </form>
              </>
            )}
          </div>
        )}

        {/* ==================== SUBTAB 2: QR CODE / DIGITAL KEY ==================== */}
        {activeSubTab === 'qr' && (
          <div className="qr-key-panel">
            {eligibleForStay.length === 0 ? (
              <div className="checkin-empty-box">
                <KeyRound size={44} style={{ color: 'var(--brand-primary)', margin: '0 auto 12px' }} />
                <h3>Chưa có thẻ phòng hoạt động</h3>
                <p>
                  Bạn cần hoàn tất <strong>Online check-in</strong> trước hoặc khi đến lễ tân khách sạn để nhận khóa phòng điện tử.
                </p>
                <button
                  type="button"
                  className="btn-action-primary"
                  style={{ marginTop: '14px' }}
                  onClick={() => setActiveSubTab('online')}
                >
                  <KeyRound size={16} /> Đến mục Online check-in ngay
                </button>
              </div>
            ) : (
              <div className="digital-key-card">
                {/* 5-Star Card Header */}
                <div className="key-card-header">
                  <div className="key-hotel-brand">
                    <Sparkles size={16} className="crown-glow" />
                    <span>LUXSTAY DIGITAL KEY</span>
                  </div>
                  <span className="key-status-indicator">Đang hoạt động</span>
                </div>

                {/* Room Info */}
                <div className="key-card-room-hero">
                  <div className="room-big-badge">Phòng {selectedBooking?.roomNumber || '302'}</div>
                  <div className="room-type-title">{selectedBooking?.roomName || 'Deluxe King Ocean View'}</div>
                  <div className="room-hotel-sub">LuxStay Grand Resort • Tầng 3</div>
                </div>

                {/* QR Canvas */}
                <div className="key-qr-container">
                  <img
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=220x220&data=LUXSTAY_ROOMKEY_${selectedBooking?.code || 'BK9901'}_${selectedBooking?.roomNumber || '302'}`}
                    alt="Room Key QR"
                    className="qr-key-image"
                  />
                  <div className="qr-scan-guide">
                    Chạm mã QR vào cảm biến cửa hoặc mở NFC
                  </div>
                </div>

                {/* Passcode fallback */}
                <div className="key-pin-box">
                  <div className="pin-label">MÃ PIN CỬA PHÒNG</div>
                  <div className="pin-digits">8 3 9 2 #</div>
                  <div className="pin-hint">Nhập mã trên bàn phím cảm ứng cửa phòng</div>
                </div>

                {/* NFC Tap Button */}
                <div className="key-tap-actions">
                  <button
                    type="button"
                    className={`btn-nfc-tap ${nfcScanning ? 'scanning' : ''} ${doorUnlocked ? 'unlocked' : ''}`}
                    onClick={handleSimulateDoorUnlock}
                    disabled={nfcScanning}
                  >
                    <Smartphone size={20} />
                    <span>
                      {nfcScanning ? 'Đang truyền tín hiệu NFC...'
                        : doorUnlocked ? '✓ Cửa đã mở thành công!'
                        : 'Mở cửa phòng bằng NFC'}
                    </span>
                  </button>
                </div>

                {/* Amenities & Wifi Box */}
                <div className="key-amenities-accordion">
                  <div className="amenity-item">
                    <Wifi size={16} />
                    <div className="amenity-info">
                      <strong>Wi-Fi Tốc độ cao:</strong>
                      <span>LuxStay_HighSpeed (Mật khẩu: luxury2026)</span>
                    </div>
                  </div>
                  <div className="amenity-item">
                    <Clock size={16} />
                    <div className="amenity-info">
                      <strong>Giờ trả phòng:</strong>
                      <span>Trước 12:00 ngày {selectedBooking?.checkOut || 'kết thúc'}</span>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ==================== SUBTAB 3: CHECK-OUT ==================== */}
        {activeSubTab === 'checkout' && (
          <div className="checkout-panel">
            {checkOutSuccess ? (
              <div className="checkout-success-view">
                <CheckCircle2 size={54} style={{ color: 'var(--status-success)', margin: '0 auto 12px' }} />
                <h3>Trả phòng thành công!</h3>
                <p>
                  Cảm ơn quý khách đã tin tưởng và lựa chọn LuxStay. Hóa đơn chi tiết đã được gửi tới email của quý khách.
                </p>
                <div className="success-stats">
                  <div><span>Khách sạn:</span><strong>LuxStay Grand</strong></div>
                  <div><span>Phòng đã trả:</span><strong>{selectedBooking?.roomNumber || '302'}</strong></div>
                  <div><span>Điểm tích lũy:</span><strong style={{ color: 'var(--brand-primary)' }}>+50 Điểm thưởng</strong></div>
                </div>
                {onExploreMore && (
                  <button type="button" className="btn-primary-block" style={{ marginTop: '18px' }} onClick={onExploreMore}>
                    Khám phá ưu đãi kỳ nghỉ tiếp theo
                  </button>
                )}
              </div>
            ) : eligibleForStay.length === 0 ? (
              <div className="checkin-empty-box">
                <LogOut size={44} style={{ color: 'var(--text-muted)', margin: '0 auto 12px' }} />
                <h3>Không có phòng đang lưu trú</h3>
                <p>
                  Quý khách hiện không có phòng nào cần làm thủ tục trả phòng (Check-out).
                </p>
              </div>
            ) : (
              <div className="checkout-card">
                <div className="checkout-header-info">
                  <span className="badge-checkout-status">Đang lưu trú</span>
                  <h3>Trả phòng: Phòng {selectedBooking?.roomNumber || '302'}</h3>
                  <p>{selectedBooking?.roomName}</p>
                </div>

                <div className="checkout-bill-preview">
                  <h4>Tóm tắt hóa đơn kỳ nghỉ</h4>
                  <div className="bill-row">
                    <span>Thời gian lưu trú:</span>
                    <strong>{selectedBooking?.checkIn} → {selectedBooking?.checkOut}</strong>
                  </div>
                  <div className="bill-row">
                    <span>Tiền phòng:</span>
                    <span>{Number(selectedBooking?.totalPrice || 0).toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="bill-row">
                    <span>Phụ phí trả trễ (Late checkout):</span>
                    <span>0 đ</span>
                  </div>
                  <div className="bill-row">
                    <span>Tình trạng thanh toán:</span>
                    <strong style={{ color: 'var(--status-success)' }}>ĐÃ THANH TOÁN ĐỦ ✓</strong>
                  </div>
                </div>

                {/* Rating */}
                <div className="checkout-feedback-box">
                  <h4>Đánh giá kỳ nghỉ của bạn</h4>
                  <div className="stars-row">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        className={`star-btn ${star <= rating ? 'active' : ''}`}
                        onClick={() => setRating(star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    className="pwa-input"
                    rows={2}
                    placeholder="Quý khách có góp ý gì để nâng cao chất lượng dịch vụ không?..."
                    value={feedback}
                    onChange={(e) => setFeedback(e.target.value)}
                  />
                </div>

                <div className="checkout-reminder">
                  <AlertCircle size={16} />
                  <span>Xin quý khách nhớ kiểm tra lại tư trang, hành lý cá nhân trước khi rời khỏi phòng.</span>
                </div>

                <button
                  type="button"
                  className="btn-action-primary-danger"
                  disabled={submittingCheckOut}
                  onClick={handlePerformCheckOut}
                >
                  <LogOut size={16} />
                  <span>{submittingCheckOut ? 'Đang hoàn tất thủ tục...' : 'Xác nhận Trả phòng (Check-out Trực Tuyến)'}</span>
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
