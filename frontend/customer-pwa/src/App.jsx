import React, { useEffect, useMemo, useState } from 'react';
import api from './api';
import ConciergeChat from './components/ConciergeChat';
import BookingFlow from './components/BookingFlow';

const AUTH_STORAGE_KEY = 'luxstay_customer_token';
const USER_STORAGE_KEY = 'luxstay_customer_user';

const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(USER_STORAGE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export default function App() {
  const [user, setUser] = useState(getStoredUser);
  const [authMode, setAuthMode] = useState('login');
  const [authModalOpen, setAuthModalOpen] = useState(false);
  const [authForm, setAuthForm] = useState({
    full_name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
  });
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');
  const [activeTab, setActiveTab] = useState('explore'); // explore, my-stay, service, invoice
  const [conciergeOpen, setConciergeOpen] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [showBookingModal, setShowBookingModal] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [branches, setBranches] = useState([]);
  const [selectedBranchId, setSelectedBranchId] = useState('');
  const [availableRooms, setAvailableRooms] = useState([]);
  const [roomsLoading, setRoomsLoading] = useState(false);
  const [roomsError, setRoomsError] = useState('');

  const [bookingForm, setBookingForm] = useState({
    fullName: '',
    phone: '',
    email: '',
    checkIn: '2026-09-14',
    checkOut: '2026-09-16',
    guests: 2
  });

  const formatCurrency = (value) =>
    Number(value || 0).toLocaleString('vi-VN', { maximumFractionDigits: 0 }) + ' đ';

  const refreshBranchOptions = async () => {
    try {
      const { data } = await api.get('/hotels/branches');
      const list = data?.data || [];
      setBranches(list);
      if (list.length && !selectedBranchId) {
        setSelectedBranchId(String(list[0].id));
      }
    } catch (error) {
      console.error('Failed to load branches', error);
    }
  };

  const loadAvailableRooms = async (branchId = selectedBranchId, checkIn = bookingForm.checkIn, checkOut = bookingForm.checkOut, guests = bookingForm.guests) => {
    if (!checkIn || !checkOut) return;

    setRoomsLoading(true);
    setRoomsError('');

    try {
      const params = {
        checkin_date: checkIn,
        checkout_date: checkOut,
        num_guests: guests,
      };

      if (branchId) params.hotel_branch_id = branchId;

      const { data } = await api.get('/rooms/available', { params });
      const rooms = (data?.data || []).map((room) => {
        const roomType = room.roomType || {};
        const price = Number(roomType.base_price || room.price || 0);
        const amenities = Array.isArray(roomType.amenities)
          ? roomType.amenities
          : (typeof roomType.amenities === 'string' ? JSON.parse(roomType.amenities || '[]') : []);

        return {
          id: room.id,
          hotel_branch_id: room.hotel_branch_id,
          name: `${roomType.name || 'Phòng'} ${room.room_number}`,
          category: roomType.name || 'Standard',
          price,
          image: room.image_url || roomType.image_url || 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=600&q=80',
          amenities: amenities.length ? amenities.slice(0, 4) : ['Wi-Fi', 'View', 'Air Conditioning'],
          rating: 4.8,
          roomNumber: room.room_number,
          floor: room.floor,
        };
      });

      setAvailableRooms(rooms);
    } catch (error) {
      console.error('Failed to load rooms', error);
      setAvailableRooms([]);
      setRoomsError(error.response?.data?.message || 'Không thể tải danh sách phòng cho ngày đã chọn.');
    } finally {
      setRoomsLoading(false);
    }
  };

  const persistAuth = (token, userData) => {
    localStorage.setItem(AUTH_STORAGE_KEY, token);
    localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(userData));
    setUser(userData);
  };

  const ensureCustomerProfile = async (userData) => {
    try {
      const { data } = await api.get('/auth/me');
      const profile = data?.data?.customerProfile;

      if (profile?.id) {
        const mergedUser = { ...userData, customerId: profile.id };
        persistAuth(localStorage.getItem(AUTH_STORAGE_KEY) || '', mergedUser);
        return profile.id;
      }

      const payload = {
        full_name: userData.full_name || userData.name || userData.email,
        email: userData.email,
        phone: userData.phone || '',
        address: '',
        id_type: 'CCCD',
        id_number: `TMP-${Date.now()}`,
        nationality: 'Vietnamese',
      };

      const createRes = await api.post('/customers', payload);
      const createdCustomerId = createRes?.data?.data?.id;
      if (!createdCustomerId) return null;

      const mergedUser = { ...userData, customerId: createdCustomerId };
      persistAuth(localStorage.getItem(AUTH_STORAGE_KEY) || '', mergedUser);
      return createdCustomerId;
    } catch (error) {
      console.error('Unable to ensure customer profile', error);
      return null;
    }
  };

  const clearAuth = () => {
    localStorage.removeItem(AUTH_STORAGE_KEY);
    localStorage.removeItem(USER_STORAGE_KEY);
    setUser(null);
    setAuthMode('login');
    setAuthForm({
      full_name: '',
      email: '',
      phone: '',
      password: '',
      confirmPassword: '',
    });
    setAuthError('');
  };

  useEffect(() => {
    const token = localStorage.getItem(AUTH_STORAGE_KEY);
    if (!token) return;

    refreshBranchOptions();

    api.get('/auth/me')
      .then(({ data }) => {
        const me = data?.data ?? data?.user ?? null;
        if (me) {
          const normalizedUser = {
            id: me.id,
            full_name: me.full_name || me.name,
            email: me.email,
            phone: me.phone,
            role: me.role,
            customerId: me.customerProfile?.id || null,
          };
          persistAuth(token, normalizedUser);
        }
      })
      .catch(() => {
        clearAuth();
      });
  }, []);

  useEffect(() => {
    refreshBranchOptions();
  }, []);

  useEffect(() => {
    if (!selectedBranchId) return;
    loadAvailableRooms(selectedBranchId, bookingForm.checkIn, bookingForm.checkOut, bookingForm.guests);
  }, [selectedBranchId, bookingForm.checkIn, bookingForm.checkOut, bookingForm.guests]);

  useEffect(() => {
    if (!user) return;

    setBookingForm((prev) => ({
      ...prev,
      fullName: prev.fullName || user.full_name || '',
      phone: prev.phone || user.phone || '',
      email: prev.email || user.email || '',
    }));
  }, [user]);

  const serviceCatalog = [
    { id: 1, name: 'Bò Bít Tết Wagyu A5', category: 'Đồ Ăn', price: 850000, icon: '🥩' },
    { id: 2, name: 'Vang Đỏ Bordeaux 2018', category: 'Thức Uống', price: 1200000, icon: '🍷' },
    { id: 3, name: 'Spa Massage Body Thụy Điển (60p)', category: 'Thư Giãn', price: 950000, icon: '💆‍♂️' },
    { id: 4, name: 'Dịch Vụ Giặt Ủi Veston Cao Cấp', category: 'Dịch Vụ Phòng', price: 250000, icon: '👔' },
  ];

  const [myBookings, setMyBookings] = useState([
    {
      id: 'BK9901',
      roomName: 'Deluxe Suite Ocean View',
      roomNumber: '101',
      checkIn: '2026-09-14',
      checkOut: '2026-09-16',
      totalPrice: 3000000,
      status: 'Active (Đã Nhận Phòng)'
    }
  ]);

  const [myOrders, setMyOrders] = useState([
    { id: 'SO-101', name: 'Bò Bít Tết Wagyu A5 x1', price: 850000, status: 'Đang Chuẩn Bị 🍳' }
  ]);

  const handleAuthSubmit = async (event) => {
    event.preventDefault();
    setAuthError('');

    if (authMode === 'register' && authForm.password !== authForm.confirmPassword) {
      setAuthError('Mật khẩu xác nhận không khớp.');
      return;
    }

    setAuthLoading(true);

    try {
      const payload = authMode === 'register'
        ? {
            full_name: authForm.full_name.trim(),
            email: authForm.email.trim(),
            phone: authForm.phone.trim(),
            password: authForm.password,
          }
        : {
            email: authForm.email.trim(),
            password: authForm.password,
          };

      const { data } = await api.post(`/auth/${authMode === 'register' ? 'register' : 'login'}`, payload);
      const responseData = data?.data ?? data ?? {};
      const token = responseData.token;
      const authUser = responseData.user ?? {
        id: responseData.id,
        full_name: responseData.full_name,
        email: responseData.email,
        phone: responseData.phone,
        role: responseData.role,
      };

      if (!token || !authUser) {
        throw new Error('Phản hồi xác thực không hợp lệ.');
      }

      persistAuth(token, authUser);
      setAuthModalOpen(false);
      setAuthForm({
        full_name: '',
        email: '',
        phone: '',
        password: '',
        confirmPassword: '',
      });
    } catch (error) {
      setAuthError(error.response?.data?.message || error.message || 'Đăng nhập không thành công.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleBookSubmit = async (e) => {
    e.preventDefault();

    if (!user) {
      setAuthError('Bạn cần đăng nhập để tiếp tục xác nhận đặt phòng và thanh toán.');
      setAuthMode('login');
      setAuthModalOpen(true);
      return;
    }

    try {
      const selectedRoom = availableRooms.find((room) => room.id === Number(showBookingModal?.id)) || showBookingModal;
      const customerId = user.customerId || await ensureCustomerProfile(user);

      if (!customerId) {
        throw new Error('Tài khoản chưa có hồ sơ khách hàng. Vui lòng đăng nhập lại.');
      }

      if (!selectedRoom?.id) {
        throw new Error('Bạn chưa chọn phòng hợp lệ để đặt.');
      }

      const payload = {
        customer_id: Number(customerId),
        room_id: Number(selectedRoom.id),
        hotel_branch_id: Number(selectedBranchId || selectedRoom.hotel_branch_id || 1),
        checkin_date: bookingForm.checkIn,
        checkout_date: bookingForm.checkOut,
        num_guests: Number(bookingForm.guests || 1),
        special_requests: 'Booked through LuxStay PWA',
        booking_source: 'Web',
      };

      const response = await api.post('/bookings', payload);
      const createdBooking = response?.data?.data;

      const newBk = {
        id: `BK${createdBooking?.id || Math.floor(1000 + Math.random() * 9000)}`,
        roomName: selectedRoom.name,
        roomNumber: selectedRoom.roomNumber || 'Dự kiến',
        checkIn: bookingForm.checkIn,
        checkOut: bookingForm.checkOut,
        totalPrice: Number(selectedRoom.price || 0) * Math.max(1, Math.ceil((new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / (1000 * 60 * 60 * 24))),
        status: 'Confirmed (Chờ Check-in)'
      };

      setMyBookings([newBk, ...myBookings]);
      setBookingSuccess(true);
      setTimeout(() => {
        setBookingSuccess(false);
        setShowBookingModal(null);
        setActiveTab('my-stay');
      }, 1500);
    } catch (error) {
      console.error('Booking failed', error);
      setAuthError(error.response?.data?.message || error.message || 'Đặt phòng không thành công. Vui lòng thử lại.');
    }
  };

  const handleOrderService = (service) => {
    const newOrd = {
      id: `SO-${Math.floor(100 + Math.random() * 900)}`,
      name: `${service.name} x1`,
      price: service.price,
      status: 'Đã Tiếp Nhận 🕒'
    };
    setMyOrders([newOrd, ...myOrders]);
    alert(`Đã đặt dịch vụ "${service.name}" cho Phòng 101!`);
  };

  const filteredRooms = selectedCategory === 'All'
    ? availableRooms
    : availableRooms.filter(r => r.category === selectedCategory);

  const conciergeBookingContext = useMemo(() => {
    const active =
      myBookings.find((b) => /active|đã nhận/i.test(b.status)) || myBookings[0];
    const guestName = bookingForm.fullName?.trim();
    if (!active && !guestName) return null;
    const roomLabel = active?.roomName || '';
    return {
      ...(guestName ? { guestName } : {}),
      ...(active
        ? {
            roomNumber: String(active.roomNumber).replace(/[^\dA-Za-z]/g, '') || active.roomNumber,
            roomType: active.roomName,
            checkinDate: active.checkIn,
            checkoutDate: active.checkOut,
            includesBreakfast: /deluxe|executive|presidential|suite|family/i.test(roomLabel),
          }
        : {}),
    };
  }, [myBookings, bookingForm.fullName]);

  const handleConciergeAction = (action) => {
    switch (action.action) {
      case 'VIEW_RESTAURANT_MENU':
      case 'ORDER_ROOM_SERVICE':
      case 'BOOK_SPA':
        setActiveTab('service');
        break;
      case 'VIEW_INVOICE':
        setActiveTab('invoice');
        break;
      case 'BOOK_TRANSPORT':
        alert('Quý khách vui lòng liên hệ quầy lễ tân (1800-588-879) để đặt xe đón/tiễn sân bay.');
        break;
      default:
        break;
    }
  };

  return (
    <div className="pwa-container">
      {/* Header */}
      <header className="pwa-header">
        <div className="brand-logo">
          <span className="crown-icon">👑</span>
          <h1>LuxStay PWA</h1>
        </div>

        {user ? (
          <div className="header-user-wrap">
            <span className="header-user-name">{user.full_name || 'Khách hàng'}</span>
            <button type="button" className="header-logout-btn" onClick={clearAuth}>Đăng xuất</button>
          </div>
        ) : (
          <button type="button" className="header-guest-login-btn" onClick={() => { setAuthMode('login'); setAuthModalOpen(true); setAuthError(''); }}>
            Đăng nhập
          </button>
        )}

        <button
          type="button"
          className="header-luxbot-btn"
          onClick={() => setConciergeOpen(true)}
          aria-label="Mở chatbot LuxBot"
        >
          <span>💬</span>
          <span>LuxBot</span>
        </button>
      </header>

      {/* TAB 1: EXPLORE / SEARCH ROOMS */}
      {activeTab === 'explore' && (
        <main>
          <div className="hero-banner">
            <h2>Nghỉ Dưỡng Thượng Lưu</h2>
            <p>Giảm ngay 20% khi đặt phòng trực tiếp qua LuxStay App</p>
          </div>

          <div className="section-title">
            <span>Danh Mục Hạng Phòng</span>
          </div>

          <div className="form-group-pwa" style={{ margin: '0 18px 18px', padding: '0' }}>
            <label style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Chi nhánh / khu vực</label>
            <select
              className="form-input"
              value={selectedBranchId}
              onChange={(e) => setSelectedBranchId(e.target.value)}
            >
              {branches.length === 0 ? <option value="">Đang tải chi nhánh...</option> : branches.map((branch) => (
                <option key={branch.id} value={branch.id}>{branch.name} · {branch.city}</option>
              ))}
            </select>
          </div>

          <div className="categories-bar">
            {['All', 'Deluxe', 'Executive', 'Presidential', 'Standard'].map(cat => (
              <button
                key={cat}
                className={`cat-pill ${selectedCategory === cat ? 'active' : ''}`}
                onClick={() => setSelectedCategory(cat)}
              >
                {cat === 'All' ? 'Tất Cả' : cat}
              </button>
            ))}
          </div>

          <div className="section-title">
            <span>Phòng Nổi Bật ({filteredRooms.length})</span>
          </div>

          {roomsError && (
            <div style={{ margin: '0 18px 12px', color: '#ffb4b4', fontSize: '12px' }}>{roomsError}</div>
          )}

          <div className="room-list">
            {roomsLoading ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>Đang tải phòng khả dụng...</div>
            ) : filteredRooms.length === 0 ? (
              <div style={{ padding: '18px', textAlign: 'center', color: 'var(--text-muted)' }}>
                Không có phòng trống cho ngày và chi nhánh đã chọn.
              </div>
            ) : (
              filteredRooms.map(room => (
                <div key={room.id} className="pwa-room-card">
                  <div className="room-img-wrapper" style={{ backgroundImage: `url(${room.image})` }}>
                    <div className="room-badge">★ {room.rating} Superb</div>
                  </div>
                  <div className="room-card-info">
                    <h3>{room.name}</h3>
                    <div className="room-amenities">
                      {room.amenities.map((am, i) => (
                        <span key={i}>• {am}</span>
                      ))}
                    </div>
                    <div className="room-price-row">
                      <div className="price-text">
                        {formatCurrency(room.price)} <span>/đêm</span>
                      </div>
                      <button className="btn-book" onClick={() => setShowBookingModal(room)}>
                        Đặt Ngay
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </main>
      )}

      {/* TAB 2: MY STAYS */}
      {activeTab === 'my-stay' && (
        <main style={{ padding: '10px 0' }}>
          <div className="section-title">
            <span>Chuyến Đi Của Tôi</span>
          </div>

          {myBookings.map(bk => (
            <div key={bk.id} className="stay-card">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span className="status-badge-pwa">{bk.status}</span>
                <span style={{ fontSize: '12px', color: 'var(--text-muted)' }}>Mã: {bk.id}</span>
              </div>
              <h3 style={{ margin: '10px 0 4px', fontSize: '18px' }}>{bk.roomName}</h3>
              <p style={{ fontSize: '13px', color: 'var(--gold-light)' }}>Số phòng: <strong>Phòng {bk.roomNumber}</strong></p>
              <p style={{ fontSize: '12px', color: 'var(--text-muted)', marginTop: '4px' }}>Nhận: {bk.checkIn} | Trả: {bk.checkOut}</p>

              <div className="qr-placeholder">
                QR ROOM KEY
              </div>
              <p style={{ textAlign: 'center', fontSize: '11px', color: 'var(--text-muted)' }}>Chạm QR vào cửa phòng để mở khóa tự động</p>
            </div>
          ))}
        </main>
      )}

      {/* TAB 3: ROOM SERVICES */}
      {activeTab === 'service' && (
        <main style={{ padding: '10px 0' }}>
          <div className="section-title">
            <span>Dịch Vụ Tận Phòng (In-Room Order)</span>
          </div>
          <p style={{ padding: '0 18px', fontSize: '12px', color: 'var(--text-muted)', marginBottom: '16px' }}>
            Yêu cầu được chuyển trực tiếp tới Bộ Phận Phục Vụ / Lễ Tân
          </p>

          <div className="service-grid">
            {serviceCatalog.map(srv => (
              <div key={srv.id} className="service-card">
                <div>
                  <div className="service-icon">{srv.icon}</div>
                  <div className="service-name">{srv.name}</div>
                  <div className="service-price">{srv.price.toLocaleString('vi-VN')} đ</div>
                </div>
                <button className="btn-order-sm" onClick={() => handleOrderService(srv)}>
                  + Gọi Dịch Vụ
                </button>
              </div>
            ))}
          </div>

          <div className="section-title" style={{ marginTop: '24px' }}>
            <span>Đơn Hàng Dịch Vụ Đã Đặt</span>
          </div>

          <div style={{ padding: '0 18px' }}>
            {myOrders.map(ord => (
              <div key={ord.id} style={{ background: 'var(--bg-card)', padding: '12px 14px', borderRadius: '12px', marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontSize: '13px', fontWeight: '600' }}>{ord.name}</div>
                  <div style={{ fontSize: '11px', color: 'var(--gold-primary)' }}>{ord.price.toLocaleString('vi-VN')} đ</div>
                </div>
                <span style={{ fontSize: '11px', color: 'var(--accent-green)' }}>{ord.status}</span>
              </div>
            ))}
          </div>
        </main>
      )}

      {/* TAB 4: INVOICE */}
      {activeTab === 'invoice' && (
        <main style={{ padding: '10px 0' }}>
          <div className="section-title">
            <span>Chi Tiết Hóa Đơn & Thanh Toán</span>
          </div>

          <div className="stay-card" style={{ borderStyle: 'solid' }}>
            <h3 style={{ fontSize: '16px', marginBottom: '10px', color: 'var(--gold-light)' }}>Hóa Đơn Phòng 101</h3>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span>2 Đêm Deluxe Suite:</span>
              <span>3,000,000 đ</span>
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', marginBottom: '8px' }}>
              <span>1x Bò Bít Tết Wagyu:</span>
              <span>850,000 đ</span>
            </div>
            <hr style={{ borderColor: 'var(--border-color)', margin: '10px 0' }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '16px', fontWeight: '700' }}>
              <span>TỔNG CỘNG:</span>
              <span style={{ color: 'var(--gold-primary)' }}>3,850,000 đ</span>
            </div>
            <button className="btn-book" style={{ width: '100%', marginTop: '16px', padding: '12px' }} onClick={() => alert('Đang kết nối cổng thanh toán Momo / VietQR...')}>
              Thanh Toán Ngay Qua VietQR / MoMo 💳
            </button>
          </div>
        </main>
      )}

      {/* MODAL: BOOKING — Multi-step BookingFlow */}
      {showBookingModal && (
        <BookingFlow
          room={showBookingModal}
          user={user}
          bookingForm={bookingForm}
          onClose={() => { setShowBookingModal(null); setBookingSuccess(false); }}
          onLoginRequest={() => { setShowBookingModal(null); setAuthMode('login'); setAuthModalOpen(true); setAuthError(''); }}
          onConfirm={async ({ contactInfo }) => {
            // Sync contactInfo back into bookingForm state
            setBookingForm((prev) => ({
              ...prev,
              fullName: contactInfo.fullName,
              phone: contactInfo.phone,
              email: contactInfo.email,
            }));

            const selectedRoom = availableRooms.find((room) => room.id === Number(showBookingModal?.id)) || showBookingModal;
            const customerId = user?.customerId || await ensureCustomerProfile(user);

            if (!customerId) throw new Error('Tài khoản chưa có hồ sơ khách hàng. Vui lòng đăng nhập lại.');
            if (!selectedRoom?.id) throw new Error('Bạn chưa chọn phòng hợp lệ để đặt.');

            const payload = {
              customer_id: Number(customerId),
              room_id: Number(selectedRoom.id),
              hotel_branch_id: Number(selectedBranchId || selectedRoom.hotel_branch_id || 1),
              checkin_date: bookingForm.checkIn,
              checkout_date: bookingForm.checkOut,
              num_guests: Number(bookingForm.guests || 1),
              special_requests: 'Booked through LuxStay PWA',
              booking_source: 'Web',
            };

            const response = await api.post('/bookings', payload);
            const createdBooking = response?.data?.data;

            const newBk = {
              id: `BK${createdBooking?.id || Math.floor(1000 + Math.random() * 9000)}`,
              roomName: selectedRoom.name,
              roomNumber: selectedRoom.roomNumber || 'Dự kiến',
              checkIn: bookingForm.checkIn,
              checkOut: bookingForm.checkOut,
              totalPrice: Number(selectedRoom.price || 0) * Math.max(1, Math.ceil((new Date(bookingForm.checkOut) - new Date(bookingForm.checkIn)) / (1000 * 60 * 60 * 24))),
              status: 'Confirmed (Chờ Check-in)'
            };

            setMyBookings([newBk, ...myBookings]);
            // Navigate to my-stay after modal closes
            setTimeout(() => setActiveTab('my-stay'), 1800);
          }}
        />
      )}

      <ConciergeChat
        open={conciergeOpen}
        onOpenChange={setConciergeOpen}
        bookingContext={conciergeBookingContext}
        onSuggestedAction={handleConciergeAction}
      />

      {!user && authModalOpen && (
        <div className="modal-pwa auth-modal">
          <div className="modal-pwa-content auth-dialog">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <h3 style={{ fontSize: '18px' }}>Đăng nhập để xác nhận đặt phòng</h3>
              <button style={{ background: 'none', border: 'none', color: '#fff', fontSize: '20px' }} onClick={() => setAuthModalOpen(false)}>✕</button>
            </div>

            <div className="auth-toggle">
              <button
                type="button"
                className={authMode === 'login' ? 'active' : ''}
                onClick={() => setAuthMode('login')}
              >
                Đăng nhập
              </button>
              <button
                type="button"
                className={authMode === 'register' ? 'active' : ''}
                onClick={() => setAuthMode('register')}
              >
                Đăng ký
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="auth-form">
              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Họ và tên</span>
                  <input
                    type="text"
                    className="auth-input"
                    placeholder="Nguyễn Văn A"
                    value={authForm.full_name}
                    onChange={(e) => setAuthForm({ ...authForm, full_name: e.target.value })}
                    required
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Email</span>
                <input
                  type="email"
                  className="auth-input"
                  placeholder="email@luxstay.vn"
                  value={authForm.email}
                  onChange={(e) => setAuthForm({ ...authForm, email: e.target.value })}
                  required
                />
              </label>

              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Số điện thoại</span>
                  <input
                    type="tel"
                    className="auth-input"
                    placeholder="0901234567"
                    value={authForm.phone}
                    onChange={(e) => setAuthForm({ ...authForm, phone: e.target.value })}
                    required
                  />
                </label>
              )}

              <label className="auth-field">
                <span>Mật khẩu</span>
                <input
                  type="password"
                  className="auth-input"
                  placeholder="••••••••"
                  value={authForm.password}
                  onChange={(e) => setAuthForm({ ...authForm, password: e.target.value })}
                  required
                />
              </label>

              {authMode === 'register' && (
                <label className="auth-field">
                  <span>Xác nhận mật khẩu</span>
                  <input
                    type="password"
                    className="auth-input"
                    placeholder="Nhập lại mật khẩu"
                    value={authForm.confirmPassword}
                    onChange={(e) => setAuthForm({ ...authForm, confirmPassword: e.target.value })}
                    required
                  />
                </label>
              )}

              {authError && <div className="auth-error">{authError}</div>}

              <button type="submit" className="auth-submit" disabled={authLoading}>
                {authLoading ? 'Đang xử lý...' : authMode === 'login' ? 'Đăng nhập' : 'Tạo tài khoản'}
              </button>
            </form>
          </div>
        </div>
      )}

      {/* Bottom Navigation */}
      <nav className="bottom-nav">
        <button className={`nav-btn ${activeTab === 'explore' ? 'active' : ''}`} onClick={() => setActiveTab('explore')}>
          <span className="icon">🏨</span>
          <span>Khám Phá</span>
        </button>
        <button className={`nav-btn ${activeTab === 'my-stay' ? 'active' : ''}`} onClick={() => setActiveTab('my-stay')}>
          <span className="icon">🔑</span>
          <span>Chuyến Đi</span>
        </button>
        <button className={`nav-btn ${activeTab === 'service' ? 'active' : ''}`} onClick={() => setActiveTab('service')}>
          <span className="icon">🛎️</span>
          <span>Dịch Vụ</span>
        </button>
        <button className={`nav-btn ${activeTab === 'invoice' ? 'active' : ''}`} onClick={() => setActiveTab('invoice')}>
          <span className="icon">🧾</span>
          <span>Hóa Đơn</span>
        </button>
      </nav>
    </div>
  );
}
