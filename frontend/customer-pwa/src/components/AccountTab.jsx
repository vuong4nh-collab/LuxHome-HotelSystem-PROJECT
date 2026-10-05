import React, { useState, useEffect } from 'react';
import {
  UserRound, Ticket, Award, Settings, ChevronRight, LogIn, LogOut,
  ShieldCheck, Phone, Mail, MapPin, Calendar, CreditCard, Sparkles,
  Gift, Bell, Globe, Moon, Check, Copy, ArrowRight, RefreshCw, AlertCircle
} from 'lucide-react';
import api from '../api';

const ACCOUNT_SUBTABS = [
  { id: 'profile', label: 'Hồ sơ', icon: UserRound },
  { id: 'vouchers', label: 'Voucher', icon: Ticket },
  { id: 'points', label: 'Điểm thưởng', icon: Award },
  { id: 'settings', label: 'Cài đặt', icon: Settings },
];

export default function AccountTab({
  user,
  onLogout,
  onLoginRequest,
  onGoToBooking
}) {
  const [activeSubTab, setActiveSubTab] = useState('profile');
  const [profile, setProfile] = useState({
    full_name: user?.full_name || '',
    email: user?.email || '',
    phone: user?.phone || '',
    address: 'Hà Nội, Việt Nam',
    id_type: 'CCCD',
    id_number: '001201088999',
    date_of_birth: '1995-08-15',
    gender: 'Male',
    loyalty_points: 250,
  });
  const [loadingProfile, setLoadingProfile] = useState(false);
  const [savingProfile, setSavingProfile] = useState(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState('');

  // Voucher state
  const [voucherInput, setVoucherInput] = useState('');
  const [copiedCode, setCopiedCode] = useState('');
  const [voucherList, setVoucherList] = useState([
    {
      code: 'LUXWELCOME',
      title: 'Giảm 10% đơn đặt đầu tiên',
      desc: 'Áp dụng cho mọi loại phòng tại các chi nhánh LuxStay',
      expiry: '31/12/2026',
      badge: 'Ưu đãi mới',
      discount: '10%'
    },
    {
      code: 'SUMMER2026',
      title: 'Giảm ngay 200.000 đ',
      desc: 'Áp dụng cho đơn đặt phòng từ 2.000.000 đ trở lên',
      expiry: '30/11/2026',
      badge: 'Mùa hè',
      discount: '200K'
    },
    {
      code: 'DIAMONDVIP',
      title: 'Giảm 15% VIP Exclusive',
      desc: 'Đặc quyền dành riêng cho khách hàng thân thiết LuxStay',
      expiry: '31/12/2026',
      badge: 'VIP Club',
      discount: '15%'
    },
  ]);

  // Settings state
  const [pushNotif, setPushNotif] = useState(true);
  const [emailNotif, setEmailNotif] = useState(true);
  const [language, setLanguage] = useState('vi');

  // Load customer profile from API
  useEffect(() => {
    if (!user) return;
    const fetchProfile = async () => {
      setLoadingProfile(true);
      try {
        const { data } = await api.get('/customers/me');
        if (data?.data) {
          setProfile(prev => ({
            ...prev,
            ...data.data,
            full_name: data.data.full_name || user.full_name || '',
            email: data.data.email || user.email || '',
            phone: data.data.phone || user.phone || '',
            loyalty_points: data.data.loyalty_points ?? 250,
          }));
        }
      } catch (err) {
        console.warn('Could not fetch customer profile:', err);
      } finally {
        setLoadingProfile(false);
      }
    };
    fetchProfile();
  }, [user]);

  // Handle Save Profile
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    setSaveSuccessMsg('');
    try {
      if (user) {
        await api.put('/customers/me', {
          full_name: profile.full_name,
          phone: profile.phone,
          address: profile.address,
          id_type: profile.id_type,
          id_number: profile.id_number,
          date_of_birth: profile.date_of_birth,
          gender: profile.gender,
        });
      }
      setSaveSuccessMsg('Cập nhật hồ sơ thành công!');
      setTimeout(() => setSaveSuccessMsg(''), 3000);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể lưu hồ sơ lúc này.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Copy coupon
  const handleCopyCode = (code) => {
    navigator.clipboard?.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2500);
  };

  // Apply new voucher
  const handleAddVoucher = (e) => {
    e.preventDefault();
    const clean = voucherInput.trim().toUpperCase();
    if (!clean) return;
    if (voucherList.some(v => v.code === clean)) {
      alert('Mã ưu đãi này đã có trong danh sách của bạn!');
      return;
    }
    setVoucherList([
      {
        code: clean,
        title: `Mã ưu đãi ${clean}`,
        desc: 'Đã thêm thành công vào ví voucher của bạn',
        expiry: '31/12/2026',
        badge: 'Đã lưu',
        discount: 'VIP'
      },
      ...voucherList
    ]);
    setVoucherInput('');
    alert(`Đã thêm mã "${clean}" vào kho voucher của bạn!`);
  };

  const memberTier = (profile.loyalty_points || 0) >= 500 ? 'Hội viên Kim Cương'
    : (profile.loyalty_points || 0) >= 200 ? 'Hội viên Vàng (Gold)'
    : 'Hội viên Bạc (Silver)';

  return (
    <main className="tab-account-view">
      {/* User Hero Banner */}
      <div className="account-hero-card">
        <div className="account-avatar-wrap">
          <div className="account-avatar-img">
            {profile.full_name ? profile.full_name.charAt(0).toUpperCase() : <UserRound size={30} />}
          </div>
        </div>

        <div className="account-user-meta">
          <div className="meta-name-row">
            <h3>{profile.full_name || 'Khách LuxStay'}</h3>
            <span className="member-tier-pill"><Sparkles size={13} /> {memberTier}</span>
          </div>
          <p className="account-email-sub">{user?.email || 'Đăng nhập để nhận đầy đủ đặc quyền'}</p>
        </div>

        {/* Loyalty Quick Stats */}
        <div className="account-stats-row">
          <div className="stat-item" onClick={() => setActiveSubTab('points')}>
            <span className="stat-val">{profile.loyalty_points || 250}</span>
            <span className="stat-lbl">Điểm thưởng</span>
          </div>
          <div className="stat-divider" />
          <div className="stat-item" onClick={() => setActiveSubTab('vouchers')}>
            <span className="stat-val">{voucherList.length}</span>
            <span className="stat-lbl">Voucher khả dụng</span>
          </div>
        </div>
      </div>

      {/* Navigation Subtabs Bar */}
      <div className="account-subtabs-bar">
        {ACCOUNT_SUBTABS.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeSubTab === tab.id;
          return (
            <button
              key={tab.id}
              type="button"
              className={`account-subtab-btn ${isActive ? 'active' : ''}`}
              onClick={() => setActiveSubTab(tab.id)}
            >
              <Icon size={16} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Subtab Contents */}
      <div className="account-content-container">
        {/* ==================== 1. HỒ SƠ (PROFILE) ==================== */}
        {activeSubTab === 'profile' && (
          <div className="profile-section-card">
            <div className="section-sub-header">
              <UserRound size={18} style={{ color: 'var(--brand-primary)' }} />
              <h4>Thông Tin Cá Nhân</h4>
            </div>

            {!user ? (
              <div className="auth-required-box">
                <AlertCircle size={32} style={{ color: 'var(--brand-primary)', margin: '0 auto 8px' }} />
                <p>Vui lòng đăng nhập để xem và quản lý thông tin hồ sơ của bạn.</p>
                <button type="button" className="btn-action-primary" onClick={onLoginRequest} style={{ marginTop: '12px' }}>
                  <LogIn size={16} /> Đăng nhập ngay
                </button>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="profile-form">
                {saveSuccessMsg && (
                  <div className="save-success-alert">
                    <Check size={16} /> <span>{saveSuccessMsg}</span>
                  </div>
                )}

                <div className="form-group">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    className="pwa-input"
                    required
                    value={profile.full_name}
                    onChange={(e) => setProfile({ ...profile, full_name: e.target.value })}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Số điện thoại</label>
                    <input
                      type="tel"
                      className="pwa-input"
                      value={profile.phone}
                      onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                      placeholder="0912345678"
                    />
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Giới tính</label>
                    <select
                      className="pwa-input"
                      value={profile.gender || 'Male'}
                      onChange={(e) => setProfile({ ...profile, gender: e.target.value })}
                    >
                      <option value="Male">Nam</option>
                      <option value="Female">Nữ</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>
                </div>

                <div className="form-group">
                  <label>Email đăng ký</label>
                  <input
                    type="email"
                    className="pwa-input"
                    disabled
                    value={profile.email}
                    style={{ background: '#f8fafc', color: 'var(--text-muted)' }}
                  />
                </div>

                <div className="form-row">
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Loại giấy tờ</label>
                    <select
                      className="pwa-input"
                      value={profile.id_type || 'CCCD'}
                      onChange={(e) => setProfile({ ...profile, id_type: e.target.value })}
                    >
                      <option value="CCCD">CCCD gắn chip</option>
                      <option value="Passport">Hộ chiếu</option>
                      <option value="Other">Khác</option>
                    </select>
                  </div>
                  <div className="form-group" style={{ flex: 1 }}>
                    <label>Số CCCD / Hộ chiếu</label>
                    <input
                      type="text"
                      className="pwa-input"
                      value={profile.id_number || ''}
                      onChange={(e) => setProfile({ ...profile, id_number: e.target.value })}
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label>Ngày sinh</label>
                  <input
                    type="date"
                    className="pwa-input"
                    value={profile.date_of_birth || ''}
                    onChange={(e) => setProfile({ ...profile, date_of_birth: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label>Địa chỉ liên hệ</label>
                  <input
                    type="text"
                    className="pwa-input"
                    value={profile.address || ''}
                    onChange={(e) => setProfile({ ...profile, address: e.target.value })}
                    placeholder="Số nhà, đường, quận/huyện, thành phố"
                  />
                </div>

                <button
                  type="submit"
                  className="btn-primary-block"
                  disabled={savingProfile}
                  style={{ marginTop: '14px' }}
                >
                  {savingProfile ? 'Đang lưu thay đổi...' : 'Lưu Thay Đổi'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* ==================== 2. VOUCHER ==================== */}
        {activeSubTab === 'vouchers' && (
          <div className="vouchers-section-card">
            {/* Input coupon */}
            <form onSubmit={handleAddVoucher} className="voucher-input-row">
              <input
                type="text"
                className="pwa-input"
                placeholder="Nhập mã khuyến mãi (VD: VIPHOTEL)..."
                value={voucherInput}
                onChange={(e) => setVoucherInput(e.target.value)}
              />
              <button type="submit" className="btn-voucher-apply">Áp dụng</button>
            </form>

            <div className="section-sub-header" style={{ marginTop: '18px' }}>
              <Ticket size={18} style={{ color: 'var(--brand-primary)' }} />
              <h4>Mã Giảm Giá Của Bạn ({voucherList.length})</h4>
            </div>

            <div className="voucher-card-list">
              {voucherList.map((v) => (
                <article key={v.code} className="voucher-card-item">
                  <div className="voucher-left">
                    <span className="voucher-discount-tag">{v.discount}</span>
                    <span className="voucher-badge">{v.badge}</span>
                  </div>

                  <div className="voucher-center">
                    <h5 className="voucher-title">{v.title}</h5>
                    <p className="voucher-desc">{v.desc}</p>
                    <span className="voucher-expiry">HSD: {v.expiry}</span>
                  </div>

                  <div className="voucher-right">
                    <button
                      type="button"
                      className="btn-copy-code"
                      onClick={() => handleCopyCode(v.code)}
                    >
                      {copiedCode === v.code ? <Check size={14} /> : <Copy size={14} />}
                      <span>{copiedCode === v.code ? 'Đã chép' : v.code}</span>
                    </button>
                    {onGoToBooking && (
                      <button
                        type="button"
                        className="btn-use-voucher"
                        onClick={onGoToBooking}
                      >
                        Dùng ngay
                      </button>
                    )}
                  </div>
                </article>
              ))}
            </div>
          </div>
        )}

        {/* ==================== 3. ĐIỂM THƯỞNG (LOYALTY) ==================== */}
        {activeSubTab === 'points' && (
          <div className="points-section-card">
            {/* VIP Card */}
            <div className="vip-loyalty-card">
              <div className="vip-card-top">
                <div className="vip-brand">
                  <Sparkles size={16} />
                  <span>LUXSTAY ELITE REWARDS</span>
                </div>
                <span className="vip-tier-badge">{memberTier}</span>
              </div>

              <div className="vip-points-big">
                <div className="points-number">{profile.loyalty_points || 250}</div>
                <div className="points-sub">Điểm tích lũy khả dụng</div>
              </div>

              <div className="vip-card-bottom">
                <span>Tương đương: <strong>{((profile.loyalty_points || 250) * 1000).toLocaleString('vi-VN')} đ</strong></span>
                <span>Mã TV: #LX-{user?.id || '888'}</span>
              </div>
            </div>

            {/* Next tier progress */}
            <div className="tier-progress-card">
              <div className="progress-label-row">
                <span>Tiến trình lên hạng VIP Kim Cương</span>
                <strong>{profile.loyalty_points || 250} / 500 điểm</strong>
              </div>
              <div className="progress-bar-bg">
                <div
                  className="progress-bar-fill"
                  style={{ width: `${Math.min(100, Math.round(((profile.loyalty_points || 250) / 500) * 100))}%` }}
                />
              </div>
              <small style={{ color: 'var(--text-muted)', fontSize: '11px', display: 'block', marginTop: '6px' }}>
                Tích thêm {Math.max(0, 500 - (profile.loyalty_points || 250))} điểm để nâng hạng và nhận đặc quyền miễn phí buffet &amp; trả phòng trễ.
              </small>
            </div>

            {/* Rewards Exchange */}
            <div className="section-sub-header" style={{ marginTop: '20px' }}>
              <Gift size={18} style={{ color: 'var(--brand-primary)' }} />
              <h4>Đổi Thưởng Bằng Điểm</h4>
            </div>

            <div className="rewards-exchange-list">
              <div className="reward-exchange-item">
                <div className="reward-info">
                  <strong>Voucher giảm 100.000 đ</strong>
                  <span>Áp dụng cho mọi kỳ nghỉ</span>
                </div>
                <button
                  type="button"
                  className="btn-exchange"
                  onClick={() => alert('Đã đổi 100 điểm lấy Voucher 100.000 đ thành công!')}
                >
                  Đổi 100 Điểm
                </button>
              </div>

              <div className="reward-exchange-item">
                <div className="reward-info">
                  <strong>Buffet Sáng Miễn Phí 2 Khách</strong>
                  <span>Tại nhà hàng 5 sao của khách sạn</span>
                </div>
                <button
                  type="button"
                  className="btn-exchange"
                  onClick={() => alert('Đã đổi 200 điểm nhận Buffet sáng thành công!')}
                >
                  Đổi 200 Điểm
                </button>
              </div>

              <div className="reward-exchange-item">
                <div className="reward-info">
                  <strong>Nâng Hạng Phòng Miễn Phí (Suite)</strong>
                  <span>Áp dụng khi có phòng trống lúc check-in</span>
                </div>
                <button
                  type="button"
                  className="btn-exchange"
                  onClick={() => alert('Đã đổi 400 điểm nhận đặc quyền nâng hạng phòng!')}
                >
                  Đổi 400 Điểm
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ==================== 4. CÀI ĐẶT (SETTINGS) ==================== */}
        {activeSubTab === 'settings' && (
          <div className="settings-section-card">
            <div className="section-sub-header">
              <Settings size={18} style={{ color: 'var(--brand-primary)' }} />
              <h4>Tùy Chọn Ứng Dụng</h4>
            </div>

            <div className="settings-list">
              <div className="setting-toggle-row">
                <div className="setting-label">
                  <Bell size={18} />
                  <div>
                    <strong>Thông báo đẩy (Push Notifications)</strong>
                    <span>Nhận thông báo check-in và khuyến mãi</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle-switch"
                  checked={pushNotif}
                  onChange={(e) => setPushNotif(e.target.checked)}
                />
              </div>

              <div className="setting-toggle-row">
                <div className="setting-label">
                  <Mail size={18} />
                  <div>
                    <strong>Email xác nhận đặt phòng</strong>
                    <span>Tự động gửi hóa đơn &amp; lịch trình qua email</span>
                  </div>
                </div>
                <input
                  type="checkbox"
                  className="toggle-switch"
                  checked={emailNotif}
                  onChange={(e) => setEmailNotif(e.target.checked)}
                />
              </div>

              <div className="setting-action-row">
                <div className="setting-label">
                  <Globe size={18} />
                  <div>
                    <strong>Ngôn ngữ hiển thị</strong>
                    <span>Tiếng Việt</span>
                  </div>
                </div>
                <select
                  className="pwa-select-sm"
                  value={language}
                  onChange={(e) => setLanguage(e.target.value)}
                >
                  <option value="vi">Tiếng Việt</option>
                  <option value="en">English</option>
                </select>
              </div>

              <div className="setting-action-row">
                <div className="setting-label">
                  <ShieldCheck size={18} />
                  <div>
                    <strong>Chính sách bảo mật &amp; Điều khoản</strong>
                    <span>Cam kết bảo vệ dữ liệu khách hàng</span>
                  </div>
                </div>
                <ChevronRight size={18} style={{ color: 'var(--text-muted)' }} />
              </div>
            </div>

            {/* Logout / Login Button */}
            <div style={{ marginTop: '24px' }}>
              {user ? (
                <button type="button" className="btn-logout-full" onClick={onLogout}>
                  <LogOut size={16} /> Đăng xuất khỏi thiết bị
                </button>
              ) : (
                <button type="button" className="btn-primary-block" onClick={onLoginRequest}>
                  <LogIn size={16} /> Đăng nhập tài khoản
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
