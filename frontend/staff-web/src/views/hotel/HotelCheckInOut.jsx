import React from 'react';

export default function HotelCheckInOut({ bookings, onConfirmCheckIn, onOpenInvoice }) {
  const confirmedBookings = bookings.filter(b => b.status === 'Confirmed');
  const checkedInBookings = bookings.filter(b => b.status === 'CheckedIn');

  return (
    <div className="tab-checkin">
      <div className="page-header">
        <h2>Quy Trình Check-In / Check-Out</h2>
        <p>Xử lý nhận phòng và thanh toán trả phòng cho khách hàng</p>
      </div>

      <div className="grid-2col">
        <div className="panel">
          <h3>📥 Dự Kiến Check-In Hôm Nay</h3>
          <div className="flow-list">
            {confirmedBookings.map(b => (
              <div key={b.id} className="flow-item">
                <div>
                  <h4>{b.customerName} — P.{b.roomNumber}</h4>
                  <p>Mã: {b.id} | SDT: {b.phone}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => onConfirmCheckIn(b)}
                >
                  Xác Nhận Check-In 🔑
                </button>
              </div>
            ))}
            {confirmedBookings.length === 0 && <p className="text-muted">Không có check-in tồn đọng</p>}
          </div>
        </div>

        <div className="panel">
          <h3>📤 Đang Ở — Chuẩn Bị Check-Out</h3>
          <div className="flow-list">
            {checkedInBookings.map(b => (
              <div key={b.id} className="flow-item">
                <div>
                  <h4>{b.customerName} — P.{b.roomNumber}</h4>
                  <p>Mã: {b.id} | Ngày trả: {b.checkOut}</p>
                </div>
                <button
                  type="button"
                  className="btn btn-gold"
                  onClick={() => onOpenInvoice(b)}
                >
                  Thanh Toán & Out 🧾
                </button>
              </div>
            ))}
            {checkedInBookings.length === 0 && <p className="text-muted">Không có phòng sẵn sàng check-out</p>}
          </div>
        </div>
      </div>
    </div>
  );
}
