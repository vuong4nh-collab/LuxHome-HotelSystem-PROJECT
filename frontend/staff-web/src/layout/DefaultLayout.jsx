import React, { useState } from 'react';
import AppSidebar from '../components/AppSidebar';
import AppHeader from '../components/AppHeader';
import AppBreadcrumb from '../components/AppBreadcrumb';
import AppFooter from '../components/AppFooter';
import Dashboard from '../views/dashboard/Dashboard';
import HotelRooms from '../views/hotel/HotelRooms';
import HotelBookings from '../views/hotel/HotelBookings';
import HotelCheckInOut from '../views/hotel/HotelCheckInOut';
import HotelHousekeeping from '../views/hotel/HotelHousekeeping';
import HotelServices from '../views/hotel/HotelServices';
import HotelInvoices from '../views/hotel/HotelInvoices';
import PlaceholderPage from '../views/pages/PlaceholderPage';

export default function DefaultLayout({
  user,
  onLogout,
  rooms,
  housekeeping,
  serviceOrders,
  onUpdateRoomStatus,
  onUpdateTaskStatus,
  onUpdateServiceStatus,
  onCreateBooking,
}) {
  const [activeNav, setActiveNav] = useState('dashboard');
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  // Modals state
  const [showNewBookingModal, setShowNewBookingModal] = useState(false);
  const [newBooking, setNewBooking] = useState({
    customerName: '', phone: '', email: '', roomId: '1', checkIn: '', checkOut: '', note: ''
  });


  const handleToggleSidebar = () => {
    // If mobile width, toggle drawer, else toggle collapse
    if (window.innerWidth < 992) {
      setMobileOpen(prev => !prev);
    } else {
      setCollapsed(prev => !prev);
    }
  };

  const handleCreateBookingSubmit = (e) => {
    e.preventDefault();
    onCreateBooking(newBooking);
    setShowNewBookingModal(false);
    setNewBooking({ customerName: '', phone: '', email: '', roomId: '1', checkIn: '', checkOut: '', note: '' });
  };

  const renderContent = () => {
    switch (activeNav) {
      case 'dashboard':
        return <Dashboard />;
      case 'rooms':
        return <HotelRooms rooms={rooms} onUpdateRoomStatus={onUpdateRoomStatus} />;
      case 'bookings':
        return (
          <HotelBookings
            onOpenNewBooking={() => setShowNewBookingModal(true)}
            onOpenInvoice={() => setActiveNav('invoices')}
          />
        );
      case 'checkin':
        return <HotelCheckInOut />;
      case 'housekeeping':
        return (
          <HotelHousekeeping
            housekeeping={housekeeping}
            onUpdateTaskStatus={onUpdateTaskStatus}
          />
        );
      case 'services':
        return (
          <HotelServices
            serviceOrders={serviceOrders}
            onUpdateServiceStatus={onUpdateServiceStatus}
          />
        );
      case 'invoices':
        return <HotelInvoices />;
      case 'theme-colors':
        return <PlaceholderPage title="Colors" category="Theme" description="Bảng màu sắc chuẩn CoreUI Design Tokens được ứng dụng toàn hệ thống." />;
      case 'theme-typography':
        return <PlaceholderPage title="Typography" category="Theme" description="Hệ thống kiểu chữ Inter hiển thị rõ ràng, chuyên nghiệp cho ứng dụng quản trị." />;
      case 'charts':
        return <PlaceholderPage title="Charts" category="Components" description="Biểu đồ phân tích dữ liệu chuyên sâu với Recharts và SVG Rendering." />;
      case 'widgets':
        return <PlaceholderPage title="Widgets" category="Components" description="Các khối widget độc lập với mini-chart và chỉ số thời gian thực." />;
      case 'docs':
        return <PlaceholderPage title="Documentation" category="Extras" description="Tài liệu hướng dẫn triển khai và tích hợp API hệ thống LuxStay Hotel." />;
      case 'users':
        return <PlaceholderPage title="Users Management" category="System" description="Quản lý tài khoản Admin, Manager, Receptionist, Staff và Customer." />;
      case 'settings':
        return <PlaceholderPage title="System Settings" category="System" description="Cấu hình hệ thống, tích hợp thanh toán và thiết lập ca làm việc." />;
      default:
        return <PlaceholderPage title={activeNav} category="Component" />;
    }
  };

  return (
    <div className={`default-layout-wrapper ${collapsed ? 'layout-collapsed' : ''}`}>
      {/* 1. App Sidebar */}
      <AppSidebar
        activeNav={activeNav}
        onSelectNav={setActiveNav}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
        mobileOpen={mobileOpen}
        onCloseMobile={() => setMobileOpen(false)}
      />

      {/* 2. Main Wrapper (Header + Breadcrumb + Content + Footer) */}
      <div className="layout-main-wrapper">
        <AppHeader
          onToggleSidebar={handleToggleSidebar}
          activeNav={activeNav}
          onSelectNav={setActiveNav}
          user={user}
          onLogout={onLogout}
        />

        <AppBreadcrumb
          activeNav={activeNav}
          onSelectNav={setActiveNav}
        />

        <main className="layout-content-body">
          {renderContent()}
        </main>

        <AppFooter />
      </div>

      {/* MODAL: NEW BOOKING */}
      {showNewBookingModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Tạo Đặt Phòng Trực Tiếp Hàng Lễ Tân</h3>
              <button type="button" className="btn-close" onClick={() => setShowNewBookingModal(false)}>✕</button>
            </div>
            <form onSubmit={handleCreateBookingSubmit}>
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
                <button type="submit" className="btn btn-primary" style={{ backgroundColor: '#321fdb', borderColor: '#321fdb', color: '#fff' }}>
                  Xác Nhận Đặt Phòng
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Invoice modal đã được chuyển vào HotelInvoices & HotelCheckInOut */}
    </div>
  );
}
