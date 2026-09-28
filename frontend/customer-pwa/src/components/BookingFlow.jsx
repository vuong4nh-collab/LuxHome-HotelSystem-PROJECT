import React, { useState, useEffect, useRef, useCallback } from "react";
import {
  UserCheck,
  UserX,
  Gift,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Mail,
  Phone,
  User,
  History,
  RotateCcw,
  X,
  Smartphone,
  QrCode,
  Clock,
  RefreshCw,
  ExternalLink,
} from "lucide-react";
import api from "../api";

/* ─────────────────────────────────────────────────────────────
   Config theo payment-flow-config.json
───────────────────────────────────────────────────────────── */
const POLL_INTERVAL_MS   = 2500;          // option1_bankQr.config.pollIntervalMs
const QR_EXPIRY_SECONDS  = 300;           // option1_bankQr.config.qrExpirySeconds
const DEEPLINK_TIMEOUT_MS = 1800;         // option2_ewallet.config.detectionTimeoutMs

const WALLET_CONFIG = {
  momo:    { label: "MoMo",    icon: "💜", color: "#A50064", bg: "#F9F0F7" },
  zalopay: { label: "ZaloPay", icon: "💙", color: "#0068FF", bg: "#F0F6FF" },
};

/* ─────────────────────────────────────────────────────────────
   Sub-component: QR Bank Payment
   Luồng: createQr → hiển thị QR + đếm ngược → polling status
───────────────────────────────────────────────────────────── */
function QrPaymentPanel({ orderId, amount, onSuccess, onFailed }) {
  const [qrState, setQrState] = useState("loading"); // loading | ready | expired | success | failed
  const [qrImageUrl, setQrImageUrl] = useState("");
  const [paymentId, setPaymentId] = useState("");
  const [countdown, setCountdown] = useState(QR_EXPIRY_SECONDS);
  const pollRef   = useRef(null);
  const timerRef  = useRef(null);

  const stopAll = useCallback(() => {
    clearInterval(pollRef.current);
    clearInterval(timerRef.current);
  }, []);

  const createQr = useCallback(async () => {
    setQrState("loading");
    try {
      const { data } = await api.post("/payments/qr", { orderId, amount });
      setQrImageUrl(data.data.qrImageUrl);
      setPaymentId(data.data.paymentId);
      setCountdown(QR_EXPIRY_SECONDS);
      setQrState("ready");
    } catch (err) {
      setQrState("failed");
    }
  }, [orderId, amount]);

  // Polling status theo spec: pollIntervalMs = 2500
  useEffect(() => {
    if (qrState !== "ready" || !paymentId) return;

    // Countdown timer
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          stopAll();
          setQrState("expired");
          return 0;
        }
        return c - 1;
      });
    }, 1000);

    // Polling payment status
    pollRef.current = setInterval(async () => {
      try {
        const { data } = await api.get(`/payments/${paymentId}/status`);
        const status = data.data.status;
        if (status === "success") {
          stopAll();
          setQrState("success");
          setTimeout(() => onSuccess(paymentId), 800);
        } else if (status === "failed" || status === "expired") {
          stopAll();
          setQrState(status);
          if (status === "failed") onFailed?.();
        }
      } catch { /* ignore poll errors */ }
    }, POLL_INTERVAL_MS);

    return () => stopAll();
  }, [qrState, paymentId, stopAll, onSuccess, onFailed]);

  useEffect(() => {
    createQr();
    return stopAll;
  }, [createQr, stopAll]);

  const fmt = (s) => `${Math.floor(s / 60).toString().padStart(2, "0")}:${(s % 60).toString().padStart(2, "0")}`;

  if (qrState === "loading") return (
    <div className="pay-panel-center">
      <div style={{ fontSize: 32 }}>⏳</div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Đang tạo mã QR...</p>
    </div>
  );

  if (qrState === "success") return (
    <div className="pay-panel-center">
      <div className="pay-success-icon">✅</div>
      <p style={{ fontWeight: 700, color: "var(--status-success)" }}>Thanh toán thành công!</p>
    </div>
  );

  if (qrState === "expired") return (
    <div className="pay-panel-center">
      <div style={{ fontSize: 36 }}>⏰</div>
      <p style={{ color: "var(--text-secondary)", fontSize: 13 }}>Mã QR đã hết hạn</p>
      <button className="pay-refresh-btn" onClick={createQr}>
        <RefreshCw size={14} /> Tạo mã mới
      </button>
    </div>
  );

  return (
    <div className="pay-qr-wrapper">
      <div className="pay-qr-bank-info">
        <span>🏦 Vietcombank</span>
        <span style={{ fontWeight: 700 }}>9876543210</span>
        <span style={{ color: "var(--text-secondary)", fontSize: 11 }}>LUXSTAY HOTEL</span>
      </div>
      <img
        src={qrImageUrl}
        alt="VietQR Payment"
        className="pay-qr-image"
        onError={(e) => { e.target.src = ""; setQrState("failed"); }}
      />
      <div className="pay-qr-amount">
        {Number(amount).toLocaleString("vi-VN")} <span>VNĐ</span>
      </div>
      <div className={`pay-qr-countdown ${countdown <= 60 ? "pay-qr-urgent" : ""}`}>
        <Clock size={13} /> Hết hạn sau {fmt(countdown)}
      </div>
      <p className="pay-qr-hint">
        Mở app ngân hàng bất kỳ → Quét QR → Xác nhận thanh toán
      </p>

      {/* DEV SANDBOX: nút xác nhận giả */}
      {import.meta.env.DEV && (
        <button
          className="pay-sandbox-btn"
          onClick={async () => {
            try {
              await api.post("/payments/sandbox-confirm", { paymentId });
            } catch { /* ok */ }
          }}
        >
          [DEV] Giả lập thanh toán thành công
        </button>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   Sub-component: Wallet Payment (MoMo / ZaloPay)
   Luồng: chọn ví → createWalletPayment → deeplink → visibilitychange
───────────────────────────────────────────────────────────── */
function WalletPaymentPanel({ orderId, amount, onSuccess, onFailed }) {
  const [walletState, setWalletState] = useState("choose"); // choose | redirecting | app_not_installed | returned | success | failed
  const [selectedWallet, setSelectedWallet] = useState(null);
  const [webFallbackUrl, setWebFallbackUrl] = useState("");
  const visListenerRef = useRef(null);
  const timeoutRef    = useRef(null);

  const cleanup = () => {
    if (visListenerRef.current) document.removeEventListener("visibilitychange", visListenerRef.current);
    clearTimeout(timeoutRef.current);
  };

  // Theo dõi quay lại app sau khi mở ví (visibilitychange)
  const setupVisibilityDetection = useCallback((pId) => {
    // Nếu sau DEEPLINK_TIMEOUT_MS mà vẫn ở foreground → app ví không cài
    timeoutRef.current = setTimeout(() => {
      cleanup();
      setWalletState("app_not_installed");
    }, DEEPLINK_TIMEOUT_MS);

    visListenerRef.current = async () => {
      if (!document.hidden) {
        // Người dùng đã quay lại app → ví đã xử lý
        cleanup();
        setWalletState("returned");
        // Poll để biết kết quả
        try {
          const { data } = await api.get(`/payments/${pId}/status`);
          const st = data.data.status;
          if (st === "success") { setWalletState("success"); setTimeout(() => onSuccess(pId), 600); }
          else setWalletState("failed");
        } catch { setWalletState("failed"); }
      }
    };
    document.addEventListener("visibilitychange", visListenerRef.current);
  }, [onSuccess]);

  const handleWalletPay = async (wallet) => {
    setSelectedWallet(wallet);
    setWalletState("redirecting");
    try {
      const { data } = await api.post("/payments/wallet", { orderId, amount, wallet });
      const { paymentId: pId, deeplink, webFallbackUrl: fbUrl } = data.data;
      setWebFallbackUrl(fbUrl);

      // Điều hướng deep link theo spec
      window.location.href = deeplink;
      setupVisibilityDetection(pId);
    } catch {
      setWalletState("failed");
    }
  };

  useEffect(() => () => cleanup(), []);

  if (walletState === "choose") return (
    <div className="pay-wallet-list">
      <p className="pay-hint-text">Chọn ví điện tử để thanh toán:</p>
      {Object.entries(WALLET_CONFIG).map(([key, cfg]) => (
        <button
          key={key}
          className="pay-wallet-option"
          style={{ "--wallet-color": cfg.color, "--wallet-bg": cfg.bg }}
          onClick={() => handleWalletPay(key)}
        >
          <span className="pay-wallet-icon">{cfg.icon}</span>
          <span className="pay-wallet-label">{cfg.label}</span>
          <ArrowRight size={16} style={{ marginLeft: "auto", color: cfg.color }} />
        </button>
      ))}
    </div>
  );

  if (walletState === "redirecting") {
    const cfg = WALLET_CONFIG[selectedWallet];
    return (
      <div className="pay-panel-center">
        <div style={{ fontSize: 40 }}>{cfg?.icon}</div>
        <p style={{ fontWeight: 700 }}>Đang mở {cfg?.label}...</p>
        <p style={{ fontSize: 12, color: "var(--text-secondary)" }}>Xác nhận thanh toán trong ứng dụng</p>
      </div>
    );
  }

  if (walletState === "app_not_installed") return (
    <div className="pay-panel-center">
      <div style={{ fontSize: 36 }}>📱</div>
      <p style={{ fontWeight: 700, fontSize: 14 }}>Chưa cài đặt {WALLET_CONFIG[selectedWallet]?.label}</p>
      <p style={{ fontSize: 12, color: "var(--text-secondary)", textAlign: "center" }}>
        Dùng liên kết web để thanh toán
      </p>
      {webFallbackUrl && (
        <a href={webFallbackUrl} target="_blank" rel="noopener noreferrer" className="pay-fallback-link">
          <ExternalLink size={14} /> Thanh toán qua Web
        </a>
      )}
      <button className="pay-refresh-btn" style={{ marginTop: 6 }} onClick={() => setWalletState("choose")}>
        Chọn ví khác
      </button>
    </div>
  );

  if (walletState === "returned") return (
    <div className="pay-panel-center">
      <div style={{ fontSize: 36 }}>🔄</div>
      <p style={{ fontSize: 13 }}>Đang kiểm tra kết quả...</p>
    </div>
  );

  if (walletState === "success") return (
    <div className="pay-panel-center">
      <div className="pay-success-icon">✅</div>
      <p style={{ fontWeight: 700, color: "var(--status-success)" }}>Thanh toán thành công!</p>
    </div>
  );

  // failed
  return (
    <div className="pay-panel-center">
      <div style={{ fontSize: 36 }}>❌</div>
      <p style={{ fontWeight: 700, color: "var(--status-error)" }}>Giao dịch thất bại</p>
      <button className="pay-refresh-btn" onClick={() => setWalletState("choose")}>Thử lại</button>
    </div>
  );
}

/* ─────────────────────────────────────────────────────────────
   BookingFlow — Component chính (3 bước)
   Bước 1: Thông tin liên hệ
   Bước 2: Khuyến mãi + chọn phương thức + thực hiện thanh toán
   Bước 3: Xác nhận thành công
───────────────────────────────────────────────────────────── */
export default function BookingFlow({
  room,
  user,
  bookingForm: initialForm,
  onClose,
  onConfirm,
  onLoginRequest,
}) {
  const [bookingMode, setBookingMode] = useState(user ? "LOGGED_IN" : "GUEST");
  const [step, setStep] = useState(1);
  const [payStep, setPayStep] = useState("choose"); // choose | qr | wallet | done

  const [contactInfo, setContactInfo] = useState(() => {
    if (user) return {
      fullName: initialForm?.fullName || user.full_name || "",
      email: initialForm?.email || user.email || "",
      phone: initialForm?.phone || user.phone || "",
    };
    return { fullName: "", email: "", phone: "" };
  });

  const [usePoints, setUsePoints] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("qr"); // qr | momo | zalopay
  const [bookingRef, setBookingRef] = useState("");
  const [orderId, setOrderId] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nights = Math.max(
    1,
    Math.ceil((new Date(initialForm?.checkOut) - new Date(initialForm?.checkIn)) / (1000 * 60 * 60 * 24))
  );
  const basePrice       = Number(room?.price || 0) * nights;
  const COUPON_DISCOUNT = 100_000;
  const POINTS_DISCOUNT = 50_000;
  const discount        = appliedCoupon ? COUPON_DISCOUNT : 0;
  const pointsDiscount  = usePoints && bookingMode === "LOGGED_IN" ? POINTS_DISCOUNT : 0;
  const totalPrice      = basePrice - discount - pointsDiscount;
  const memberPoints    = 125_000;
  const savedPassengers = user ? [{ name: user.full_name || "Khách hàng", type: "Người lớn" }] : [];

  const formatCurrency = (v) =>
    Number(v || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) + " VNĐ";

  const handleModeChange = (mode) => {
    setBookingMode(mode);
    setStep(1);
    if (mode === "LOGGED_IN" && !user) { onLoginRequest?.(); return; }
    if (mode === "GUEST") { setUsePoints(false); setAppliedCoupon(false); }
    if (mode === "LOGGED_IN" && user) {
      setContactInfo({ fullName: user.full_name || "", email: user.email || "", phone: user.phone || "" });
    } else {
      setContactInfo({ fullName: "", email: "", phone: "" });
    }
  };

  // Bước 1 → 2: Tạo booking trên server, lấy orderId
  const handleGoToPayment = async () => {
    setError("");
    setLoading(true);
    try {
      const ref = "LUX-" + Math.floor(100_000 + Math.random() * 900_000);
      setBookingRef(ref);
      const result = await onConfirm?.({ contactInfo, bookingMode, usePoints, appliedCoupon, totalPrice, bookingRef: ref, selectedPayment });
      const oid = result?.bookingId ? `BK${result.bookingId}` : ref;
      setOrderId(oid);
      setPayStep("choose");
      setStep(2);
    } catch (err) {
      setError(err?.response?.data?.message || err?.message || "Không thể xử lý yêu cầu. Vui lòng thử lại.");
    } finally {
      setLoading(false);
    }
  };

  // Thanh toán thành công (từ QR hoặc Wallet)
  const handlePaymentSuccess = (pId) => {
    setPayStep("done");
    setStep(3);
  };

  const isStep1Valid = contactInfo.fullName.trim() && contactInfo.email.trim() && contactInfo.phone.trim();

  return (
    <div className="bf-overlay" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bf-modal">

        {/* ── Header ─────────────────────────────────────────── */}
        <div className="bf-modal-header">
          <div className="bf-modal-title">
            <span className="bf-room-name">{room?.name}</span>
            <span className="bf-room-sub">{nights} đêm · {formatCurrency(basePrice)}</span>
          </div>
          <button className="bf-close-btn" onClick={onClose} aria-label="Đóng">
            <X size={20} />
          </button>
        </div>

        {/* ── Mode Toggle ─────────────────────────────────────── */}
        <div className="bf-mode-toggle">
          <button className={`bf-mode-btn ${bookingMode === "GUEST" ? "bf-mode-guest" : ""}`}
            onClick={() => handleModeChange("GUEST")}>
            <UserX size={15} /> Khách Vãng Lai
          </button>
          <button className={`bf-mode-btn ${bookingMode === "LOGGED_IN" ? "bf-mode-member" : ""}`}
            onClick={() => handleModeChange("LOGGED_IN")}>
            <UserCheck size={15} /> {user ? "Thành Viên" : "Đăng Nhập"}
          </button>
        </div>

        {/* ── Step Indicator ──────────────────────────────────── */}
        <div className="bf-steps">
          <div className={`bf-step ${step >= 1 ? "bf-step-active" : ""}`}>
            <div className="bf-step-dot">1</div>
            <span>Thông tin</span>
          </div>
          <div className="bf-step-line" />
          <div className={`bf-step ${step >= 2 ? "bf-step-active" : ""}`}>
            <div className="bf-step-dot">2</div>
            <span>Thanh toán</span>
          </div>
          <div className="bf-step-line" />
          <div className={`bf-step ${step >= 3 ? "bf-step-active" : ""}`}>
            <div className="bf-step-dot">3</div>
            <span>Xác nhận</span>
          </div>
        </div>

        {/* ── Body ────────────────────────────────────────────── */}
        <div className="bf-body">

          {/* ═══ STEP 1: Thông tin liên hệ ═══════════════════════ */}
          {step === 1 && (
            <div className="bf-section">
              {bookingMode === "GUEST" ? (
                <div className="bf-banner bf-banner-guest">
                  <UserX size={16} style={{ flexShrink: 0 }} />
                  <div><strong>Khách Vãng Lai:</strong> Không cần tạo tài khoản. Xác nhận đặt phòng sẽ gửi về email.</div>
                </div>
              ) : (
                <div className="bf-banner bf-banner-member">
                  <Sparkles size={16} style={{ flexShrink: 0 }} />
                  <div><strong>Thành Viên:</strong> Đã tự động điền thông tin. Được tích điểm và áp dụng mã giảm giá độc quyền.</div>
                </div>
              )}

              <h4 className="bf-label-section">Thông tin liên hệ</h4>

              <div className="bf-field">
                <label className="bf-field-label">Họ và tên</label>
                <div className="bf-input-wrap">
                  <User size={16} className="bf-input-icon" />
                  <input type="text" className="bf-input" placeholder="VD: NGUYỄN VĂN A"
                    value={contactInfo.fullName}
                    onChange={(e) => setContactInfo({ ...contactInfo, fullName: e.target.value })} />
                </div>
              </div>

              <div className="bf-row-2">
                <div className="bf-field">
                  <label className="bf-field-label">Email nhận vé</label>
                  <div className="bf-input-wrap">
                    <Mail size={16} className="bf-input-icon" />
                    <input type="email" className="bf-input" placeholder="email@example.com"
                      value={contactInfo.email}
                      onChange={(e) => setContactInfo({ ...contactInfo, email: e.target.value })} />
                  </div>
                </div>
                <div className="bf-field">
                  <label className="bf-field-label">Số điện thoại</label>
                  <div className="bf-input-wrap">
                    <Phone size={16} className="bf-input-icon" />
                    <input type="tel" className="bf-input" placeholder="0901234567"
                      value={contactInfo.phone}
                      onChange={(e) => setContactInfo({ ...contactInfo, phone: e.target.value })} />
                  </div>
                </div>
              </div>

              {bookingMode === "LOGGED_IN" && savedPassengers.length > 0 && (
                <div className="bf-saved-passengers">
                  <span className="bf-label-xs">Hành khách đã lưu</span>
                  <div className="bf-passenger-chips">
                    {savedPassengers.map((p, i) => (
                      <button key={i} className="bf-passenger-chip"
                        onClick={() => setContactInfo({ ...contactInfo, fullName: p.name })}>
                        + Chọn {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {error && <div className="bf-error">{error}</div>}

              <button className="bf-btn-primary" disabled={!isStep1Valid || loading} onClick={handleGoToPayment}>
                {loading ? "Đang xử lý..." : <><span>Tiếp tục đến thanh toán</span> <ArrowRight size={16} /></>}
              </button>
            </div>
          )}

          {/* ═══ STEP 2: Thanh toán ════════════════════════════════ */}
          {step === 2 && (
            <div className="bf-section">

              {/* Khuyến mãi */}
              {payStep === "choose" && (
                <>
                  <h4 className="bf-label-section">Ưu đãi & Khuyến mãi</h4>
                  {bookingMode === "LOGGED_IN" ? (
                    <div className="bf-promos">
                      <div className="bf-promo-row bf-promo-coupon">
                        <div className="bf-promo-info">
                          <Gift size={18} className="bf-promo-icon" />
                          <div>
                            <div className="bf-promo-name">Mã giảm giá thành viên</div>
                            <div className="bf-promo-desc">Giảm {COUPON_DISCOUNT.toLocaleString("vi-VN")} VNĐ cho đặt phòng này</div>
                          </div>
                        </div>
                        <button className={`bf-promo-btn ${appliedCoupon ? "bf-promo-applied" : ""}`}
                          onClick={() => setAppliedCoupon(!appliedCoupon)}>
                          {appliedCoupon ? "Đã áp dụng" : "Áp dụng"}
                        </button>
                      </div>
                      <div className="bf-promo-row">
                        <div className="bf-promo-info">
                          <Sparkles size={18} className="bf-promo-icon bf-promo-icon-gold" />
                          <div>
                            <div className="bf-promo-name">LuxStay Points</div>
                            <div className="bf-promo-desc">Bạn có {memberPoints.toLocaleString("vi-VN")} điểm (Dùng {POINTS_DISCOUNT.toLocaleString("vi-VN")} VNĐ)</div>
                          </div>
                        </div>
                        <label className="bf-checkbox-wrap">
                          <input type="checkbox" checked={usePoints} onChange={(e) => setUsePoints(e.target.checked)} />
                          <span className="bf-checkbox-custom" />
                        </label>
                      </div>
                    </div>
                  ) : (
                    <div className="bf-guest-promo-msg">
                      <div>
                        <strong className="bf-promo-name">Khách vãng lai không thể dùng mã giảm giá / điểm.</strong>
                        <span className="bf-promo-desc"> Đăng nhập để tiết kiệm thêm tới {(COUPON_DISCOUNT + POINTS_DISCOUNT).toLocaleString("vi-VN")} VNĐ.</span>
                      </div>
                      <button className="bf-login-cta" onClick={() => handleModeChange("LOGGED_IN")}>Đăng nhập ngay</button>
                    </div>
                  )}

                  <h4 className="bf-label-section" style={{ marginTop: 16 }}>Phương thức thanh toán</h4>

                  {/* Option 1: Ngân hàng QR (option1_bankQr) */}
                  <div className="bf-payment-method-card">
                    <label className={`bf-payment-method-header ${selectedPayment === "qr" ? "bf-pay-method-active" : ""}`}>
                      <input type="radio" name="payMethod" value="qr"
                        checked={selectedPayment === "qr"} onChange={() => setSelectedPayment("qr")} />
                      <QrCode size={20} />
                      <div>
                        <div className="bf-pay-method-title">Ngân hàng - Quét mã QR</div>
                        <div className="bf-pay-method-sub">VietQR / NAPAS 247 — Tất cả ngân hàng Việt Nam</div>
                      </div>
                      {selectedPayment === "qr" && <span className="bf-pay-badge">▾</span>}
                    </label>
                  </div>

                  {/* Option 2: Ví điện tử (option2_ewallet) */}
                  <div className="bf-payment-method-card">
                    <label className={`bf-payment-method-header ${(selectedPayment === "momo" || selectedPayment === "zalopay") ? "bf-pay-method-active" : ""}`}>
                      <input type="radio" name="payMethod" value="momo"
                        checked={selectedPayment === "momo" || selectedPayment === "zalopay"}
                        onChange={() => setSelectedPayment("momo")} />
                      <Smartphone size={20} />
                      <div>
                        <div className="bf-pay-method-title">Ví điện tử</div>
                        <div className="bf-pay-method-sub">MoMo · ZaloPay — Mở app xác nhận ngay</div>
                      </div>
                      {(selectedPayment === "momo" || selectedPayment === "zalopay") && (
                        <span className="bf-pay-badge">▾</span>
                      )}
                    </label>
                    {(selectedPayment === "momo" || selectedPayment === "zalopay") && (
                      <div className="bf-wallet-picker">
                        {Object.entries(WALLET_CONFIG).map(([key, cfg]) => (
                          <button key={key}
                            className={`bf-wallet-chip ${selectedPayment === key ? "bf-wallet-chip-active" : ""}`}
                            style={{ "--wallet-color": cfg.color }}
                            onClick={() => setSelectedPayment(key)}>
                            {cfg.icon} {cfg.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Nút Thanh toán: chuyển sang panel thanh toán thực tế */}
                  {error && <div className="bf-error">{error}</div>}
                  <div className="bf-btn-row">
                    <button className="bf-btn-back" onClick={() => { setStep(1); setError(""); }}>Quay lại</button>
                    <button className="bf-btn-pay"
                      onClick={() => setPayStep(selectedPayment === "qr" ? "qr" : "wallet")}>
                      {selectedPayment === "qr"
                        ? <><QrCode size={16} /> Hiện mã QR · {formatCurrency(totalPrice)}</>
                        : <><Smartphone size={16} /> Mở {WALLET_CONFIG[selectedPayment]?.label} · {formatCurrency(totalPrice)}</>
                      }
                    </button>
                  </div>
                </>
              )}

              {/* Panel QR (option1_bankQr flow) */}
              {payStep === "qr" && (
                <div>
                  <button className="pay-back-link" onClick={() => setPayStep("choose")}>
                    ← Đổi phương thức
                  </button>
                  <QrPaymentPanel
                    orderId={orderId || bookingRef}
                    amount={totalPrice}
                    onSuccess={handlePaymentSuccess}
                    onFailed={() => { setError("Giao dịch thất bại. Vui lòng thử lại."); setPayStep("choose"); }}
                  />
                </div>
              )}

              {/* Panel Wallet (option2_ewallet flow) */}
              {payStep === "wallet" && (
                <div>
                  <button className="pay-back-link" onClick={() => setPayStep("choose")}>
                    ← Đổi phương thức
                  </button>
                  <WalletPaymentPanel
                    orderId={orderId || bookingRef}
                    amount={totalPrice}
                    onSuccess={handlePaymentSuccess}
                    onFailed={() => { setError("Giao dịch thất bại. Vui lòng thử lại."); setPayStep("choose"); }}
                  />
                </div>
              )}
            </div>
          )}

          {/* ═══ STEP 3: Xác nhận thành công ══════════════════════ */}
          {step === 3 && (
            <div className="bf-section bf-confirm">
              <div className="bf-confirm-icon"><CheckCircle2 size={52} /></div>
              <h3 className="bf-confirm-title">Đặt phòng thành công!</h3>
              <p className="bf-confirm-ref">Mã đặt chỗ: <span className="bf-ref-code">{bookingRef}</span></p>

              {bookingMode === "GUEST" ? (
                <div className="bf-confirm-info bf-confirm-guest">
                  <div className="bf-confirm-info-title"><Mail size={14} /> Tra cứu vé vãng lai:</div>
                  <p>Vé điện tử đã được gửi tới <strong>{contactInfo.email}</strong>. Mã đặt chỗ: <strong>{bookingRef}</strong></p>
                </div>
              ) : (
                <div className="bf-confirm-info bf-confirm-member">
                  <div className="bf-confirm-info-title"><History size={14} /> Đã lưu vào tài khoản:</div>
                  <p>Vé đã lưu vào <strong>Chuyến đi của tôi</strong>. Bạn nhận được <strong>{Math.floor(totalPrice / 1000).toLocaleString("vi-VN")} LuxStay Points</strong> cho giao dịch này!</p>
                </div>
              )}

              <button className="bf-btn-reset" onClick={onClose}>
                <RotateCcw size={14} /> Đặt phòng mới
              </button>
            </div>
          )}
        </div>

        {/* ── Summary Bar ────────────────────────────────────── */}
        <div className="bf-summary-bar">
          <div className="bf-summary-row">
            <span>Giá {nights} đêm</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
          {appliedCoupon && (
            <div className="bf-summary-row bf-summary-discount">
              <span>Mã giảm giá</span>
              <span>-{formatCurrency(discount)}</span>
            </div>
          )}
          {usePoints && bookingMode === "LOGGED_IN" && (
            <div className="bf-summary-row bf-summary-points">
              <span>LuxStay Points</span>
              <span>-{formatCurrency(pointsDiscount)}</span>
            </div>
          )}
          <div className="bf-summary-total">
            <span>Tổng tiền</span>
            <span className="bf-total-amount">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
