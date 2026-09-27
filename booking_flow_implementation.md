import React, { useState } from 'react';
import { 
  UserCheck, 
  UserX, 
  Gift, 
  CreditCard, 
  CheckCircle2, 
  ShieldCheck, 
  ArrowRight, 
  Sparkles,
  Plane,
  Mail,
  Phone,
  User,
  History,
  RotateCcw
} from 'lucide-react';

export default function TravelokaBookingSystem() {
  const [bookingMode, setBookingMode] = useState('GUEST'); // 'GUEST' | 'LOGGED_IN'
  const [step, setStep] = useState(1); // 1: Info, 2: Payment, 3: Confirmation
  
  // Mock logged-in user data
  const loggedInUser = {
    name: 'Nguyễn Văn A',
    email: 'nguyenvana@gmail.com',
    phone: '0901234567',
    points: 125000,
    savedPassengers: [
      { name: 'Nguyễn Văn A', type: 'Người lớn', gender: 'Nam' },
      { name: 'Trần Thị B', type: 'Người lớn', gender: 'Nữ' }
    ]
  };

  // Form State
  const [contactInfo, setContactInfo] = useState({
    fullName: '',
    email: '',
    phone: ''
  });

  const [usePoints, setUsePoints] = useState(false);
  const [appliedCoupon, setAppliedCoupon] = useState(false);
  const [bookingRef, setBookingRef] = useState('');

  // Auto-fill when switching to Logged-in mode
  const handleModeChange = (mode) => {
    setBookingMode(mode);
    setStep(1);
    if (mode === 'LOGGED_IN') {
      setContactInfo({
        fullName: loggedInUser.name,
        email: loggedInUser.email,
        phone: loggedInUser.phone
      });
    } else {
      setContactInfo({
        fullName: '',
        email: '',
        phone: ''
      });
      setUsePoints(false);
      setAppliedCoupon(false);
    }
  };

  const basePrice = 1250000;
  const discount = appliedCoupon ? 100000 : 0;
  const pointsDiscount = (usePoints && bookingMode === 'LOGGED_IN') ? 50000 : 0;
  const totalPrice = basePrice - discount - pointsDiscount;

  const handleCompleteBooking = () => {
    const randomRef = 'TVLK-' + Math.floor(100000 + Math.random() * 900000);
    setBookingRef(randomRef);
    setStep(3);
  };

  return (
    <div className="min-h-screen bg-slate-50 p-4 md:p-8 font-sans text-slate-800">
      {/* Header */}
      <header className="max-w-4xl mx-auto mb-8 bg-white p-6 rounded-2xl shadow-sm border border-slate-100 flex flex-col md:flex-row justify-between items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-blue-600 flex items-center gap-2">
            <Plane className="w-6 h-6" /> Traveloka Booking Demo
          </h1>
          <p className="text-sm text-slate-500">Mô phỏng luồng đặt vé Khách vãng lai vs Khách đăng nhập</p>
        </div>

        {/* Toggle Mode */}
        <div className="bg-slate-100 p-1.5 rounded-xl flex items-center gap-1">
          <button
            onClick={() => handleModeChange('GUEST')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              bookingMode === 'GUEST'
                ? 'bg-white text-slate-800 shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserX className="w-4 h-4 text-orange-500" /> Khách Vãng Lai
          </button>
          <button
            onClick={() => handleModeChange('LOGGED_IN')}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
              bookingMode === 'LOGGED_IN'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-4 h-4 text-emerald-400" /> Đã Đăng Nhập
          </button>
        </div>
      </header>

      {/* Main Container */}
      <main className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column: Flow Details & Form */}
        <div className="md:col-span-2 space-y-6">
          
          {/* Step Indicator */}
          <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm flex justify-between items-center text-sm font-medium text-slate-500">
            <span className={step >= 1 ? 'text-blue-600 font-bold' : ''}>1. Thông tin</span>
            <span>&rarr;</span>
            <span className={step >= 2 ? 'text-blue-600 font-bold' : ''}>2. Thanh toán</span>
            <span>&rarr;</span>
            <span className={step >= 3 ? 'text-blue-600 font-bold' : ''}>3. Vé điện tử</span>
          </div>

          {/* STEP 1: CONTACT & PASSENGER INFO */}
          {step === 1 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              
              {/* Feature Banner based on mode */}
              {bookingMode === 'GUEST' ? (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl flex items-start gap-3 text-orange-800 text-xs md:text-sm">
                  <UserX className="w-5 h-5 shrink-0 text-orange-500 mt-0.5" />
                  <div>
                    <span className="font-bold">Chế độ Khách Vãng Lai:</span> Bạn không cần tạo tài khoản. Vé sẽ được gửi trực tiếp về email của bạn.
                  </div>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-xl flex items-start gap-3 text-emerald-800 text-xs md:text-sm">
                  <Sparkles className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                  <div>
                    <span className="font-bold">Chế độ Thành Viên:</span> Đã tự động điền thông tin cá nhân. Được tích điểm Traveloka Points & áp dụng mã giảm giá.
                  </div>
                </div>
              )}

              <h2 className="text-lg font-bold text-slate-800">Thông tin liên hệ</h2>

              {/* Form Inputs */}
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Họ và tên</label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="Ví dụ: NGUYEN VAN A"
                      value={contactInfo.fullName}
                      onChange={(e) => setContactInfo({...contactInfo, fullName: e.target.value})}
                      className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Email nhận vé</label>
                    <div className="relative">
                      <Mail className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="email"
                        placeholder="email@example.com"
                        value={contactInfo.email}
                        onChange={(e) => setContactInfo({...contactInfo, email: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wider mb-1">Số điện thoại</label>
                    <div className="relative">
                      <Phone className="w-5 h-5 absolute left-3 top-2.5 text-slate-400" />
                      <input
                        type="tel"
                        placeholder="0901234567"
                        value={contactInfo.phone}
                        onChange={(e) => setContactInfo({...contactInfo, phone: e.target.value})}
                        className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-sm"
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Logged-in extra features */}
              {bookingMode === 'LOGGED_IN' && (
                <div className="pt-4 border-t border-slate-100">
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">Danh sách hành khách đã lưu</span>
                  <div className="flex gap-2">
                    {loggedInUser.savedPassengers.map((passenger, idx) => (
                      <button 
                        key={idx}
                        onClick={() => setContactInfo({...contactInfo, fullName: passenger.name})}
                        className="text-xs bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg border border-blue-200 transition-colors"
                      >
                        + Chọn {passenger.name}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button
                disabled={!contactInfo.fullName || !contactInfo.email || !contactInfo.phone}
                onClick={() => setStep(2)}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-200 disabled:cursor-not-allowed text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2"
              >
                Tiếp tục đến thanh toán <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* STEP 2: PAYMENT & PROMOS */}
          {step === 2 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-6">
              <h2 className="text-lg font-bold text-slate-800">Khuyến mãi & Thanh toán</h2>

              {/* Promos Section */}
              <div className="space-y-3">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Ưu đãi áp dụng</span>
                
                {bookingMode === 'LOGGED_IN' ? (
                  <>
                    {/* Member Coupon */}
                    <div className="flex items-center justify-between p-3 border border-dashed border-blue-300 rounded-xl bg-blue-50/50">
                      <div className="flex items-center gap-3">
                        <Gift className="w-5 h-5 text-blue-600" />
                        <div>
                          <div className="text-sm font-semibold">Mã giảm giá thành viên</div>
                          <div className="text-xs text-slate-500">Giảm 100.000 VND cho vé máy bay</div>
                        </div>
                      </div>
                      <button
                        onClick={() => setAppliedCoupon(!appliedCoupon)}
                        className={`text-xs px-3 py-1.5 rounded-lg font-bold transition-all ${
                          appliedCoupon 
                            ? 'bg-emerald-600 text-white' 
                            : 'bg-blue-600 text-white hover:bg-blue-700'
                        }`}
                      >
                        {appliedCoupon ? 'Đã áp dụng' : 'Áp dụng'}
                      </button>
                    </div>

                    {/* Member Points */}
                    <div className="flex items-center justify-between p-3 border border-slate-200 rounded-xl">
                      <div className="flex items-center gap-3">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        <div>
                          <div className="text-sm font-semibold">Traveloka Points</div>
                          <div className="text-xs text-slate-500">Bạn có 125.000 điểm (Dùng 50.000đ)</div>
                        </div>
                      </div>
                      <input 
                        type="checkbox" 
                        checked={usePoints} 
                        onChange={(e) => setUsePoints(e.target.checked)}
                        className="w-5 h-5 accent-blue-600 rounded cursor-pointer" 
                      />
                    </div>
                  </>
                ) : (
                  <div className="p-4 border border-slate-200 rounded-xl bg-slate-50 text-xs text-slate-600 flex items-center justify-between">
                    <div>
                      <span className="font-bold block text-slate-700">Khách vãng lai không thể dùng Mã giảm giá / Xu</span>
                      Đăng nhập để tiết kiệm thêm tới 150.000 VND cho đơn hàng này.
                    </div>
                    <button 
                      onClick={() => handleModeChange('LOGGED_IN')}
                      className="shrink-0 bg-blue-600 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-blue-700 ml-2"
                    >
                      Đăng nhập ngay
                    </button>
                  </div>
                )}
              </div>

              {/* Payment Methods */}
              <div className="space-y-3 pt-4 border-t border-slate-100">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">Phương thức thanh toán</span>
                <div className="grid grid-cols-2 gap-3">
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-all">
                    <input type="radio" name="payment" defaultChecked className="accent-blue-600" />
                    <CreditCard className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium">Thẻ ATM / Internet Banking</span>
                  </label>
                  <label className="flex items-center gap-3 p-3 border border-slate-200 rounded-xl cursor-pointer hover:border-blue-500 transition-all">
                    <input type="radio" name="payment" className="accent-blue-600" />
                    <ShieldCheck className="w-5 h-5 text-slate-600" />
                    <span className="text-sm font-medium">Ví MoMo / ZaloPay</span>
                  </label>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => setStep(1)}
                  className="w-1/3 border border-slate-200 text-slate-600 font-bold py-3 rounded-xl hover:bg-slate-50 transition-all"
                >
                  Quay lại
                </button>
                <button
                  onClick={handleCompleteBooking}
                  className="w-2/3 bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20"
                >
                  Thanh toán {totalPrice.toLocaleString('vi-VN')} VND
                </button>
              </div>
            </div>
          )}

          {/* STEP 3: BOOKING CONFIRMATION */}
          {step === 3 && (
            <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm text-center space-y-6">
              <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-10 h-10" />
              </div>

              <div>
                <h2 className="text-xl font-bold text-slate-800">Đặt chỗ thành công!</h2>
                <p className="text-sm text-slate-500 mt-1">Mã đặt chỗ của bạn: <span className="font-mono font-bold text-blue-600">{bookingRef}</span></p>
              </div>

              {/* Dynamic instruction based on mode */}
              {bookingMode === 'GUEST' ? (
                <div className="bg-orange-50 border border-orange-200 p-4 rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-2 font-bold text-orange-800 text-sm">
                    <Mail className="w-4 h-4" /> Tra cứu vé vãng lai:
                  </div>
                  <p className="text-xs text-orange-700 leading-relaxed">
                    Vé điện tử đã được gửi tới <b>{contactInfo.email}</b>. Để tra cứu lại sau này mà không cần đăng nhập, hãy truy cập mục <b>Khôi phục đặt chỗ</b> trên ứng dụng/website và nhập Email + Mã đặt chỗ ({bookingRef}).
                  </p>
                </div>
              ) : (
                <div className="bg-blue-50 border border-blue-200 p-4 rounded-xl text-left space-y-2">
                  <div className="flex items-center gap-2 font-bold text-blue-800 text-sm">
                    <History className="w-4 h-4" /> Đã lưu vào tài khoản:
                  </div>
                  <p className="text-xs text-blue-700 leading-relaxed">
                    Vé điện tử đã được lưu vào mục <b>Đặt chỗ của tôi</b> trong tài khoản của bạn. Bạn cũng nhận được {Math.floor(totalPrice / 1000)} Traveloka Points cho giao dịch này!
                  </p>
                </div>
              )}

              <button
                onClick={() => setStep(1)}
                className="inline-flex items-center gap-2 text-sm text-slate-500 hover:text-slate-800 font-medium"
              >
                <RotateCcw className="w-4 h-4" /> Thực hiện đơn đặt chỗ mới
              </button>
            </div>
          )}

        </div>

        {/* Right Column: Order Summary */}
        <div className="space-y-6">
          <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h3 className="font-bold text-slate-800 text-base border-b border-slate-100 pb-3">Chi tiết chuyến bay</h3>
            
            <div className="space-y-2 text-sm">
              <div className="flex justify-between font-semibold">
                <span>TP. Hồ Chí Minh (SGN)</span>
                <span>&rarr;</span>
                <span>Hà Nội (HAN)</span>
              </div>
              <div className="text-xs text-slate-500">Vietjet Air • Phổ thông</div>
            </div>

            <div className="border-t border-slate-100 pt-3 space-y-2 text-xs text-slate-600">
              <div className="flex justify-between">
                <span>Giá vé gốc</span>
                <span className="font-medium">{basePrice.toLocaleString('vi-VN')} VND</span>
              </div>
              
              {appliedCoupon && (
                <div className="flex justify-between text-emerald-600 font-medium">
                  <span>Mã giảm giá</span>
                  <span>-{discount.toLocaleString('vi-VN')} VND</span>
                </div>
              )}

              {usePoints && (
                <div className="flex justify-between text-amber-600 font-medium">
                  <span>Traveloka Points</span>
                  <span>-{pointsDiscount.toLocaleString('vi-VN')} VND</span>
                </div>
              )}

              <div className="border-t border-slate-100 pt-2 flex justify-between items-center text-sm font-bold text-slate-800">
                <span>Tổng tiền</span>
                <span className="text-orange-600 text-base">{totalPrice.toLocaleString('vi-VN')} VND</span>
              </div>
            </div>
          </div>

          {/* Additional Guidance Box */}
          <div className="bg-slate-100 p-4 rounded-xl text-xs text-slate-600 space-y-2">
            <span className="font-bold text-slate-700 block">Lưu ý khi vận hành hệ thống:</span>
            <ul className="list-disc list-inside space-y-1">
              <li>Guest Checkout giúp giảm tỉ lệ bỏ giỏ hàng (Cart Abandonment).</li>
              <li>Logged-in Checkout gia tăng tỷ lệ giữ chân khách hàng (Customer Retention) qua tích điểm.</li>
            </ul>
          </div>
        </div>

      </main>
    </div>
  );
}