import React from 'react';

export default function HotelRooms({ rooms, onUpdateRoomStatus }) {
  return (
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
                onChange={(e) => onUpdateRoomStatus(room.id, e.target.value)}
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
  );
}
