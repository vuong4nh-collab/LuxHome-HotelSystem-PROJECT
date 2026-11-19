import React, { useState, useEffect } from 'react';
import {
  Car as CarIcon, MapPin, Calendar, Users, Fuel, Gauge, ShieldCheck,
  Search, Star, Check, Plus, ShoppingBag, X, UserCheck, Zap, AlertCircle,
  RefreshCw, Sparkles, Heart, Tag
} from 'lucide-react';
import api from '../api';
import AccessibleDialog from './AccessibleDialog.jsx';

const CITIES = [
  { id: 'all', name: 'Tất cả', emoji: '✨' },
  { id: '1', name: 'Phú Quốc', emoji: '🏝️' },
  { id: '2', name: 'Nha Trang', emoji: '🌊' },
  { id: '3', name: 'Đà Nẵng', emoji: '🌉' },
  { id: '4', name: 'Hà Nội', emoji: '🏛️' },
  { id: '5', name: 'TP.HCM', emoji: '🌆' },
];

const VEHICLE_TYPES = [
  { id: 'all', name: 'Tất cả' },
  { id: 'SUV', name: '🚙 SUV Gầm cao' },
  { id: 'Sedan', name: '🚗 Sedan' },
  { id: 'MPV', name: '🚐 MPV 7 chỗ' },
  { id: 'Luxury', name: '✨ Xe sang VIP' },
];

export default function CarSection({ onAddToCart, onDirectCheckout }) {
  const [cars, setCars] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedCar, setSelectedCar] = useState(null);
  const [wishlist, setWishlist] = useState(new Set());

  const [pickupDate, setPickupDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 1); d.setHours(9, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [returnDate, setReturnDate] = useState(() => {
    const d = new Date(); d.setDate(d.getDate() + 3); d.setHours(18, 0, 0, 0);
    return d.toISOString().slice(0, 16);
  });
  const [driverRequired, setDriverRequired] = useState(false);
  const [pickupLocation, setPickupLocation] = useState('');
  const [actionNotice, setActionNotice] = useState('');

  const fetchCars = async () => {
    setLoading(true); setLoadError('');
    try {
      const params = {};
      if (selectedCity !== 'all') params.city_id = selectedCity;
      if (selectedType !== 'all') params.carType = selectedType;
      const res = await api.get('/cars', { params });
      if (!Array.isArray(res.data?.data)) throw new Error('Dữ liệu xe không hợp lệ.');
      setCars(res.data.data);
    } catch (err) {
      setCars([]);
      setLoadError(err.response?.data?.message || 'Không thể tải danh sách xe. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCars(); }, [selectedCity, selectedType]);

  const handleOpenDetail = (car) => {
    setSelectedCar(car);
    setDriverRequired(false);
    setPickupLocation(`Sân bay ${car.city?.name || 'hoặc Khách sạn'}`);
  };

  const calculateDays = () => {
    const diff = (new Date(returnDate) - new Date(pickupDate)) / (1000 * 60 * 60);
    return Math.max(1, Math.ceil(diff / 24));
  };

  const rentalDays = calculateDays();
  const driverFeePerDay = 300000;
  const basePrice = selectedCar ? Number(selectedCar.price_per_day) * rentalDays : 0;
  const driverFee = driverRequired ? driverFeePerDay * rentalDays : 0;
  const totalPrice = basePrice + driverFee;

  const handleAddCarToTrip = (isDirect = false) => {
    if (!selectedCar) return;
    const item = {
      type: 'car', id: `car_${selectedCar.id}_${Date.now()}`,
      carId: selectedCar.id, name: selectedCar.name,
      brand: selectedCar.brand, model: selectedCar.model,
      image: selectedCar.image, cityName: selectedCar.city?.name || 'Việt Nam',
      pickupDatetime: pickupDate, returnDatetime: returnDate,
      rentalDays, driverRequired, driverFee,
      pricePerDay: Number(selectedCar.price_per_day), totalPrice,
      pickupLocation: pickupLocation || 'Sân bay / Khách sạn',
      dropoffLocation: pickupLocation || 'Sân bay / Khách sạn',
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

  const toggleWishlist = (e, carId) => {
    e.stopPropagation();
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(carId) ? next.delete(carId) : next.add(carId);
      return next;
    });
  };

  return (
    <div className="car-section-container">
      {/* Hero Banner */}
      <div className="travel-hero-banner car-theme">
        <div className="travel-hero-content">
          <span className="hero-pill-badge">
            <CarIcon size={13} /> Tự Do Lăn Bánh &amp; Khám Phá
          </span>
          <h2>Thuê Xe Du Lịch Tự Lái &amp; Có Tài Xế</h2>
          <p>Dàn xe đời mới · Giao xe tận nơi · Bảo hiểm vật chất toàn diện</p>
        </div>

        {/* City Filter */}
        <div className="destination-pills-row" role="group" aria-label="Lọc theo điểm đến">
          {CITIES.map((c) => (
            <button key={c.id} type="button"
              className={`dest-pill ${selectedCity === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCity(c.id)} aria-pressed={selectedCity === c.id}
            >
              <span aria-hidden="true">{c.emoji}</span> {c.name}
            </button>
          ))}
        </div>

        {/* Type Filter */}
        <div className="type-pills-row" role="group" aria-label="Lọc theo loại xe">
          {VEHICLE_TYPES.map((t) => (
            <button key={t.id} type="button"
              className={`type-pill ${selectedType === t.id ? 'active' : ''}`}
              onClick={() => setSelectedType(t.id)} aria-pressed={selectedType === t.id}
            >
              {t.name}
            </button>
          ))}
        </div>
      </div>

      {/* Toast */}
      {actionNotice && (
        <div className="floating-toast-alert" role="status" aria-live="polite">
          <Check size={15} /> {actionNotice}
        </div>
      )}

      {/* Car Grid */}
      <div className="section-content-wrap">
        <div className="section-title-bar">
          <div>
            <h3 className="section-title">Xe Sẵn Sàng Phục Vụ</h3>
            <p className="section-subtitle">100% xe sạch sẽ · Giao nhận chỉ 5 phút</p>
          </div>
          {cars.length > 0 && <span className="count-badge">{cars.length} Xe</span>}
        </div>

        {loading ? (
          <div className="travel-loading-box">
            <div className="spinner" />
            <p>Đang tải dàn xe du lịch...</p>
          </div>
        ) : loadError ? (
          <div className="data-load-error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <p>{loadError}</p>
            <button type="button" onClick={fetchCars}><RefreshCw size={14} /> Thử lại</button>
          </div>
        ) : cars.length === 0 ? (
          <div className="travel-empty-box">
            <CarIcon size={36} strokeWidth={1.5} />
            <p>Không có xe nào phù hợp với bộ lọc đã chọn.</p>
            <button type="button" className="btn-retry-soft"
              onClick={() => { setSelectedCity('all'); setSelectedType('all'); }}>
              Xem tất cả xe
            </button>
          </div>
        ) : (
          <div className="travel-card-grid">
            {cars.map((car) => (
              <article key={car.id} className="travel-card car-card">
                <div className="travel-card-media car-media">
                  <img src={car.image} alt={car.name} loading="lazy" />
                  <span className="dest-tag"><MapPin size={11} /> {car.city?.name || 'Việt Nam'}</span>
                  {car.fuel_type === 'Electric' && (
                    <span className="electric-tag"><Zap size={11} fill="#0D9488" /> Điện</span>
                  )}
                  <button
                    type="button"
                    className={`wishlist-btn ${wishlist.has(car.id) ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(e, car.id)}
                    aria-label={wishlist.has(car.id) ? 'Bỏ yêu thích' : 'Yêu thích'}
                  >
                    <Heart size={14} fill={wishlist.has(car.id) ? '#DC2626' : 'none'} color={wishlist.has(car.id) ? '#DC2626' : '#fff'} />
                  </button>
                </div>

                <div className="travel-card-body">
                  <div className="car-specs-row">
                    <span className="spec-tag"><Users size={11} /> {car.seats} chỗ</span>
                    <span className="spec-tag"><Gauge size={11} /> {car.transmission === 'Automatic' ? 'Tự động' : 'Số sàn'}</span>
                    <span className="spec-tag"><Fuel size={11} /> {car.fuel_type === 'Electric' ? 'Điện' : car.fuel_type}</span>
                  </div>
                  <h4 className="travel-card-title">{car.name}</h4>
                  <p className="travel-card-desc">{car.description}</p>
                  <div className="travel-card-perk">
                    <ShieldCheck size={13} className="perk-icon" />
                    <span>Miễn phí giao xe tại Sân bay &amp; Resort (10km)</span>
                  </div>
                  <div className="travel-card-footer">
                    <div className="price-box">
                      <span className="price-label">Giá thuê</span>
                      <div className="price-val">
                        <strong>{Number(car.price_per_day).toLocaleString('vi-VN')}</strong>
                        <span className="unit">đ/ngày</span>
                      </div>
                    </div>
                    <button type="button" className="card-action-btn car-accent"
                      onClick={() => handleOpenDetail(car)}>
                      Chọn Thuê
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Car Detail Modal */}
      {selectedCar && (
        <AccessibleDialog
          className="travel-modal-backdrop"
          ariaLabelledBy="car-detail-title"
          onClose={() => setSelectedCar(null)}
          onClick={(e) => e.target === e.currentTarget && setSelectedCar(null)}
        >
          <div className="travel-modal-card" onClick={(e) => e.stopPropagation()}>
            <button type="button" className="modal-close-icon-btn"
              onClick={() => setSelectedCar(null)} aria-label="Đóng chi tiết xe">
              <X size={18} />
            </button>

            <div className="modal-hero-banner">
              <img src={selectedCar.image} alt={selectedCar.name} />
              <div className="modal-hero-overlay">
                <span className="modal-city-tag"><MapPin size={11} /> {selectedCar.city?.name}</span>
                <h3 id="car-detail-title">{selectedCar.name}</h3>
                <div className="hero-meta-row">
                  <span><Users size={13} /> {selectedCar.seats} ghế</span>
                  <span><Gauge size={13} /> {selectedCar.transmission === 'Automatic' ? 'Tự động' : 'Số sàn'}</span>
                  <span><Fuel size={13} /> {selectedCar.fuel_type}</span>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              {/* Features */}
              <div className="modal-content-section">
                <h4><Sparkles size={14} className="section-icon-teal" /> Đặc Điểm &amp; Tiện Nghi</h4>
                <p className="modal-text-lead">{selectedCar.description}</p>
                <div className="car-feature-bullets">
                  {[
                    'Camera 360° & cảm biến lùi toàn cảnh',
                    'Apple CarPlay / Android Auto không dây',
                    'Bảo hiểm vật chất xe 2 chiều trọn gói',
                    'Giao xe sạch sẽ, full nhiên liệu / sạc đầy',
                  ].map((f) => (
                    <div key={f} className="feature-item">
                      <Check size={13} color="#16A34A" strokeWidth={2.5} />
                      <span>{f}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Rental Config */}
              <div className="booking-config-panel">
                <h4><Tag size={14} /> Thời Gian &amp; Địa Điểm Thuê Xe</h4>

                <div className="config-row-grid">
                  <div className="config-field">
                    <label htmlFor="car-pickup-date">Nhận xe</label>
                    <input id="car-pickup-date" type="datetime-local" className="form-control-styled"
                      value={pickupDate} onChange={(e) => setPickupDate(e.target.value)} />
                  </div>
                  <div className="config-field">
                    <label htmlFor="car-return-date">Trả xe</label>
                    <input id="car-return-date" type="datetime-local" className="form-control-styled"
                      value={returnDate} onChange={(e) => setReturnDate(e.target.value)} />
                  </div>
                </div>

                <div className="rental-duration-banner">
                  <Calendar size={15} />
                  <span>Thời gian thuê: <strong>{rentalDays} ngày</strong> (tính theo 24h/ngày)</span>
                </div>

                <div className="config-field" style={{ marginTop: 14 }}>
                  <label htmlFor="car-pickup-loc">Địa điểm giao nhận xe</label>
                  <input id="car-pickup-loc" type="text" className="form-control-styled"
                    placeholder="VD: Sân bay Phú Quốc / Sảnh khách sạn Bai Dai"
                    value={pickupLocation}
                    onChange={(e) => setPickupLocation(e.target.value)} />
                </div>

                {/* Driver Option */}
                <button
                  type="button"
                  className={`driver-option-card ${driverRequired ? 'active' : ''}`}
                  onClick={() => setDriverRequired(!driverRequired)}
                  aria-pressed={driverRequired}
                >
                  <div className="driver-option-left">
                    <div className="checkbox-custom">
                      {driverRequired && <Check size={13} color="#fff" strokeWidth={3} />}
                    </div>
                    <div>
                      <div className="driver-title"><UserCheck size={15} /> Yêu cầu tài xế bản địa</div>
                      <p className="driver-desc">Am hiểu đường xá · Lịch sự · Phục vụ 10 tiếng/ngày</p>
                    </div>
                  </div>
                  <div className="driver-price">
                    +{(driverFeePerDay * rentalDays).toLocaleString('vi-VN')}đ
                    <small>{driverFeePerDay.toLocaleString('vi-VN')}đ/ngày</small>
                  </div>
                </button>

                {/* Price Breakdown */}
                <div className="price-breakdown-box">
                  <div className="breakdown-row">
                    <span>Thuê xe ({rentalDays} ngày × {Number(selectedCar.price_per_day).toLocaleString('vi-VN')}đ)</span>
                    <span>{basePrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                  {driverRequired && (
                    <div className="breakdown-row">
                      <span>Phí tài xế ({rentalDays} ngày)</span>
                      <span>+{driverFee.toLocaleString('vi-VN')} đ</span>
                    </div>
                  )}
                  <div className="breakdown-row total">
                    <span>Tổng tạm tính</span>
                    <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="travel-modal-footer">
              <div className="modal-total-box">
                <span className="total-label">Tổng thanh toán ({rentalDays} ngày)</span>
                <span className="total-value">{totalPrice.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="modal-actions-group">
                <button type="button" className="btn-add-trip" onClick={() => handleAddCarToTrip(false)}>
                  <Plus size={15} /> Thêm vào chuyến
                </button>
                <button type="button" className="btn-book-now car-accent" onClick={() => handleAddCarToTrip(true)}>
                  <ShoppingBag size={15} /> Thuê ngay
                </button>
              </div>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
