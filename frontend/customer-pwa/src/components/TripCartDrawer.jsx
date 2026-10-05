import React from 'react';
import {
  Luggage, Trash2, ArrowRight, X, BedDouble, Compass, Car,
  Calendar, Users, MapPin, CheckCircle2, ShieldCheck
} from 'lucide-react';

export default function TripCartDrawer({
  isOpen,
  onClose,
  tripItems = [],
  onRemoveItem,
  onProceedCheckout,
}) {
  if (!isOpen) return null;

  const totalAmount = tripItems.reduce((sum, item) => sum + Number(item.totalPrice || 0), 0);

  return (
    <div className="trip-drawer-backdrop" onClick={onClose}>
      <div className="trip-drawer-panel" onClick={(e) => e.stopPropagation()}>
        {/* Drawer Header */}
        <div className="trip-drawer-header">
          <div className="header-title-box">
            <Luggage size={22} className="header-icon" />
            <div>
              <h3>Chuyến Đi Của Bạn</h3>
              <p>{tripItems.length} dịch vụ đã sẵn sàng đặt chung</p>
            </div>
          </div>
          <button type="button" className="drawer-close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body Items */}
        <div className="trip-drawer-body">
          {tripItems.length === 0 ? (
            <div className="trip-empty-state">
              <Luggage size={48} />
              <h4>Chuyến đi chưa có dịch vụ nào</h4>
              <p>Hãy thêm phòng khách sạn, tour du lịch hoặc xe tự lái để lên lịch trình hoàn hảo và thanh toán một lần!</p>
            </div>
          ) : (
            <div className="trip-items-list">
              {tripItems.map((item, index) => {
                const isHotel = item.type === 'hotel';
                const isTour = item.type === 'tour';
                const isCar = item.type === 'car';

                return (
                  <div key={item.id || index} className={`trip-item-card type-${item.type}`}>
                    <div className="item-type-badge">
                      {isHotel && <><BedDouble size={14} /> Khách Sạn</>}
                      {isTour && <><Compass size={14} /> Tour Du Lịch</>}
                      {isCar && <><Car size={14} /> Thuê Xe</>}
                    </div>

                    <div className="item-main-content">
                      <div className="item-info">
                        <h4 className="item-name">{item.name}</h4>

                        {isHotel && (
                          <div className="item-meta">
                            <span><Calendar size={12} /> {item.checkIn} → {item.checkOut} ({item.nights} đêm)</span>
                            <span><Users size={12} /> {item.guests || 2} khách</span>
                          </div>
                        )}

                        {isTour && (
                          <div className="item-meta">
                            <span><Calendar size={12} /> Ngày: {item.tourDate}</span>
                            <span><Users size={12} /> {item.people} khách</span>
                            {item.cityName && <span><MapPin size={12} /> {item.cityName}</span>}
                          </div>
                        )}

                        {isCar && (
                          <div className="item-meta">
                            <span><Calendar size={12} /> {item.rentalDays} ngày</span>
                            <span>{item.driverRequired ? '✓ Có tài xế riêng' : '✓ Tự lái'}</span>
                          </div>
                        )}
                      </div>

                      <div className="item-right-box">
                        <span className="item-price">
                          {Number(item.totalPrice).toLocaleString('vi-VN')} đ
                        </span>
                        <button
                          type="button"
                          className="btn-remove-item"
                          title="Xóa dịch vụ này"
                          onClick={() => onRemoveItem(item.id)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}

              <div className="trip-perk-card">
                <ShieldCheck size={18} />
                <div>
                  <strong>Ưu Đãi Đặt Combo Toàn Diện</strong>
                  <p>Hệ thống tự động đồng bộ hóa đơn và hỗ trợ 24/7 suốt chuyến đi.</p>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer */}
        {tripItems.length > 0 && (
          <div className="trip-drawer-footer">
            <div className="drawer-total-row">
              <span className="label">Tổng Toàn Bộ Đơn Hàng</span>
              <span className="amount">{totalAmount.toLocaleString('vi-VN')} đ</span>
            </div>
            <button
              type="button"
              className="btn-checkout-trip"
              onClick={() => {
                onClose();
                onProceedCheckout();
              }}
            >
              Tiến Hành Đặt Chuyến Đi <ArrowRight size={18} />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
