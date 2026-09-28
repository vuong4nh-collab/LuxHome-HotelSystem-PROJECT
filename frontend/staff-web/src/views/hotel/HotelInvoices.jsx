import React from 'react';

export default function HotelInvoices({ bookings, onOpenInvoice }) {
  return (
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
              <th>Thao Tác</th>
            </tr>
          </thead>
          <tbody>
            {bookings.map((bk, i) => (
              <tr key={bk.id}>
                <td>INV-2026-00{i + 1}</td>
                <td>{bk.id}</td>
                <td>{bk.customerName}</td>
                <td>P.{bk.roomNumber}</td>
                <td>{bk.totalPrice.toLocaleString('vi-VN')} đ</td>
                <td>Chuyển khoản QR / Tiền mặt</td>
                <td>{bk.checkIn}</td>
                <td>
                  <button
                    type="button"
                    className="btn btn-sm btn-outline"
                    onClick={() => onOpenInvoice(bk)}
                  >
                    Xem Chi Tiết
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
