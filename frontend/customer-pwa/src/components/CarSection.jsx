import React, { useState, useEffect } from 'react';
import {
  Car as CarIcon, MapPin, Calendar, Users, Fuel, Gauge, ShieldCheck,
  Search, Star, Check, Plus, ShoppingBag, X, UserCheck, Zap, Sparkles
} from 'lucide-react';
import api from '../api';

const CITIES = [
  { id: 'all', name: 'Tất cả' },
  { id: '1', name: 'Phú Quốc' },
  { id: '2', name: 'Nha Trang' },
  { id: '3', name: 'Đà Nẵng' },
  { id: '4', name: 'Hà Nội' },
  { id: '5', name: 'TP.HCM' },
];

const VEHICLE_TYPES = [
  { id: 'all', name: 'Tất cả loại xe' },
  { id: 'SUV', name: 'SUV Gầm cao' },
  { id: 'Sedan', name: 'Sedan' },
  { id: 'MPV', name: 'MPV 7 chỗ' },
  { id: 'Luxury', name: 'Xe sang VIP' },
];

export default function CarSection({ onAddToCart, onDirectCheckout }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCar, setSelectedCar] = useState(null);

  // Rental booking config in modal
  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 3);
    d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [driverRequired, setDriverRequired] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [dropoffLocation, setDropoffLocation] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const fetchCars = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity !== 'all') params.city_id = selectedCity;
      if (selectedType !== 'all') params.carType = selectedType;
      const res = await api.get('/cars', { params });
      setCars(res.data?.data || []);
    } catch (err) {
      console.warn('Could not load cars:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCars();
  }, [selectedCity, selectedType]);

  const handleOpenDetail = (car) => {
    setSelectedCar(car);
    setDriverRequired(false);
    setPickupLocation(`Sân bay ${car.city?.name || 'hoặc Khách sạn'}`);
    setDropoffLocation(`Sân bay ${car.city?.name || 'hoặc Khách sạn'}`);
  };

  // Calculate rental duration in days
  const calculateDays = () => {
    const p = new Date(pickupDate);
    const r = new Date(returnDate);
    const diffHours = (r - p) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diffHours / 24));
  };

  const rentalDays = calculateDays();
  const driverFeePerDay = 300000;
  const currentDriverFee = driverRequired ? driverFeePerDay * rentalDays : 0;
  const currentBasePrice = selectedCar ? Number(selectedCar.price_per_day) * rentalDays : 0;
  const currentTotal = currentBasePrice + currentDriverFee;

  const handleAddCarToTrip = (isDirect = false) => {
    if (!selectedCar) return;
    const item = {
      type: 'car',
      id: `car_${selectedCar.id}_${Date.now()}`,
      carId: selectedCar.id,
      name: selectedCar.name,
      brand: selectedCar.brand,
      model: selectedCar.model,
      image: selectedCar.image,
      cityName: selectedCar.city?.name || 'Việt Nam',
      pickupDatetime: pickupDate,
      returnDatetime: returnDate,
      rentalDays,
      driverRequired,
      driverFee: currentDriverFee,
      pricePerDay: Number(selectedCar.price_per_day),
      totalPrice: currentTotal,
      pickupLocation: pickupLocation || 'Nhận tại sân bay / khách sạn',
      dropoffLocation: dropoffLocation || 'Trả tại sân bay / khách sạn',
    };

    if (isDirect) {
      setSelectedCar(null);
      if (onDirectCheckout) onDirectCheckout(item);
    } else {
      if (onAddToCart) onAddToCart(item);
      setActionNotice('Đã thêm dịch vụ thuê xe vào chuyến đi!');
      setTimeout(() => setActionNotice(''), 2500);
      setSelectedCar(null);
    }
  };

  return (
    <div className="car-section-container">
      {/* Search Header Banner */}
      <div className="travel-hero-banner car-theme">
        <div className="travel-hero-content">
          <span className="hero-pill-badge">
            <CarIcon size={14} /> Tự Do Lăn Bánh & Khám Phá
          </span>
          <h2>Dịch Vụ Thuê Xe Du Lịch Tự Lái & Có Tài</h2>
          <p>Dàn xe đời mới, giao xe tận nơi sân bay hoặc resort, bảo hiểm vật chất toàn diện</p>
        </div>

        {/* City Filter Pills */}
        <div className="destination-pills-row">
          {CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`dest-pill ${selectedCity === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCity(c.id)}
            >
              {c.name}
            </button>
          ))}
        </div>

        {/* Type Filter Pills */}
        <div className="type-pills-row">
          {VEHICLE_TYPES.map((t) => (
            <button
              key={t.id}
              type="button"
              className={`type-pill ${selectedType === t.id ? 'active' : ''}`}
              onClick={() => setSelectedType(t.id)}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {actionNotice && (
        <div className="floating-toast-alert">
          <Check size={16} /> {actionNotice}
        </div>
      )}

      {/* Car Grid */}
      <div className="section-content-wrap">
        <div className="section-title-bar">
          <div>
            <h3>Xe Sẵn Sàng Phục Vụ</h3>
            <p>100% xe sạch sẽ, bảo dưỡng định kỳ, thủ tục giao nhận nhanh chóng chỉ 5 phút</p>
          </div>
          <span className="count-badge">{cars.length} Xe</span>
        </div>

        {loading ? (
          <div className="travel-loading-box">
            <div className="spinner"></div>
            <p>Đang tải dàn xe du lịch...</p>
          </div>
        ) : cars.length === 0 ? (
          <div className="travel-empty-box">
            <CarIcon size={40} />
            <p>Không có xe nào phù hợp với bộ lọc đã chọn.</p>
          </div>
        ) : (
          <div className="travel-card-grid">
            {cars.map((car) => (
              <div key={car.id} className="travel-card car-card" onClick={() => handleOpenDetail(car)}>
                <div className="travel-card-media car-media">
                  <img src={car.image} alt={car.name} loading="lazy" />
                  <span className="dest-tag">
                    <MapPin size={12} /> {car.city?.name || 'Việt Nam'}
                  </span>
                  {car.fuel_type === 'Electric' && (
                    <span className="electric-tag">
                      <Zap size={11} fill="#0D9488" /> Xe Điện VinFast
                    </span>
                  )}
                </div>

                <div className="travel-card-body">
                  <div className="car-specs-row">
                    <span className="spec-tag"><Users size={12} /> {car.seats} Chỗ</span>
                    <span className="spec-tag"><Gauge size={12} /> {car.transmission === 'Automatic' ? 'Tự động' : 'Số sàn'}</span>
                    <span className="spec-tag"><Fuel size={12} /> {car.fuel_type === 'Electric' ? 'Pin sạc' : car.fuel_type}</span>
                  </div>

                  <h4 className="travel-card-title">{car.name}</h4>
                  <p className="travel-card-desc">{car.description}</p>

                  <div className="travel-card-perk">
                    <ShieldCheck size={14} className="perk-icon" />
                    <span>Miễn phí giao xe tại Sân bay & Resort trong bán kính 10km</span>
                  </div>

                  <div className="travel-card-footer">
                    <div className="price-box">
                      <span className="price-label">Giá thuê theo ngày</span>
                      <div className="price-val">
                        <strong>{Number(car.price_per_day).toLocaleString('vi-VN')}</strong>
                        <span className="unit">đ / ngày</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="card-action-btn car-accent"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(car);
                      }}
                    >
                      Chọn Thuê
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Car Detail & Booking Modal */}
      {selectedCar && (
        <div className="travel-modal-backdrop" onClick={() => setSelectedCar(null)}>
          <div className="travel-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setSelectedCar(null)}
            >
              <X size={20} />
            </button>

            <div className="modal-hero-banner">
              <img src={selectedCar.image} alt={selectedCar.name} />
              <div className="modal-hero-overlay">
                <span className="modal-city-tag">
                  <MapPin size={12} /> {selectedCar.city?.name}
                </span>
                <h3>{selectedCar.name}</h3>
                <div className="hero-meta-row">
                  <span><Users size={14} /> {selectedCar.seats} Ghế ngồi</span>
                  <span><Gauge size={14} /> Hộp số {selectedCar.transmission === 'Automatic' ? 'Tự động' : 'Số sàn'}</span>
                  <span><Fuel size={14} /> Nhiên liệu: {selectedCar.fuel_type}</span>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              <div className="modal-content-section">
                <h4>Đặc Điểm & Tiện Nghi Xe</h4>
                <p className="modal-text-lead">{selectedCar.description}</p>
                <div className="car-feature-bullets">
                  <div className="feature-item"><Check size={14} color="#16A34A" /> Camera 360 & Cảm biến lùi toàn cảnh</div>
                  <div className="feature-item"><Check size={14} color="#16A34A" /> Kết nối Apple CarPlay / Android Auto không dây</div>
                  <div className="feature-item"><Check size={14} color="#16A34A" /> Bảo hiểm vật chất xe 2 chiều trọn gói</div>
                  <div className="feature-item"><Check size={14} color="#16A34A" /> Xe giao luôn sạch sẽ, full nhiên liệu / sạc đầy</div>
                </div>
              </div>

              {/* Rental Configuration */}
              <div className="booking-config-panel">
                <h4>Thời Gian & Địa Điểm Thuê Xe</h4>

                <div className="config-row-grid">
                  <div className="config-field">
                    <label>Ngày & Giờ Nhận Xe</label>
                    <input
                      type="datetime-local"
                      className="form-control-styled"
                      value={pickupDate}
                      onChange={(e) => setPickupDate(e.target.value)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Ngày & Giờ Trả Xe</label>
                    <input
                      type="datetime-local"
                      className="form-control-styled"
                      value={returnDate}
                      onChange={(e) => setReturnDate(e.target.value)}
                    />
                  </div>
                </div>

                <div className="rental-duration-banner">
                  <Calendar size={16} />
                  <span>Thời gian thuê: <strong>{rentalDays} ngày</strong> (24h/ngày)</span>
                </div>

                <div className="config-field" style={{ marginTop: '14px' }}>
                  <label>Địa điểm giao nhận xe</label>
                  <input
                    type="text"
                    className="form-control-styled"
                    placeholder="VD: Sân bay Phú Quốc / Sảnh khách sạn Bai Dai"
                    value={pickupLocation}
                    onChange={(e) => {
                      setPickupLocation(e.target.value);
                      setDropoffLocation(e.target.value);
                    }}
                  />
                </div>

                {/* Driver Option */}
                <div
                  className={`driver-option-card ${driverRequired ? 'active' : ''}`}
                  onClick={() => setDriverRequired(!driverRequired)}
                >
                  <div className="driver-option-left">
                    <div className="checkbox-custom">
                      {driverRequired && <Check size={14} color="#FFFFFF" />}
                    </div>
                    <div>
                      <div className="driver-title">
                        <UserCheck size={16} /> Yêu cầu tài xế bản địa chuyên nghiệp
                      </div>
                      <p className="driver-desc">Tài xế am hiểu đường xá, lịch sự, phục vụ 10 tiếng/ngày</p>
                    </div>
                  </div>
                  <div className="driver-price">
                    +{(driverFeePerDay * rentalDays).toLocaleString('vi-VN')} đ
                    <small>({driverFeePerDay.toLocaleString('vi-VN')} đ/ngày)</small>
                  </div>
                </div>

                {/* Price breakdown */}
                <div className="price-breakdown-box">
                  <div className="breakdown-row">
                    <span>Giá thuê xe ({rentalDays} ngày):</span>
                    <span>{currentBasePrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                  {driverRequired && (
                    <div className="breakdown-row">
                      <span>Phí tài xế ({rentalDays} ngày):</span>
                      <span>+{currentDriverFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="breakdown-row total">
                    <span>Tổng tạm tính:</span>
                    <span>{currentTotal.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div className="travel-modal-footer">
              <div className="modal-total-box">
                <span className="total-label">Tổng thanh toán ({rentalDays} ngày)</span>
                <span className="total-value">{currentTotal.toLocaleString('vi-VN')} đ</span>
              </div>

              <div className="modal-actions-group">
                <button
                  type="button"
                  className="btn-add-trip"
                  onClick={() => handleAddCarToTrip(false)}
                >
                  <Plus size={16} /> Thêm Vào Chuyến Đi
                </button>
                <button
                  type="button"
                  className="btn-book-now car-accent"
                  onClick={() => handleAddCarToTrip(true)}
                >
                  <ShoppingBag size={16} /> Thuê Xe Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
