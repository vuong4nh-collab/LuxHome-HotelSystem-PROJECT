import React, { useState, useEffect } from 'react';
import api from './api';

// Main Staff Dashboard Application
export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('luxstay_user');
    return saved ? JSON.parse(saved) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('luxstay_token') || '');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  // Global State for UI
  const [summary, setSummary] = useState({
    occupancyRate: 75,
    todayCheckins: 8,
    todayCheckouts: 5,
    todayRevenue: 18500000,
    totalRooms: 30,
    occupiedRooms: 22,
    dirtyRooms: 4,
    maintenanceRooms: 1,
    availableRooms: 3,
  });

  const [rooms, setRooms] = useState([
    { id: 1, roomNumber: '101', type: 'Deluxe Suite', price: 1500000, status: 'Occupied', floor: 1, housekeeper: 'Nguyễn Văn A' },
    { id: 2, roomNumber: '102', type: 'Deluxe Suite', price: 1500000, status: 'Available', floor: 1, housekeeper: '' },
    { id: 3, roomNumber: '103', type: 'Executive Suite', price: 2500000, status: 'Dirty', floor: 1, housekeeper: 'Trần Thị B' },
    { id: 4, roomNumber: '201', type: 'Presidential Suite', price: 5000000, status: 'Occupied', floor: 2, housekeeper: '' },
    { id: 5, roomNumber: '202', type: 'Standard King', price: 950000, status: 'Maintenance', floor: 2, housekeeper: 'Lê Văn C' },
    { id: 6, roomNumber: '203', type: 'Standard King', price: 950000, status: 'Available', floor: 2, housekeeper: '' },
    { id: 7, roomNumber: '301', type: 'Penthouse', price: 8000000, status: 'Occupied', floor: 3, housekeeper: '' },
    { id: 8, roomNumber: '302', type: 'Executive Suite', price: 2500000, status: 'Reserved', floor: 3, housekeeper: '' },
  ]);

  const [bookings, setBookings] = useState([
    { id: 'BK1001', customerName: 'Nguyễn Văn Nam', phone: '0901234567', roomNumber: '101', checkIn: '2026-09-12', checkOut: '2026-09-15', status: 'CheckedIn', totalPrice: 4500000, deposit: 1000000 },
    { id: 'BK1002', customerName: 'Trần Minh Tuấn', phone: '0912345678', roomNumber: '201', checkIn: '2026-09-13', checkOut: '2026-09-16', status: 'Confirmed', totalPrice: 15000000, deposit: 5000000 },
    { id: 'BK1003', customerName: 'Le Thi Hoa', phone: '0988776655', roomNumber: '301', checkIn: '2026-09-10', checkOut: '2026-09-14', status: 'CheckedIn', totalPrice: 32000000, deposit: 10000000 },
    { id: 'BK1004', customerName: 'Phạm Quốc Bảo', phone: '0933445566', roomNumber: '302', checkIn: '2026-09-14', checkOut: '2026-09-17', status: 'Confirmed', totalPrice: 7500000, deposit: 2000000 },
  ]);

  const [housekeeping, setHousekeeping] = useState([
    { id: 1, roomNumber: '103', taskType: 'Dọn dẹp phòng check-out', priority: 'High', status: 'InProgress', assignedTo: 'Trần Thị B', note: 'Khách yêu cầu dọn trước 14:00' },
    { id: 2, roomNumber: '202', taskType: 'Sửa điều hòa hỏng', priority: 'Urgent', status: 'Pending', assignedTo: 'Lê Văn C', note: 'Báo hỏng chảy nước' },
    { id: 3, roomNumber: '101', taskType: 'Thay ga giường & bổ sung nước', priority: 'Normal', status: 'Completed', assignedTo: 'Nguyễn Văn A', note: 'Khách ở gia hạn' },
  ]);

  const [serviceOrders, setServiceOrders] = useState([
    { id: 'SO-501', roomNumber: '101', items: '2x Bò Bít Tết Wagyu, 1x Vang Đỏ Merlot', amount: 1850000, status: 'Preparing', createdAt: '11:20' },
    { id: 'SO-502', roomNumber: '301', items: 'Dịch vụ Giặt Ủi Veston Lux', amount: 450000, status: 'Completed', createdAt: '10:05' },
    { id: 'SO-503', roomNumber: '201', items: '1x Spa Massage Body (60p)', amount: 1200000, status: 'Pending', createdAt: '11:40' },
  ]);

  // Modals & Active Selections
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState(null);
  const [showCheckinModal, setShowCheckinModal] = useState(false);
  const [showInvoiceModal, setShowInvoiceModal] = useState(null);

  // Forms
  const [newBooking, setNewBooking] = useState({
    customerName: '', phone: '', email: '', roomId: '1', checkIn: '', checkOut: '', note: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', loginForm);
      const { token: userToken, user: userData } = res.data;
      localStorage.setItem('luxstay_token', userToken);
      localStorage.setItem('luxstay_user', JSON.stringify(userData));
      setToken(userToken);
      setUser(userData);
    } catch (err) {
      // Mock login for offline/demo if server is unavailable
      if (loginForm.username === 'admin' || loginForm.username === 'receptionist' || loginForm.username === 'staff') {
        const mockUser = { id: 1, fullName: 'Lễ Tân Demo', role: loginForm.username === 'admin' ? 'Admin' : 'Receptionist', email: `${loginForm.username}@luxstay.com` };
        const mockToken = 'mock-jwt-token-123456';
        localStorage.setItem('luxstay_token', mockToken);
        localStorage.setItem('luxstay_user', JSON.stringify(mockUser));
        setToken(mockToken);
        setUser(mockUser);
      } else {
        setLoginError(err.response?.data?.message || 'Tên đăng nhập hoặc mật khẩu không chính xác');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('luxstay_token');
    localStorage.removeItem('luxstay_user');
    setToken('');
    setUser(null);
  };

  const handleCreateBooking = (e) => {
    e.preventDefault();
    const foundRoom = rooms.find(r => r.id === parseInt(newBooking.roomId)) || rooms[0];
    const newBk = {
      id: `BK${Math.floor(1000 + Math.random() * 9000)}`,
      customerName: newBooking.customerName,
      phone: newBooking.phone,
      roomNumber: foundRoom.roomNumber,
      checkIn: newBooking.checkIn || new Date().toISOString().split('T')[0],
      checkOut: newBooking.checkOut || new Date(Date.now() + 86400000).toISOString().split('T')[0],
      status: 'Confirmed',
      totalPrice: foundRoom.price * 2,
      deposit: foundRoom.price * 0.5
    };
    setBookings([newBk, ...bookings]);
    setShowNewBookingModal(false);
    setNewBooking({ customerName: '', phone: '', email: '', roomId: '1', checkIn: '', checkOut: '', note: '' });
  };

  const updateRoomStatus = (roomId, newStatus) => {
    setRooms(rooms.map(r => r.id === roomId ? { ...r, status: newStatus } : r));
  };

  const updateTaskStatus = (taskId, newStatus) => {
    setHousekeeping(housekeeping.map(t => t.id === taskId ? { ...t, status: newStatus } : t));
  };

  const updateServiceStatus = (serviceId, newStatus) => {
    setServiceOrders(serviceOrders.map(s => s.id === serviceId ? { ...s, status: newStatus } : s));
  };

  if (!user) {
    return (
      <div className="login-wrapper">
        <div className="login-card">
          <div className="login-header">
            <div className="login-logo">
              <span className="logo-icon">👑</span>
              <span className="logo-text">LuxStay Hotel</span>
            </div>
            <h2>Đăng Nhập Quản Trị & Lễ Tân</h2>
            <p>Hệ thống quản lý khách sạn cao cấp 5 sao</p>
          </div>

          {loginError && <div className="alert alert-danger">{loginError}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Tên đăng nhập / Email</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập 'admin' hoặc 'receptionist'"
                value={loginForm.username}
                onChange={(e) => setLoginForm({ ...loginForm, username: e.target.value })}
                required
              />
            </div>

            <div className="form-group">
              <label>Mật khẩu</label>
              <input
                type="password"
                className="form-control"
                placeholder="••••••••"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                required
              />
            </div>

            <button type="submit" className="btn btn-primary btn-block" disabled={loading}>
              {loading ? 'Đang xác thực...' : 'Đăng Nhập Hàng Quản Trị →'}
            </button>
          </form>

          <div className="login-footer">
            <p>Tài khoản thử nghiệm nhanh: Username <strong>admin</strong> | Password bất kỳ</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-layout">
      {/* Sidebar Navigation */}
      <aside className="sidebar">
        <div className="brand">
          <span className="brand-badge">5★</span>
          <div>
            <h3>LuxStay</h3>
            <span className="brand-sub">Management Suite</span>
          </div>
        </div>

        <nav className="nav-menu">
          <button className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <span className="nav-icon">📊</span> Tong Quan
          </button>
          <button className={`nav-item ${activeTab === 'rooms' ? 'active' : ''}`} onClick={() => setActiveTab('rooms')}>
            <span className="nav-icon">🏨</span> So Do Phong ({rooms.length})
          </button>
          <button className={`nav-item ${activeTab === 'bookings' ? 'active' : ''}`} onClick={() => setActiveTab('bookings')}>
            <span className="nav-icon">📅</span> Dat Phong ({bookings.length})
          </button>
          <button className={`nav-item ${activeTab === 'checkin' ? 'active' : ''}`} onClick={() => setActiveTab('checkin')}>
            <span className="nav-icon">🔑</span> Check-in / Check-out
          </button>
          <button className={`nav-item ${activeTab === 'housekeeping' ? 'active' : ''}`} onClick={() => setActiveTab('housekeeping')}>
            <span className="nav-icon">🧹</span> Buong Phong ({housekeeping.filter(h => h.status !== 'Completed').length})
          </button>
          <button className={`nav-item ${activeTab === 'services' ? 'active' : ''}`} onClick={() => setActiveTab('services')}>
            <span className="nav-icon">🍽️</span> Order Dich Vu ({serviceOrders.filter(s => s.status !== 'Completed').length})
          </button>
          <button className={`nav-item ${activeTab === 'invoices' ? 'active' : ''}`} onClick={() => setActiveTab('invoices')}>
            <span className="nav-icon">🧾</span> Hoa Don & Bao Cao
          </button>
        </nav>

        <div className="user-profile">
          <div className="avatar">{user.fullName ? user.fullName[0] : 'A'}</div>
          <div className="user-info">
            <span className="user-name">{user.fullName || 'Quản Lý'}</span>
            <span className="user-role">{user.role || 'Admin'}</span>
          </div>
          <button className="btn-logout" onClick={handleLogout} title="Đăng xuất">🚪</button>
        </div>
      </aside>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="topbar">
          <div className="search-bar">
            <span>🔍</span>
            <input type="text" placeholder="Tìm theo tên khách, số phòng, mã đặt phòng..." />
          </div>

          <div className="topbar-actions">
            <button className="btn btn-gold" onClick={() => setShowNewBookingModal(true)}>
              + Tạo Đặt Phòng Mới
            </button>
            <div className="notification-bell">
              🔔<span className="badge">3</span>
            </div>
          </div>
        </header>

        <div className="content-body">
          {/* TAB 1: DASHBOARD */}
          {activeTab === 'dashboard' && (
            <div className="tab-dashboard">
              <div className="page-header">
                <h2>Tổng Quan Hoạt Động Khách Sạn</h2>
                <p>Thống kê realtime thời gian thực ngày {new Date().toLocaleDateString('vi-VN')}</p>
              </div>

              <div className="stats-grid">
                <div className="stat-card gold">
                  <div className="stat-icon">💰</div>
                  <div className="stat-info">
                    <span className="stat-label">Doanh Thu Hôm Nay</span>
                    <h3 className="stat-value">{(summary.todayRevenue).toLocaleString('vi-VN')} đ</h3>
                    <span className="stat-trend positive">↑ +14.2% so với hôm qua</span>
                  </div>
                </div>

                <div className="stat-card blue">
                  <div className="stat-icon">📈</div>
                  <div className="stat-info">
                    <span className="stat-label">Tỷ Lệ Lấp Đầy</span>
                    <h3 className="stat-value">{summary.occupancyRate}%</h3>
                    <span className="stat-trend neutral">{summary.occupiedRooms}/{summary.totalRooms} phòng có khách</span>
                  </div>
                </div>

                <div className="stat-card green">
                  <div className="stat-icon">📥</div>
                  <div className="stat-info">
                    <span className="stat-label">Check-In Hôm Nay</span>
                    <h3 className="stat-value">{summary.todayCheckins} lượt</h3>
                    <span className="stat-trend">8 phòng dự kiến đến</span>
                  </div>
                </div>

                <div className="stat-card purple">
                  <div className="stat-icon">📤</div>
                  <div className="stat-info">
                    <span className="stat-label">Check-Out Hôm Nay</span>
                    <h3 className="stat-value">{summary.todayCheckouts} lượt</h3>
                    <span className="stat-trend">5 phòng đã trả phòng</span>
                  </div>
                </div>
              </div>

              <div className="dashboard-grid">
                {/* Room Quick Map */}
                <div className="panel">
                  <div className="panel-header">
                    <h3>Trạng Thái Phòng Nhanh</h3>
                    <button className="btn btn-outline-sm" onClick={() => setActiveTab('rooms')}>Xem Tất Cả →</button>
                  </div>
                  <div className="room-matrix">
                    {rooms.map(room => (
                      <div
                        key={room.id}
                        className={`room-chip status-${room.status.toLowerCase()}`}
                        onClick={() => setSelectedRoom(room)}
                      >
                        <span className="chip-number">{room.roomNumber}</span>
                        <span className="chip-type">{room.type.split(' ')[0]}</span>
                        <span className={`chip-badge badge-${room.status.toLowerCase()}`}>{room.status}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Recent Bookings */}
                <div className="panel">
                  <div className="panel-header">
                    <h3>Đặt Phòng Gần Đây</h3>
                    <button className="btn btn-outline-sm" onClick={() => setActiveTab('bookings')}>Quản Lý →</button>
                  </div>
                  <table className="custom-table">
                    <thead>
                      <tr>
                        <th>Mã</th>
                        <th>Khách Hàng</th>
                        <th>Phòng</th>
                        <th>Trạng Thái</th>
                      </tr>
                    </thead>
                    <tbody>
                      {bookings.slice(0, 4).map(bk => (
                        <tr key={bk.id}>
                          <td><strong>{bk.id}</strong></td>
                          <td>{bk.customerName}</td>
                          <td><span className="room-pill">P.{bk.roomNumber}</span></td>
                          <td><span className={`status-badge ${bk.status.toLowerCase()}`}>{bk.status}</span></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: ROOM MAP */}
          {activeTab === 'rooms' && (
            <div className="tab-rooms">
              <div className="page-header">
                <h2>Sơ Đồ Phòng & Quản Lý Phòng</h2>
                <div className="filters">
                  <span className="filter-badge active">Tất cả ({rooms.length})</span>
                  <span className="filter-badge green">Trống ({rooms.filter(r => r.status === 'Available').length})</span>
                  <span className="filter-badge blue">Có Khách ({rooms.filter(r => r.status === 'Occupied').length})</span>
                  <span className="filter-badge yellow">Cần Dọn ({rooms.filter(r => r.status === 'Dirty').length})</span>
                  <span className="filter-badge red">Bảo Trì ({rooms.filter(r => r.status === 'Maintenance').length})</span>
                </div>
              </div>

              <div className="room-grid">
                {rooms.map(room => (
                  <div key={room.id} className={`room-card border-${room.status.toLowerCase()}`}>
                    <div className="room-card-header">
                      <h3>Phòng {room.roomNumber}</h3>
                      <span className={`status-tag ${room.status.toLowerCase()}`}>{room.status}</span>
                    </div>
                    <div className="room-card-body">
                      <p className="room-type">{room.type}</p>
                      <p className="room-price">{room.price.toLocaleString('vi-VN')} đ / đêm</p>
                      <p className="room-floor">Tầng {room.floor}</p>
                      {room.housekeeper && <p className="room-hk">🧹 HK: {room.housekeeper}</p>}
                    </div>
                    <div className="room-card-footer">
                      <select
                        className="form-control-sm"
                        value={room.status}
                        onChange={(e) => updateRoomStatus(room.id, e.target.value)}
                      >
                        <option value="Available">Available (Trống)</option>
                        <option value="Occupied">Occupied (Có khách)</option>
                        <option value="Dirty">Dirty (Cần dọn)</option>
                        <option value="Reserved">Reserved (Đã đặt)</option>
                        <option value="Maintenance">Maintenance (Bảo trì)</option>
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 3: BOOKINGS */}
          {activeTab === 'bookings' && (
            <div className="tab-bookings">
              <div className="page-header flex-between">
                <div>
                  <h2>Danh Sách Đặt Phòng</h2>
                  <p>Quản lý toàn bộ thông tin đặt phòng trước và hiện tại</p>
                </div>
                <button className="btn btn-gold" onClick={() => setShowNewBookingModal(true)}>+ Đặt Phòng Trực Tiếp</button>
              </div>

              <div className="panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã Đặt</th>
                      <th>Tên Khách Hàng</th>
                      <th>Số Điện Thoại</th>
                      <th>Phòng</th>
                      <th>Ngày Nhận</th>
                      <th>Ngày Trả</th>
                      <th>Tổng Tiền</th>
                      <th>Tiền Cọc</th>
                      <th>Trạng Thái</th>
                      <th>Thao Tác</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map(bk => (
                      <tr key={bk.id}>
                        <td><strong>{bk.id}</strong></td>
                        <td>{bk.customerName}</td>
                        <td>{bk.phone}</td>
                        <td><span className="room-pill">P.{bk.roomNumber}</span></td>
                        <td>{bk.checkIn}</td>
                        <td>{bk.checkOut}</td>
                        <td>{bk.totalPrice.toLocaleString('vi-VN')} đ</td>
                        <td>{bk.deposit.toLocaleString('vi-VN')} đ</td>
                        <td><span className={`status-badge ${bk.status.toLowerCase()}`}>{bk.status}</span></td>
                        <td>
                          <button className="btn btn-sm btn-outline" onClick={() => { setShowInvoiceModal(bk); }}>In Hóa Đơn</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 4: CHECK-IN / CHECK-OUT */}
          {activeTab === 'checkin' && (
            <div className="tab-checkin">
              <div className="page-header">
                <h2>Quy Trình Check-In / Check-Out</h2>
                <p>Xử lý nhận phòng và thanh toán trả phòng cho khách hàng</p>
              </div>

              <div className="grid-2col">
                <div className="panel">
                  <h3>📥 Dự Kiến Check-In Hôm Nay</h3>
                  <div className="flow-list">
                    {bookings.filter(b => b.status === 'Confirmed').map(b => (
                      <div key={b.id} className="flow-item">
                        <div>
                          <h4>{b.customerName} — P.{b.roomNumber}</h4>
                          <p>Mã: {b.id} | SDT: {b.phone}</p>
                        </div>
                        <button
                          className="btn btn-primary"
                          onClick={() => {
                            setBookings(bookings.map(item => item.id === b.id ? { ...item, status: 'CheckedIn' } : item));
                            const targetRoom = rooms.find(r => r.roomNumber === b.roomNumber);
                            if (targetRoom) updateRoomStatus(targetRoom.id, 'Occupied');
                          }}
                        >
                          Xác Nhận Check-In 🔑
                        </button>
                      </div>
                    ))}
                    {bookings.filter(b => b.status === 'Confirmed').length === 0 && <p className="text-muted">Không có check-in tồn đọng</p>}
                  </div>
                </div>

                <div className="panel">
                  <h3>📤 Đang Ở — Chuẩn Bị Check-Out</h3>
                  <div className="flow-list">
                    {bookings.filter(b => b.status === 'CheckedIn').map(b => (
                      <div key={b.id} className="flow-item">
                        <div>
                          <h4>{b.customerName} — P.{b.roomNumber}</h4>
                          <p>Mã: {b.id} | Ngày trả: {b.checkOut}</p>
                        </div>
                        <button
                          className="btn btn-gold"
                          onClick={() => setShowInvoiceModal(b)}
                        >
                          Thanh Toán & Out 🧾
                        </button>
                      </div>
                    ))}
                    {bookings.filter(b => b.status === 'CheckedIn').length === 0 && <p className="text-muted">Không có phòng sẵn sàng check-out</p>}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: HOUSEKEEPING */}
          {activeTab === 'housekeeping' && (
            <div className="tab-housekeeping">
              <div className="page-header flex-between">
                <div>
                  <h2>Quản Lý Buồng Phòng & Bảo Trì</h2>
                  <p>Phân công công việc dọn dẹp và kiểm tra trạng thái phòng</p>
                </div>
              </div>

              <div className="panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Số Phòng</th>
                      <th>Loại Nhiệm Vụ</th>
                      <th>Độ Ưu Tiên</th>
                      <th>Nhân Viên Phụ Trách</th>
                      <th>Ghi Chú</th>
                      <th>Trạng Thái</th>
                      <th>Cập Nhật</th>
                    </tr>
                  </thead>
                  <tbody>
                    {housekeeping.map(task => (
                      <tr key={task.id}>
                        <td><span className="room-pill">P.{task.roomNumber}</span></td>
                        <td>{task.taskType}</td>
                        <td><span className={`priority-badge priority-${task.priority.toLowerCase()}`}>{task.priority}</span></td>
                        <td>{task.assignedTo || 'Chưa phân công'}</td>
                        <td>{task.note}</td>
                        <td><span className={`status-badge ${task.status.toLowerCase()}`}>{task.status}</span></td>
                        <td>
                          <select
                            className="form-control-sm"
                            value={task.status}
                            onChange={(e) => updateTaskStatus(task.id, e.target.value)}
                          >
                            <option value="Pending">Pending (Chờ)</option>
                            <option value="InProgress">InProgress (Đang dọn)</option>
                            <option value="Completed">Completed (Hoàn tất)</option>
                          </select>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 6: SERVICES */}
          {activeTab === 'services' && (
            <div className="tab-services">
              <div className="page-header">
                <h2>Order Dịch Vụ Từ Khách Hàng</h2>
                <p>Yêu cầu đồ ăn, thức uống, spa, giặt ủi gửi trực tiếp từ Customer PWA</p>
              </div>

              <div className="panel">
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã Order</th>
                      <th>Phòng</th>
                      <th>Nội Dung Chi Tiết</th>
                      <th>Tổng Tiền</th>
                      <th>Thời Gian</th>
                      <th>Trạng Thái</th>
                      <th>Xử Lý</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceOrders.map(order => (
                      <tr key={order.id}>
                        <td><strong>{order.id}</strong></td>
                        <td><span className="room-pill">P.{order.roomNumber}</span></td>
                        <td>{order.items}</td>
                        <td>{order.amount.toLocaleString('vi-VN')} đ</td>
                        <td>{order.createdAt}</td>
                        <td><span className={`status-badge ${order.status.toLowerCase()}`}>{order.status}</span></td>
                        <td>
                          {order.status !== 'Completed' && (
                            <button
                              className="btn btn-sm btn-primary"
                              onClick={() => updateServiceStatus(order.id, 'Completed')}
                            >
                              Hoàn Thành ✓
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* TAB 7: INVOICES */}
          {activeTab === 'invoices' && (
            <div className="tab-invoices">
              <div className="page-header">
                <h2>Hóa Đơn & Báo Cáo Tài Chính</h2>
                <p>Lịch sử thanh toán và thống kê chi tiết</p>
              </div>

              <div className="panel">
                <h3>Danh Sách Hóa Đơn Đã Xuất</h3>
                <table className="custom-table">
                  <thead>
                    <tr>
                      <th>Mã Hóa Đơn</th>
                      <th>Mã Booking</th>
                      <th>Khách Hàng</th>
                      <th>Phòng</th>
                      <th>Tổng Tiền</th>
                      <th>Phương Thức</th>
                      <th>Ngày Tạo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bookings.map((bk, i) => (
                      <tr key={bk.id}>
                        <td>INV-2026-00{i+1}</td>
                        <td>{bk.id}</td>
                        <td>{bk.customerName}</td>
                        <td>P.{bk.roomNumber}</td>
                        <td>{bk.totalPrice.toLocaleString('vi-VN')} đ</td>
                        <td>Chuyển khoản QR / Tiền mặt</td>
                        <td>{bk.checkIn}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </main>

      {/* MODAL: NEW BOOKING */}
      {showNewBookingModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tạo Đặt Phòng Trực Tiếp Hàng Lễ Tân</h3>
              <button className="btn-close" onClick={() => setShowNewBookingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBooking}>
              <div className="modal-body">
                <div className="form-group">
                  <label>Họ và tên khách hàng</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Nguyễn Văn A"
                    value={newBooking.customerName}
                    onChange={(e) => setNewBooking({ ...newBooking, customerName: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="text"
                    className="form-control"
                    placeholder="0987654321"
                    value={newBooking.phone}
                    onChange={(e) => setNewBooking({ ...newBooking, phone: e.target.value })}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Chọn Phòng</label>
                  <select
                    className="form-control"
                    value={newBooking.roomId}
                    onChange={(e) => setNewBooking({ ...newBooking, roomId: e.target.value })}
                  >
                    {rooms.map(r => (
                      <option key={r.id} value={r.id}>
                        Phòng {r.roomNumber} — {r.type} ({r.price.toLocaleString('vi-VN')} đ/đêm)
                      </option>
                    ))}
                  </select>
                </div>
                <div className="grid-2col">
                  <div className="form-group">
                    <label>Ngày Check-In</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newBooking.checkIn}
                      onChange={(e) => setNewBooking({ ...newBooking, checkIn: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label>Ngày Check-Out</label>
                    <input
                      type="date"
                      className="form-control"
                      value={newBooking.checkOut}
                      onChange={(e) => setNewBooking({ ...newBooking, checkOut: e.target.value })}
                    />
                  </div>
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setShowNewBookingModal(false)}>Hủy</button>
                <button type="submit" className="btn btn-gold">Xác Nhận Đặt Phòng</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: INVOICE / CHECK-OUT */}
      {showInvoiceModal && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Hóa Đơn Thanh Toán & Check-Out</h3>
              <button className="btn-close" onClick={() => setShowInvoiceModal(null)}>✕</button>
            </div>
            <div className="modal-body printable">
              <div className="invoice-header text-center">
                <h2>👑 LuxStay Hotel & Resorts</h2>
                <p>123 Trần Phú, Quận 1, TP. Hồ Chí Minh | Hotline: 1900 8888</p>
                <hr className="divider" />
                <h3>HÓA ĐƠN GIAO DỊCH</h3>
                <p>Mã hóa đơn: <strong>INV-{showInvoiceModal.id}</strong></p>
              </div>

              <div className="invoice-meta grid-2col">
                <div>
                  <p><strong>Khách hàng:</strong> {showInvoiceModal.customerName}</p>
                  <p><strong>Số điện thoại:</strong> {showInvoiceModal.phone}</p>
                </div>
                <div>
                  <p><strong>Phòng:</strong> {showInvoiceModal.roomNumber}</p>
                  <p><strong>Thời gian ở:</strong> {showInvoiceModal.checkIn} đến {showInvoiceModal.checkOut}</p>
                </div>
              </div>

              <table className="custom-table mt-3">
                <thead>
                  <tr>
                    <th>Hạng Mục</th>
                    <th>Chi Tiết</th>
                    <th>Thành Tiền</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>Tiền Phòng (2 đêm)</td>
                    <td>Phòng {showInvoiceModal.roomNumber}</td>
                    <td>{showInvoiceModal.totalPrice.toLocaleString('vi-VN')} đ</td>
                  </tr>
                  <tr>
                    <td>Dịch vụ phát sinh</td>
                    <td>Đồ ăn & Thức uống phòng</td>
                    <td>450,000 đ</td>
                  </tr>
                  <tr>
                    <td><strong>Đã Đặt Cọc</strong></td>
                    <td>Chuyển khoản trước</td>
                    <td><strong className="text-danger">-{(showInvoiceModal.deposit).toLocaleString('vi-VN')} đ</strong></td>
                  </tr>
                </tbody>
              </table>

              <div className="invoice-total align-right mt-3">
                <h4>CÒN LẠI PHẢI THANH TOÁN: <span className="text-gold">{((showInvoiceModal.totalPrice + 450000) - showInvoiceModal.deposit).toLocaleString('vi-VN')} đ</span></h4>
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-outline" onClick={() => window.print()}>🖨️ In Hóa Đơn</button>
              <button
                className="btn btn-gold"
                onClick={() => {
                  setBookings(bookings.map(b => b.id === showInvoiceModal.id ? { ...b, status: 'CheckedOut' } : b));
                  const targetRoom = rooms.find(r => r.roomNumber === showInvoiceModal.roomNumber);
                  if (targetRoom) updateRoomStatus(targetRoom.id, 'Dirty');
                  setShowInvoiceModal(null);
                }}
              >
                Xác Nhận Thanh Toán & Check-Out ✓
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
