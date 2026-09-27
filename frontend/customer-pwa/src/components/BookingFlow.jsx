import React, { useState } from "react";
import {
  UserCheck,
  UserX,
  Gift,
  CreditCard,
  CheckCircle2,
  ShieldCheck,
  ArrowRight,
  Sparkles,
  Mail,
  Phone,
  User,
  History,
  RotateCcw,
  X
} from "lucide-react";

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

  const [contactInfo, setContactInfo] = useState(() => {
    if (user) {
      return {
        fullName: initialForm?.fullName || user.full_name || "",
        email: initialForm?.email || user.email || "",
        phone: initialForm?.phone || user.phone || "",
      };
    }
    return { fullName: "", email: "", phone: "" };
  });

  const [usePoints, setUsePoints] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(false);
  const [selectedPayment, setSelectedPayment] = useState("atm");
  const [bookingRef, setBookingRef] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const nights = Math.max(
    1,
    Math.ceil(
      (new Date(initialForm?.checkOut) - new Date(initialForm?.checkIn)) /
        (1000 * 60 * 60 * 24)
    )
  );
  const basePrice = Number(room?.price || 0) * nights;
  const COUPON_DISCOUNT = 100000;
  const POINTS_DISCOUNT = 50000;
  const discount = appliedCoupon ? COUPON_DISCOUNT : 0;
  const pointsDiscount =
    usePoints && bookingMode === "LOGGED_IN" ? POINTS_DISCOUNT : 0;
  const totalPrice = basePrice - discount - pointsDiscount;

  const formatCurrency = (v) =>
    Number(v || 0).toLocaleString("vi-VN", { maximumFractionDigits: 0 }) +
    " VND";

  const memberPoints = 125000;

  const savedPassengers = user
    ? [{ name: user.full_name || "Khach hang", type: "Nguoi lon" }]
    : [];

  const handleModeChange = (mode) => {
    setBookingMode(mode);
    setStep(1);
    if (mode === "LOGGED_IN") {
      if (user) {
        setContactInfo({
          fullName: user.full_name || "",
          email: user.email || "",
          phone: user.phone || "",
        });
      } else {
        onLoginRequest?.();
      }
    } else {
      setContactInfo({ fullName: "", email: "", phone: "" });
      setUsePoints(false);
      setAppliedCoupon(false);
    }
  };

  const handleCompleteBooking = async () => {
    setError("");
    setLoading(true);
    try {
      const ref = "LUX-" + Math.floor(100000 + Math.random() * 900000);
      setBookingRef(ref);
      await onConfirm?.({
        contactInfo,
        bookingMode,
        usePoints,
        appliedCoupon,
        totalPrice,
        bookingRef: ref,
        selectedPayment,
      });
      setStep(3);
    } catch (err) {
      setError(
        err?.response?.data?.message ||
          err?.message ||
          "Dat phong that bai. Vui long thu lai."
      );
    } finally {
      setLoading(false);
    }
  };

  const isStep1Valid =
    contactInfo.fullName.trim() &&
    contactInfo.email.trim() &&
    contactInfo.phone.trim();

  return (
    <div
      className="bf-overlay"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bf-modal">
        {/* Header */}
        <div className="bf-modal-header">
          <div className="bf-modal-title">
            <span className="bf-room-name">{room?.name}</span>
            <span className="bf-room-sub">
              {nights} dem · {formatCurrency(basePrice)}
            </span>
          </div>
          <button className="bf-close-btn" onClick={onClose} aria-label="Dong">
            <X size={20} />
          </button>
        </div>

        {/* Mode Toggle */}
        <div className="bf-mode-toggle">
          <button
            className={`bf-mode-btn ${bookingMode === "GUEST" ? "bf-mode-guest" : ""}`}
            onClick={() => handleModeChange("GUEST")}
          >
            <UserX size={15} />
            Khach Vang Lai
          </button>
          <button
            className={`bf-mode-btn ${bookingMode === "LOGGED_IN" ? "bf-mode-member" : ""}`}
            onClick={() => handleModeChange("LOGGED_IN")}
          >
            <UserCheck size={15} />
            {user ? "Thanh Vien" : "Dang Nhap"}
          </button>
        </div>

        {/* Step Indicator */}
        <div className="bf-steps">
          <div className={`bf-step ${step >= 1 ? "bf-step-active" : ""}`}>
            <div className="bf-step-dot">1</div>
            <span>Thong tin</span>
          </div>
          <div className="bf-step-line" />
          <div className={`bf-step ${step >= 2 ? "bf-step-active" : ""}`}>
            <div className="bf-step-dot">2</div>
            <span>Thanh toan</span>
          </div>
          <div className="bf-step-line" />
          <div className={`bf-step ${step >= 3 ? "bf-step-active" : ""}`}>
            <div className="bf-step-dot">3</div>
            <span>Xac nhan</span>
          </div>
        </div>

        {/* Body */}
        <div className="bf-body">
          {/* STEP 1 */}
          {step === 1 && (
            <div className="bf-section">
              {bookingMode === "GUEST" ? (
                <div className="bf-banner bf-banner-guest">
                  <UserX size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Che do Khach Vang Lai:</strong> Ban khong can tao tai khoan.
                    Ve se duoc gui truc tiep ve email cua ban.
                  </div>
                </div>
              ) : (
                <div className="bf-banner bf-banner-member">
                  <Sparkles size={16} style={{ flexShrink: 0 }} />
                  <div>
                    <strong>Che do Thanh Vien:</strong> Da tu dong dien thong tin. Duoc
                    tich diem va ap dung ma giam gia doc quyen.
                  </div>
                </div>
              )}

              <h4 className="bf-label-section">Thong tin lien he</h4>

              <div className="bf-field">
                <label className="bf-field-label">Ho va ten</label>
                <div className="bf-input-wrap">
                  <User size={16} className="bf-input-icon" />
                  <input
                    type="text"
                    className="bf-input"
                    placeholder="VD: NGUYEN VAN A"
                    value={contactInfo.fullName}
                    onChange={(e) =>
                      setContactInfo({ ...contactInfo, fullName: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="bf-row-2">
                <div className="bf-field">
                  <label className="bf-field-label">Email nhan ve</label>
                  <div className="bf-input-wrap">
                    <Mail size={16} className="bf-input-icon" />
                    <input
                      type="email"
                      className="bf-input"
                      placeholder="email@example.com"
                      value={contactInfo.email}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, email: e.target.value })
                      }
                    />
                  </div>
                </div>
                <div className="bf-field">
                  <label className="bf-field-label">So dien thoai</label>
                  <div className="bf-input-wrap">
                    <Phone size={16} className="bf-input-icon" />
                    <input
                      type="tel"
                      className="bf-input"
                      placeholder="0901234567"
                      value={contactInfo.phone}
                      onChange={(e) =>
                        setContactInfo({ ...contactInfo, phone: e.target.value })
                      }
                    />
                  </div>
                </div>
              </div>

              {bookingMode === "LOGGED_IN" && savedPassengers.length > 0 && (
                <div className="bf-saved-passengers">
                  <span className="bf-label-xs">Hanh khach da luu</span>
                  <div className="bf-passenger-chips">
                    {savedPassengers.map((p, i) => (
                      <button
                        key={i}
                        className="bf-passenger-chip"
                        onClick={() =>
                          setContactInfo({ ...contactInfo, fullName: p.name })
                        }
                      >
                        + Chon {p.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                className="bf-btn-primary"
                disabled={!isStep1Valid}
                onClick={() => setStep(2)}
              >
                Tiep tuc den thanh toan <ArrowRight size={16} />
              </button>
            </div>
          )}

          {/* STEP 2 */}
          {step === 2 && (
            <div className="bf-section">
              <h4 className="bf-label-section">Uu dai va Khuyen mai</h4>

              {bookingMode === "LOGGED_IN" ? (
                <div className="bf-promos">
                  <div className="bf-promo-row bf-promo-coupon">
                    <div className="bf-promo-info">
                      <Gift size={18} className="bf-promo-icon" />
                      <div>
                        <div className="bf-promo-name">Ma giam gia thanh vien</div>
                        <div className="bf-promo-desc">
                          Giam {COUPON_DISCOUNT.toLocaleString("vi-VN")} VND cho dat phong
                          nay
                        </div>
                      </div>
                    </div>
                    <button
                      className={`bf-promo-btn ${appliedCoupon ? "bf-promo-applied" : ""}`}
                      onClick={() => setAppliedCoupon(!appliedCoupon)}
                    >
                      {appliedCoupon ? "Da ap dung" : "Ap dung"}
                    </button>
                  </div>

                  <div className="bf-promo-row">
                    <div className="bf-promo-info">
                      <Sparkles size={18} className="bf-promo-icon bf-promo-icon-gold" />
                      <div>
                        <div className="bf-promo-name">LuxStay Points</div>
                        <div className="bf-promo-desc">
                          Ban co {memberPoints.toLocaleString("vi-VN")} diem (Dung{" "}
                          {POINTS_DISCOUNT.toLocaleString("vi-VN")} VND)
                        </div>
                      </div>
                    </div>
                    <label className="bf-checkbox-wrap">
                      <input
                        type="checkbox"
                        checked={usePoints}
                        onChange={(e) => setUsePoints(e.target.checked)}
                      />
                      <span className="bf-checkbox-custom" />
                    </label>
                  </div>
                </div>
              ) : (
                <div className="bf-guest-promo-msg">
                  <div>
                    <strong className="bf-promo-name">
                      Khach vang lai khong the dung ma giam gia / diem.
                    </strong>
                    <span className="bf-promo-desc">
                      {" "}
                      Dang nhap de tiet kiem them toi{" "}
                      {(COUPON_DISCOUNT + POINTS_DISCOUNT).toLocaleString("vi-VN")} VND.
                    </span>
                  </div>
                  <button
                    className="bf-login-cta"
                    onClick={() => handleModeChange("LOGGED_IN")}
                  >
                    Dang nhap ngay
                  </button>
                </div>
              )}

              <h4 className="bf-label-section" style={{ marginTop: "20px" }}>
                Phuong thuc thanh toan
              </h4>
              <div className="bf-payment-grid">
                <label
                  className={`bf-payment-option ${selectedPayment === "atm" ? "bf-payment-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="bf-payment"
                    value="atm"
                    checked={selectedPayment === "atm"}
                    onChange={() => setSelectedPayment("atm")}
                  />
                  <CreditCard size={18} />
                  <span>ATM / Internet Banking</span>
                </label>
                <label
                  className={`bf-payment-option ${selectedPayment === "ewallet" ? "bf-payment-selected" : ""}`}
                >
                  <input
                    type="radio"
                    name="bf-payment"
                    value="ewallet"
                    checked={selectedPayment === "ewallet"}
                    onChange={() => setSelectedPayment("ewallet")}
                  />
                  <ShieldCheck size={18} />
                  <span>MoMo / ZaloPay</span>
                </label>
              </div>

              {error && <div className="bf-error">{error}</div>}

              <div className="bf-btn-row">
                <button className="bf-btn-back" onClick={() => setStep(1)}>
                  Quay lai
                </button>
                <button
                  className="bf-btn-pay"
                  onClick={handleCompleteBooking}
                  disabled={loading}
                >
                  {loading
                    ? "Dang xu ly..."
                    : `Thanh toan ${formatCurrency(totalPrice)}`}
                </button>
              </div>
            </div>
          )}

          {/* STEP 3 */}
          {step === 3 && (
            <div className="bf-section bf-confirm">
              <div className="bf-confirm-icon">
                <CheckCircle2 size={52} />
              </div>
              <h3 className="bf-confirm-title">Dat phong thanh cong!</h3>
              <p className="bf-confirm-ref">
                Ma dat cho: <span className="bf-ref-code">{bookingRef}</span>
              </p>

              {bookingMode === "GUEST" ? (
                <div className="bf-confirm-info bf-confirm-guest">
                  <div className="bf-confirm-info-title">
                    <Mail size={14} /> Tra cuu ve vang lai:
                  </div>
                  <p>
                    Ve dien tu da duoc gui toi <strong>{contactInfo.email}</strong>. De tra
                    cuu sau, vao muc <strong>Khoi phuc dat cho</strong> va nhap Email + Ma
                    dat cho <strong>{bookingRef}</strong>.
                  </p>
                </div>
              ) : (
                <div className="bf-confirm-info bf-confirm-member">
                  <div className="bf-confirm-info-title">
                    <History size={14} /> Da luu vao tai khoan:
                  </div>
                  <p>
                    Ve da duoc luu vao muc <strong>Dat cho cua toi</strong>. Ban nhan duoc{" "}
                    <strong>
                      {Math.floor(totalPrice / 1000).toLocaleString("vi-VN")} LuxStay
                      Points
                    </strong>{" "}
                    cho giao dich nay!
                  </p>
                </div>
              )}

              <button className="bf-btn-reset" onClick={onClose}>
                <RotateCcw size={14} /> Dat phong moi
              </button>
            </div>
          )}
        </div>

        {/* Summary Bar */}
        <div className="bf-summary-bar">
          <div className="bf-summary-row">
            <span>Gia {nights} dem</span>
            <span>{formatCurrency(basePrice)}</span>
          </div>
          {appliedCoupon && (
            <div className="bf-summary-row bf-summary-discount">
              <span>Ma giam gia</span>
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
            <span>Tong tien</span>
            <span className="bf-total-amount">{formatCurrency(totalPrice)}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
