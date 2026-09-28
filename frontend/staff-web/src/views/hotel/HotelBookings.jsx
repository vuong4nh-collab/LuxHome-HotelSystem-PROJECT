import React from 'react';

export default function HotelBookings({ bookings, onOpenNewBooking, onOpenInvoice }) {
  return (
    <div className="tab-bookings">
      <div className="page-header flex-between">
        <div>
          <h2>Danh Sách Đặt Phòng</h2>
          <p>Quản lý toàn bộ thông tin đặt phòng trước và hiện tại</p>
        </div>
        <button className="btn btn-gold" onClick={onOpenNewBooking}>+ Đặt Phòng Trực Tiếp</button>
      </div>

      <div className="panel">
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
                  <button className="btn btn-sm btn-outline" onClick={() => onOpenInvoice(bk)}>In Hóa Đơn</button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
