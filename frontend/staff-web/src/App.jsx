import React, { useState, useEffect } from 'react';
import api from './api';
import DefaultLayout from './layout/DefaultLayout';

export default function App() {
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('luxstay_user') || localStorage.getItem('hotel_user');
    return saved ? JSON.parse(saved) : { id: 1, fullName: 'Admin Manager', role: 'Admin', email: 'admin@luxstay.com' };
  });
  const [token, setToken] = useState(() => localStorage.getItem('luxstay_token') || localStorage.getItem('hotel_token') || 'mock-jwt-token');
  const [loginForm, setLoginForm] = useState({ username: '', password: '' });
  const [loginError, setLoginError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // If previous 401 redirect left '/login' in URL, clean it up without reload
    if (window.location.pathname === '/login') {
      window.history.replaceState({}, '', '/');
    }

    const handleUnauthorized = () => {
      localStorage.removeItem('luxstay_token');
      localStorage.removeItem('luxstay_user');
      localStorage.removeItem('hotel_token');
      localStorage.removeItem('hotel_user');
      setUser(null);
      setToken('');
    };

    window.addEventListener('auth:unauthorized', handleUnauthorized);
    return () => window.removeEventListener('auth:unauthorized', handleUnauthorized);
  }, []);

  // Global State for Hotel Operation Modules
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

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginError('');
    setLoading(true);
    try {
      const res = await api.post('/auth/login', loginForm);
      const { token: userToken, user: userData } = res.data;
      localStorage.setItem('luxstay_token', userToken);
      localStorage.setItem('hotel_token', userToken);
      localStorage.setItem('luxstay_user', JSON.stringify(userData));
      localStorage.setItem('hotel_user', JSON.stringify(userData));
      setToken(userToken);
      setUser(userData);
    } catch {
      // Mock login for offline/demo if server is unavailable
      const mockRoles = { admin: 'Admin', manager: 'Manager', receptionist: 'Receptionist', staff: 'Staff' };
      if (mockRoles[loginForm.username]) {
        const role = mockRoles[loginForm.username];
        const mockUser = { id: 1, fullName: `${role} Demo`, role, email: `${loginForm.username}@luxstay.com` };
        const mockToken = 'mock-jwt-token-123456';
        localStorage.setItem('luxstay_token', mockToken);
        localStorage.setItem('hotel_token', mockToken);
        localStorage.setItem('luxstay_user', JSON.stringify(mockUser));
        localStorage.setItem('hotel_user', JSON.stringify(mockUser));
        setToken(mockToken);
        setUser(mockUser);
      } else {
        setLoginError('Tên đăng nhập hoặc mật khẩu không chính xác. Thử lại với tài khoản: admin');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('luxstay_token');
    localStorage.removeItem('luxstay_user');
    localStorage.removeItem('hotel_token');
    localStorage.removeItem('hotel_user');
    setToken('');
    setUser(null);
  };


  // Tạo booking nhanh tại quầy lễ tân (walk-in) — vẫn dùng API
  const handleCreateBooking = async (newBookingData) => {
    try {
      await import('./services/bookingService').then(({ createBooking }) =>
        createBooking(newBookingData)
      );
    } catch (err) {
      // fallback: chỉ log lỗi, không crash
      console.error('Walk-in booking failed:', err);
    }
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
              <span className="logo-text">CoreUI Admin</span>
            </div>
            <h2>Đăng Nhập Quản Trị Hệ Thống</h2>
            <p>Bảng điều khiển quản lý và theo dõi khách sạn</p>
          </div>

          {loginError && <div className="alert alert-danger">{loginError}</div>}

          <form onSubmit={handleLogin} className="login-form">
            <div className="form-group">
              <label>Tên đăng nhập / Email</label>
              <input
                type="text"
                className="form-control"
                placeholder="Nhập admin, manager, receptionist hoặc staff"
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
              {loading ? 'Đang xác thực...' : 'Đăng Nhập Quản Trị →'}
            </button>
          </form>

          <div className="login-footer">
            <p>Tài khoản demo: admin, manager, receptionist hoặc staff | Mật khẩu bất kỳ khi API không kết nối</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <DefaultLayout
      user={user}
      onLogout={handleLogout}
      rooms={rooms}
      housekeeping={housekeeping}
      serviceOrders={serviceOrders}
      onUpdateRoomStatus={updateRoomStatus}
      onUpdateTaskStatus={updateTaskStatus}
      onUpdateServiceStatus={updateServiceStatus}
      onCreateBooking={handleCreateBooking}
    />
  );
}
