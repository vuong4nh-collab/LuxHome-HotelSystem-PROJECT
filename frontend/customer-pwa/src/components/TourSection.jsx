import React, { useState, useEffect } from 'react';
import {
  Compass, MapPin, Calendar, Users, Clock, ShieldCheck, ChevronRight,
  Search, Star, Check, Plus, ShoppingBag, X, Sparkles, AlertCircle, RefreshCw,
  Tag, Flame, Heart
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

const DURATION_TYPES = [
  { id: 'all', label: 'Tất cả' },
  { id: 'half', label: 'Nửa ngày' },
  { id: 'full', label: 'Cả ngày' },
  { id: 'multi', label: '2+ ngày' },
];

export default function TourSection({ onAddToCart, onDirectCheckout }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [selectedCity, setSelectedCity] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTour, setSelectedTour] = useState(null);
  const [tourDetail, setTourDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Booking config for modal
  const [selectedScheduleId, setSelectedScheduleId] = useState('');
  const [tourDate, setTourDate] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 1);
    return d.toISOString().slice(0, 10);
  });
  const [numPeople, setNumPeople] = useState(2);
  const [pickupLoc, setPickupLoc] = useState('');
  const [actionNotice, setActionNotice] = useState('');
  const [wishlist, setWishlist] = useState(new Set());

  const fetchTours = async () => {
    setLoading(true);
    setLoadError('');
    try {
      const params = {};
      if (selectedCity !== 'all') params.city_id = selectedCity;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get('/tours', { params });
      if (!Array.isArray(res.data?.data)) throw new Error('Dữ liệu tour trả về không hợp lệ.');
      setTours(res.data.data);
    } catch (err) {
      console.warn('Could not load tours:', err);
      setTours([]);
      setLoadError(err.response?.data?.message || 'Không thể tải danh sách tour. Vui lòng kiểm tra kết nối và thử lại.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchTours(); }, [selectedCity]);

  const handleSearchSubmit = (e) => { e.preventDefault(); fetchTours(); };

  const handleOpenDetail = async (tour) => {
    setSelectedTour(tour);
    setDetailLoading(true);
    setTourDetail(null);
    setNumPeople(2);
    setPickupLoc('');
    try {
      const res = await api.get(`/tours/${tour.id}`);
      const data = res.data?.data || tour;
      setTourDetail(data);
      if (data.schedules?.length > 0) {
        setSelectedScheduleId(data.schedules[0].id);
        setTourDate(new Date(data.schedules[0].start_datetime).toISOString().slice(0, 10));
      }
    } catch {
      setTourDetail(tour);
    } finally {
      setDetailLoading(false);
    }
  };

  const handleAddTourToTrip = (isDirect = false) => {
    if (!selectedTour) return;
    const item = {
      type: 'tour',
      id: `tour_${selectedTour.id}_${Date.now()}`,
      tourId: selectedTour.id,
      scheduleId: selectedScheduleId || null,
      tourDate,
      name: selectedTour.name,
      cityName: selectedTour.city?.name || 'Việt Nam',
      thumbnail: selectedTour.thumbnail,
      people: numPeople,
      unitPrice: Number(selectedTour.price),
      totalPrice: Number(selectedTour.price) * numPeople,
      pickupLocation: pickupLoc || 'Đón tại khách sạn / điểm hẹn',
    };
    if (isDirect) {
      setSelectedTour(null);
      if (onDirectCheckout) onDirectCheckout(item);
    } else {
      if (onAddToCart) onAddToCart(item);
      setActionNotice('Đã thêm tour vào chuyến đi!');
      setTimeout(() => setActionNotice(''), 2500);
      setSelectedTour(null);
    }
  };

  const toggleWishlist = (e, tourId) => {
    e.stopPropagation();
    setWishlist(prev => {
      const next = new Set(prev);
      next.has(tourId) ? next.delete(tourId) : next.add(tourId);
      return next;
    });
  };

  const totalPrice = Number(selectedTour?.price || 0) * numPeople;

  return (
    <div className="tour-section-container">
      {/* Hero Banner */}
      <div className="travel-hero-banner tour-theme">
        <div className="travel-hero-content">
          <span className="hero-pill-badge">
            <Sparkles size={13} /> Trải Nghiệm Đẳng Cấp
          </span>
          <h2>Tour Du Lịch &amp; Trải Nghiệm Bản Địa</h2>
          <p>Lặn biển san hô, khám phá đảo ngọc, cáp treo kỷ lục và di sản văn hóa</p>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearchSubmit} className="travel-search-bar">
          <div className="search-input-wrap">
            <Search size={17} className="search-icon" aria-hidden="true" />
            <input
              type="text"
              placeholder="Tìm tour: 4 đảo, Bà Nà Hills, Vinpearl Safari..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              aria-label="Tìm kiếm tour"
            />
          </div>
          <button type="submit" className="travel-search-btn">Tìm</button>
        </form>

        {/* City Filter Pills */}
        <div className="destination-pills-row" role="group" aria-label="Lọc theo điểm đến">
          {CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`dest-pill ${selectedCity === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCity(c.id)}
              aria-pressed={selectedCity === c.id}
            >
              <span aria-hidden="true">{c.emoji}</span>
              <span>{c.name}</span>
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

      {/* Tour Grid */}
      <div className="section-content-wrap">
        <div className="section-title-bar">
          <div>
            <h3 className="section-title">Tour Du Lịch Nổi Bật</h3>
            <p className="section-subtitle">Trọn gói vé · HDV chuyên nghiệp · Xe đưa đón</p>
          </div>
          {tours.length > 0 && (
            <span className="count-badge">{tours.length} Tour</span>
          )}
        </div>

        {loading ? (
          <div className="travel-loading-box">
            <div className="spinner" />
            <p>Đang tìm tour phù hợp...</p>
          </div>
        ) : loadError ? (
          <div className="data-load-error" role="alert">
            <AlertCircle size={20} aria-hidden="true" />
            <p>{loadError}</p>
            <button type="button" onClick={fetchTours}>
              <RefreshCw size={14} aria-hidden="true" /> Thử lại
            </button>
          </div>
        ) : tours.length === 0 ? (
          <div className="travel-empty-box">
            <Compass size={36} strokeWidth={1.5} />
            <p>Chưa tìm thấy tour tại điểm đến này.</p>
            <button type="button" className="btn-retry-soft" onClick={() => { setSelectedCity('all'); setSearchQuery(''); }}>
              Xem tất cả tour
            </button>
          </div>
        ) : (
          <div className="travel-card-grid">
            {tours.map((tour) => (
              <article key={tour.id} className="travel-card tour-card">
                <div className="travel-card-media">
                  <img src={tour.thumbnail} alt={tour.name} loading="lazy" />
                  <span className="dest-tag">
                    <MapPin size={11} /> {tour.city?.name || 'Việt Nam'}
                  </span>
                  <div className="rating-badge">
                    <Star size={11} fill="#FFD700" color="#FFD700" /> 4.9
                  </div>
                  <button
                    type="button"
                    className={`wishlist-btn ${wishlist.has(tour.id) ? 'active' : ''}`}
                    onClick={(e) => toggleWishlist(e, tour.id)}
                    aria-label={wishlist.has(tour.id) ? 'Bỏ yêu thích' : 'Yêu thích'}
                  >
                    <Heart size={14} fill={wishlist.has(tour.id) ? '#BE185D' : 'none'} color={wishlist.has(tour.id) ? '#BE185D' : '#fff'} />
                  </button>
                </div>

                <div className="travel-card-body">
                  <div className="travel-card-meta">
                    <span className="meta-item"><Clock size={11} /> {tour.duration}</span>
                    <span className="meta-item"><Users size={11} /> Tối đa {tour.max_participants}</span>
                  </div>

                  <h4 className="travel-card-title">{tour.name}</h4>
                  <p className="travel-card-desc">{tour.description}</p>

                  <div className="travel-card-perk">
                    <ShieldCheck size={13} className="perk-icon" />
                    <span>{tour.cancellation_policy || 'Miễn phí hủy linh hoạt'}</span>
                  </div>

                  <div className="travel-card-footer">
                    <div className="price-box">
                      <span className="price-label">Giá trọn gói từ</span>
                      <div className="price-val">
                        <strong>{Number(tour.price).toLocaleString('vi-VN')}</strong>
                        <span className="unit">đ/người</span>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="card-action-btn primary"
                      onClick={() => handleOpenDetail(tour)}
                    >
                      Chi tiết &amp; Đặt
                    </button>
                  </div>
                </div>
              </article>
            ))}
          </div>
        )}
      </div>

      {/* Tour Detail Modal */}
      {selectedTour && (
        <AccessibleDialog
          className="travel-modal-backdrop"
          ariaLabelledBy="tour-detail-title"
          onClose={() => setSelectedTour(null)}
          onClick={(e) => e.target === e.currentTarget && setSelectedTour(null)}
        >
          <div className="travel-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setSelectedTour(null)}
              aria-label="Đóng chi tiết tour"
            >
              <X size={18} />
            </button>

            {/* Hero */}
            <div className="modal-hero-banner">
              <img src={selectedTour.thumbnail} alt={selectedTour.name} />
              <div className="modal-hero-overlay">
                <span className="modal-city-tag">
                  <MapPin size={11} /> {selectedTour.city?.name}
                </span>
                <h3 id="tour-detail-title">{selectedTour.name}</h3>
                <div className="hero-meta-row">
                  <span><Clock size={13} /> {selectedTour.duration}</span>
                  <span><Users size={13} /> Tối đa {selectedTour.max_participants} người</span>
                  <span><Star size={13} fill="#FFD700" color="#FFD700" /> 4.9</span>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              {/* Loading detail */}
              {detailLoading && (
                <div className="detail-loading-row">
                  <div className="spinner-sm" />
                  <span>Đang tải chi tiết lịch trình...</span>
                </div>
              )}

              {/* Description */}
              <div className="modal-content-section">
                <h4><Compass size={15} className="section-icon-teal" /> Giới Thiệu Trải Nghiệm</h4>
                <p className="modal-text-lead">{selectedTour.description}</p>
              </div>

              {/* Itinerary */}
              {tourDetail?.itineraries?.length > 0 && (
                <div className="modal-content-section">
                  <h4><Sparkles size={15} className="section-icon-pink" /> Lịch Trình Chi Tiết</h4>
                  <div className="timeline-flow">
                    {tourDetail.itineraries.map((it, idx) => (
                      <div key={it.id || idx} className="timeline-item">
                        <div className="timeline-badge">{it.sequence || idx + 1}</div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            {(it.start_time || it.end_time) && (
                              <span className="time-badge">{it.start_time}{it.end_time ? ` – ${it.end_time}` : ''}</span>
                            )}
                            <h5>{it.title}</h5>
                          </div>
                          {it.description && <p>{it.description}</p>}
                          {it.location && (
                            <span className="timeline-loc"><MapPin size={11} /> {it.location}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedule Selector */}
              {tourDetail?.schedules?.length > 0 && (
                <div className="modal-content-section">
                  <h4><Calendar size={15} className="section-icon-purple" /> Lịch Khởi Hành</h4>
                  <div className="schedule-pills-list">
                    {tourDetail.schedules.map((sc) => {
                      const dateObj = new Date(sc.start_datetime);
                      const dateStr = dateObj.toLocaleDateString('vi-VN', { weekday: 'short', day: '2-digit', month: '2-digit' });
                      const timeStr = dateObj.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
                      const isSel = selectedScheduleId === sc.id;
                      const remaining = sc.available_slots - sc.booked_slots;
                      const isFull = remaining <= 0;
                      return (
                        <button
                          key={sc.id}
                          type="button"
                          className={`schedule-card-pill ${isSel ? 'selected' : ''} ${isFull ? 'full' : ''}`}
                          aria-pressed={isSel}
                          disabled={isFull}
                          onClick={() => {
                            setSelectedScheduleId(sc.id);
                            setTourDate(dateObj.toISOString().slice(0, 10));
                          }}
                        >
                          <div className="sched-pill-left">
                            <div className="sched-date-block">
                              <span className="sched-day">{dateStr}</span>
                              <span className="sched-time">🕐 {timeStr}</span>
                            </div>
                            {sc.meeting_point && (
                              <span className="sched-point"><MapPin size={11} /> {sc.meeting_point}</span>
                            )}
                          </div>
                          <div className={`sched-slots-badge ${isFull ? 'full' : remaining <= 5 ? 'low' : 'ok'}`}>
                            {isFull ? '🔴 Hết chỗ' : remaining <= 5 ? `⚠️ Còn ${remaining}` : `✓ ${remaining} chỗ`}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Booking Config */}
              <div className="booking-config-panel">
                <h4><Tag size={14} /> Cấu Hình Đặt Tour</h4>
                <div className="config-row-grid">
                  <div className="config-field">
                    <label htmlFor="tour-date">Ngày Tham Gia</label>
                    <input
                      id="tour-date"
                      type="date"
                      className="form-control-styled"
                      value={tourDate}
                      onChange={(e) => setTourDate(e.target.value)}
                    />
                  </div>
                  <div className="config-field">
                    <label>Số Lượng Khách</label>
                    <div className="counter-btn-group">
                      <button type="button" className="counter-btn" onClick={() => setNumPeople(Math.max(1, numPeople - 1))} aria-label="Giảm">−</button>
                      <span className="counter-val">{numPeople}</span>
                      <button type="button" className="counter-btn" onClick={() => setNumPeople(numPeople + 1)} aria-label="Tăng">+</button>
                    </div>
                  </div>
                </div>

                <div className="config-field" style={{ marginTop: 12 }}>
                  <label htmlFor="tour-pickup">Điểm đón yêu cầu</label>
                  <input
                    id="tour-pickup"
                    type="text"
                    className="form-control-styled"
                    placeholder="VD: Khách sạn LuxHome Bai Dai Resort, P.101"
                    value={pickupLoc}
                    onChange={(e) => setPickupLoc(e.target.value)}
                  />
                </div>

                {/* Price Breakdown */}
                <div className="price-breakdown-box" style={{ marginTop: 14 }}>
                  <div className="breakdown-row">
                    <span>{Number(selectedTour.price).toLocaleString('vi-VN')} đ × {numPeople} người</span>
                    <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                  <div className="breakdown-row total">
                    <span>Tổng tạm tính</span>
                    <span>{totalPrice.toLocaleString('vi-VN')} đ</span>
                  </div>
                </div>

                <div className="policy-notice-box">
                  <ShieldCheck size={14} />
                  <span>{selectedTour.cancellation_policy || 'Chính sách hoàn hủy minh bạch theo tiêu chuẩn LuxHome.'}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="travel-modal-footer">
              <div className="modal-total-box">
                <span className="total-label">Tổng thanh toán ({numPeople} người)</span>
                <span className="total-value">{totalPrice.toLocaleString('vi-VN')} đ</span>
              </div>
              <div className="modal-actions-group">
                <button type="button" className="btn-add-trip" onClick={() => handleAddTourToTrip(false)}>
                  <Plus size={15} /> Thêm vào chuyến
                </button>
                <button type="button" className="btn-book-now tour-accent" onClick={() => handleAddTourToTrip(true)}>
                  <ShoppingBag size={15} /> Đặt ngay
                </button>
              </div>
            </div>
          </div>
        </AccessibleDialog>
      )}
    </div>
  );
}
