import React, { useState, useEffect } from 'react';
import {
  Compass, MapPin, Calendar, Users, Clock, ShieldCheck, ChevronRight,
  Search, Star, Check, Plus, ShoppingBag, X, Sparkles
} from 'lucide-react';
import api from '../api';

const CITIES = [
  { id: 'all', name: 'Tất cả', icon: '✨' },
  { id: '1', name: 'Phú Quốc', icon: '📍' },
  { id: '2', name: 'Nha Trang', icon: '📍' },
  { id: '3', name: 'Đà Nẵng', icon: '📍' },
  { id: '4', name: 'Hà Nội', icon: '📍' },
  { id: '5', name: 'TP.HCM', icon: '📍' },
];

export default function TourSection({ onAddToCart, onDirectCheckout }) {
  const [tours, setTours] = useState([]);
  const [loading, setLoading] = useState(false);
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

  const fetchTours = async () => {
    setLoading(true);
    try {
      const params = {};
      if (selectedCity !== 'all') params.city_id = selectedCity;
      if (searchQuery.trim()) params.search = searchQuery.trim();
      const res = await api.get('/tours', { params });
      setTours(res.data?.data || []);
    } catch (err) {
      console.warn('Could not load tours:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTours();
  }, [selectedCity]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    fetchTours();
  };

  const handleOpenDetail = async (tour) => {
    setSelectedTour(tour);
    setDetailLoading(true);
    setNumPeople(2);
    setPickupLoc('');
    try {
      const res = await api.get(`/tours/${tour.id}`);
      const data = res.data?.data || tour;
      setTourDetail(data);
      if (data.schedules?.length > 0) {
        setSelectedScheduleId(data.schedules[0].id);
        const schedDate = new Date(data.schedules[0].start_datetime).toISOString().slice(0, 10);
        setTourDate(schedDate);
      }
    } catch (err) {
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

  return (
    <div className="tour-section-container">
      {/* Search Header Banner */}
      <div className="travel-hero-banner tour-theme">
        <div className="travel-hero-content">
          <span className="hero-pill-badge">
            <Compass size={14} /> Khám Phá Trải Nghiệm Đẳng Cấp
          </span>
          <h2>Tour Du Lịch & Trải Nghiệm Bản Địa</h2>
          <p>Lặn biển san hô, khám phá đảo ngọc, cáp treo kỷ lục và di sản văn hóa</p>
        </div>

        {/* Search bar */}
        <form onSubmit={handleSearchSubmit} className="travel-search-bar">
          <div className="search-input-wrap">
            <Search size={18} className="search-icon" />
            <input
              type="text"
              placeholder="Tìm kiếm tour, điểm đến (vd: 4 đảo, Bà Nà Hills, Safari...)"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <button type="submit" className="travel-search-btn">Tìm Kiếm</button>
        </form>

        {/* Destination City Filter Pills */}
        <div className="destination-pills-row">
          {CITIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`dest-pill ${selectedCity === c.id ? 'active' : ''}`}
              onClick={() => setSelectedCity(c.id)}
            >
              <span aria-hidden="true">{c.icon}</span>
              <span>{c.name}</span>
            </button>
          ))}
        </div>
      </div>

      {actionNotice && (
        <div className="floating-toast-alert">
          <Check size={16} /> {actionNotice}
        </div>
      )}

      {/* Tour Grid */}
      <div className="section-content-wrap">
        <div className="section-title-bar">
          <div>
            <h3>Tour Du Lịch Nổi Bật</h3>
            <p>Trọn gói vé tham quan, HDV chuyên nghiệp & xe đưa đón chất lượng cao</p>
          </div>
          <span className="count-badge">{tours.length} Tour</span>
        </div>

        {loading ? (
          <div className="travel-loading-box">
            <div className="spinner"></div>
            <p>Đang tìm tour du lịch phù hợp...</p>
          </div>
        ) : tours.length === 0 ? (
          <div className="travel-empty-box">
            <Compass size={40} />
            <p>Chưa tìm thấy tour tại điểm đến này.</p>
          </div>
        ) : (
          <div className="travel-card-grid">
            {tours.map((tour) => (
              <div key={tour.id} className="travel-card" onClick={() => handleOpenDetail(tour)}>
                <div className="travel-card-media">
                  <img src={tour.thumbnail} alt={tour.name} loading="lazy" />
                  <span className="dest-tag">
                    <MapPin size={12} /> {tour.city?.name || 'Việt Nam'}
                  </span>
                  <div className="rating-badge">
                    <Star size={12} fill="#FFD700" color="#FFD700" /> 4.9 (120+ đánh giá)
                  </div>
                </div>

                <div className="travel-card-body">
                  <div className="travel-card-meta">
                    <span className="meta-item"><Clock size={12} /> {tour.duration}</span>
                    <span className="meta-item"><Users size={12} /> Tối đa {tour.max_participants} khách</span>
                  </div>

                  <h4 className="travel-card-title">{tour.name}</h4>
                  <p className="travel-card-desc">{tour.description}</p>

                  <div className="travel-card-perk">
                    <ShieldCheck size={14} className="perk-icon" />
                    <span>{tour.cancellation_policy || 'Miễn phí hủy theo chính sách'}</span>
                  </div>

                  <div className="travel-card-footer">
                    <div className="price-box">
                      <span className="price-label">Giá trọn gói từ</span>
                      <div className="price-val">
                        <strong>{Number(tour.price).toLocaleString('vi-VN')}</strong>
                        <span className="unit">đ / người</span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="card-action-btn primary"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleOpenDetail(tour);
                      }}
                    >
                      Chi Tiết & Đặt
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Tour Detail Modal */}
      {selectedTour && (
        <div className="travel-modal-backdrop" onClick={() => setSelectedTour(null)}>
          <div className="travel-modal-card" onClick={(e) => e.stopPropagation()}>
            <button
              type="button"
              className="modal-close-icon-btn"
              onClick={() => setSelectedTour(null)}
            >
              <X size={20} />
            </button>

            <div className="modal-hero-banner">
              <img src={selectedTour.thumbnail} alt={selectedTour.name} />
              <div className="modal-hero-overlay">
                <span className="modal-city-tag">
                  <MapPin size={12} /> {selectedTour.city?.name}
                </span>
                <h3>{selectedTour.name}</h3>
                <div className="hero-meta-row">
                  <span><Clock size={14} /> {selectedTour.duration}</span>
                  <span><Users size={14} /> Tối đa {selectedTour.max_participants} người</span>
                  <span><Star size={14} fill="#FFD700" color="#FFD700" /> 4.9 Tuyệt vời</span>
                </div>
              </div>
            </div>

            <div className="modal-body-scroll">
              {/* Tour Overview */}
              <div className="modal-content-section">
                <h4>Giới Thiệu Trải Nghiệm</h4>
                <p className="modal-text-lead">{selectedTour.description}</p>
              </div>

              {/* Itinerary */}
              {tourDetail?.itineraries?.length > 0 && (
                <div className="modal-content-section">
                  <h4>
                    <Sparkles size={16} className="section-icon" /> Lịch Trình Chi Tiết
                  </h4>
                  <div className="timeline-flow">
                    {tourDetail.itineraries.map((it, idx) => (
                      <div key={it.id || idx} className="timeline-item">
                        <div className="timeline-badge">{it.sequence || idx + 1}</div>
                        <div className="timeline-content">
                          <div className="timeline-header">
                            <span className="time-badge">{it.start_time} - {it.end_time}</span>
                            <h5>{it.title}</h5>
                          </div>
                          <p>{it.description}</p>
                          {it.location && (
                            <span className="timeline-loc"><MapPin size={12} /> {it.location}</span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Schedules selector */}
              {tourDetail?.schedules?.length > 0 && (
                <div className="modal-content-section">
                  <h4>Lịch Khởi Hành Sẵn Có</h4>
                  <div className="schedule-pills-list">
                    {tourDetail.schedules.map((sc) => {
                      const dateObj = new Date(sc.start_datetime);
                      const dateStr = dateObj.toLocaleDateString('vi-VN', {
                        weekday: 'short',
                        day: '2-digit',
                        month: '2-digit',
                      });
                      const timeStr = dateObj.toLocaleTimeString('vi-VN', {
                        hour: '2-digit',
                        minute: '2-digit',
                      });
                      const isSel = selectedScheduleId === sc.id;
                      const remaining = sc.available_slots - sc.booked_slots;

                      return (
                        <div
                          key={sc.id}
                          className={`schedule-card-pill ${isSel ? 'selected' : ''}`}
                          onClick={() => {
                            setSelectedScheduleId(sc.id);
                            setTourDate(dateObj.toISOString().slice(0, 10));
                          }}
                        >
                          <div className="sched-date"><strong>{dateStr}</strong> lúc {timeStr}</div>
                          <div className="sched-slots">Còn {remaining} chỗ trống</div>
                          {sc.meeting_point && (
                            <div className="sched-point">Đón: {sc.meeting_point}</div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Booking configuration */}
              <div className="booking-config-panel">
                <h4>Cấu Hình Đặt Tour</h4>

                <div className="config-row-grid">
                  <div className="config-field">
                    <label>Ngày Tham Gia</label>
                    <input
                      type="date"
                      className="form-control-styled"
                      value={tourDate}
                      onChange={(e) => setTourDate(e.target.value)}
                    />
                  </div>

                  <div className="config-field">
                    <label>Số Lượng Khách</label>
                    <div className="counter-btn-group">
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => setNumPeople(Math.max(1, numPeople - 1))}
                      >
                        -
                      </button>
                      <span className="counter-val">{numPeople} người</span>
                      <button
                        type="button"
                        className="counter-btn"
                        onClick={() => setNumPeople(numPeople + 1)}
                      >
                        +
                      </button>
                    </div>
                  </div>
                </div>

                <div className="config-field" style={{ marginTop: '12px' }}>
                  <label>Điểm đón yêu cầu (Khách sạn hoặc địa chỉ tại điểm đến)</label>
                  <input
                    type="text"
                    className="form-control-styled"
                    placeholder="VD: Khách sạn LuxStay Bai Dai Resort, P.101"
                    value={pickupLoc}
                    onChange={(e) => setPickupLoc(e.target.value)}
                  />
                </div>

                <div className="policy-notice-box">
                  <ShieldCheck size={16} />
                  <span>{selectedTour.cancellation_policy || 'Chính sách hoàn hủy minh bạch, linh hoạt theo tiêu chuẩn LuxHome.'}</span>
                </div>
              </div>
            </div>

            {/* Modal Footer with pricing & actions */}
            <div className="travel-modal-footer">
              <div className="modal-total-box">
                <span className="total-label">Tổng thanh toán ({numPeople} người)</span>
                <span className="total-value">
                  {(Number(selectedTour.price) * numPeople).toLocaleString('vi-VN')} đ
                </span>
              </div>

              <div className="modal-actions-group">
                <button
                  type="button"
                  className="btn-add-trip"
                  onClick={() => handleAddTourToTrip(false)}
                >
                  <Plus size={16} /> Thêm Vào Chuyến Đi
                </button>
                <button
                  type="button"
                  className="btn-book-now"
                  onClick={() => handleAddTourToTrip(true)}
                >
                  <ShoppingBag size={16} /> Đặt Tour Ngay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
