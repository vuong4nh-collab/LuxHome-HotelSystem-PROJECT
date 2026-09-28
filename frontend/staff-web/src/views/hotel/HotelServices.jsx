import React from 'react';

export default function HotelServices({ serviceOrders, onUpdateServiceStatus }) {
  return (
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
                      type="button"
                      className="btn btn-sm btn-primary"
                      onClick={() => onUpdateServiceStatus(order.id, 'Completed')}
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
  );
}
