const crypto = require('crypto');
const { Payment, Invoice, Booking, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

// Bảng lưu trạng thái payment trong memory (sandbox - không cần Redis)
// Key = paymentId, Value = { status, amount, orderId, method, wallet, expiresAt }
const paymentStore = new Map();

const WEBHOOK_SECRET = process.env.PAYMENT_WEBHOOK_SECRET || 'luxstay_webhook_secret_2024';
const QR_EXPIRY_SECONDS = 300; // 5 phút theo config

// ── Helper: tạo paymentId unique ──────────────────────────────
const genPaymentId = () => `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;

// ── Tạo hóa đơn draft nếu chưa có (helper cho flow khách) ─────
const ensureInvoice = async (bookingId, amount) => {
  let invoice = await Invoice.findOne({ where: { booking_id: bookingId } });
  if (!invoice) {
    const invNum = `INV-${Date.now()}`;
    invoice = await Invoice.create({
      booking_id: bookingId,
      hotel_branch_id: 1,
      invoice_number: invNum,
      customer_id: (await Booking.findByPk(bookingId))?.customer_id || 1,
      room_charge: amount,
      total_amount: amount,
      status: 'Issued',
      issued_at: new Date(),
    });
  }
  return invoice;
};

// ══════════════════════════════════════════════════════════════
// POST /api/payments/qr
// Tạo QR code ngân hàng (VietQR / NAPAS 247)
// Request: { orderId, amount }
// Response: { paymentId, qrImageUrl, expiresAt }
// ══════════════════════════════════════════════════════════════
const createQrPayment = async (req, res, next) => {
  try {
    const { orderId, amount } = req.body;
    if (!orderId || !amount) throw createError('orderId và amount là bắt buộc', 400);

    const numAmount = Number(amount);
    if (isNaN(numAmount) || numAmount <= 0) throw createError('amount phải là số dương', 400);

    const paymentId = genPaymentId();
    const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000).toISOString();

    // Sinh QR VietQR sandbox (dùng vietqr.io API công khai, không cần key)
    // Bank: VIETCOMBANK, account: 1234567890, amount in VND
    const bankBin = '970436';       // Vietcombank BIN
    const accountNo = '9876543210';
    const accountName = 'LUXSTAY HOTEL';
    const addInfo = `Dat phong ${orderId}`;
    const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${numAmount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

    // Lưu trạng thái
    paymentStore.set(paymentId, {
      status: 'pending',
      orderId,
      amount: numAmount,
      method: 'QRCode',
      wallet: null,
      expiresAt,
      createdAt: Date.now(),
    });

    // Tự động expire sau QR_EXPIRY_SECONDS
    setTimeout(() => {
      const entry = paymentStore.get(paymentId);
      if (entry && entry.status === 'pending') {
        paymentStore.set(paymentId, { ...entry, status: 'expired' });
      }
    }, QR_EXPIRY_SECONDS * 1000);

    res.json({
      success: true,
      data: { paymentId, qrImageUrl, expiresAt },
    });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// GET /api/payments/:paymentId/status
// Polling trạng thái payment
// Response: { status: "pending" | "success" | "failed" | "expired" }
// ══════════════════════════════════════════════════════════════
const getPaymentStatus = async (req, res, next) => {
  try {
    const { paymentId } = req.params;
    const entry = paymentStore.get(paymentId);

    if (!entry) {
      // Fallback: check database
      const dbPayment = await Payment.findOne({ where: { transaction_ref: paymentId } });
      if (!dbPayment) throw createError('Không tìm thấy giao dịch', 404);
      return res.json({ success: true, data: { status: dbPayment.status.toLowerCase() } });
    }

    res.json({ success: true, data: { status: entry.status, amount: entry.amount, orderId: entry.orderId } });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// POST /api/payments/wallet
// Tạo deep link ví điện tử (MoMo / ZaloPay sandbox)
// Request: { orderId, amount, wallet: "momo"|"zalopay" }
// Response: { paymentId, deeplink, webFallbackUrl }
// ══════════════════════════════════════════════════════════════
const createWalletPayment = async (req, res, next) => {
  try {
    const { orderId, amount, wallet } = req.body;
    if (!orderId || !amount || !wallet) throw createError('orderId, amount, và wallet là bắt buộc', 400);
    if (!['momo', 'zalopay'].includes(wallet)) throw createError('wallet phải là momo hoặc zalopay', 400);

    const numAmount = Number(amount);
    const paymentId = genPaymentId();
    const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000).toISOString();

    // Sinh deep link và web fallback theo spec payment-flow-config.json
    let deeplink, webFallbackUrl;
    if (wallet === 'momo') {
      deeplink = `momo://payment?serviceId=luxstay&orderId=${orderId}&amount=${numAmount}&paymentCode=${paymentId}&description=${encodeURIComponent('Dat phong LuxStay')}`;
      webFallbackUrl = `https://payment.momo.vn/pay?partnerCode=LUXSTAY&orderId=${orderId}&amount=${numAmount}&orderInfo=${encodeURIComponent('Dat phong LuxStay')}&returnUrl=${encodeURIComponent('http://localhost:3002/payment-result')}&paymentId=${paymentId}`;
    } else {
      deeplink = `zalopay://payment?appId=2553&orderId=${orderId}&amount=${numAmount}&description=${encodeURIComponent('Dat phong LuxStay')}`;
      webFallbackUrl = `https://zalopay.vn/pay?appId=2553&orderId=${orderId}&amount=${numAmount}&description=${encodeURIComponent('Dat phong LuxStay')}&returnUrl=${encodeURIComponent('http://localhost:3002/payment-result')}`;
    }

    paymentStore.set(paymentId, {
      status: 'redirecting',
      orderId,
      amount: numAmount,
      method: wallet === 'momo' ? 'Momo' : 'VNPay',
      wallet,
      expiresAt,
      createdAt: Date.now(),
    });

    // Tự động expire
    setTimeout(() => {
      const entry = paymentStore.get(paymentId);
      if (entry && ['redirecting', 'pending'].includes(entry.status)) {
        paymentStore.set(paymentId, { ...entry, status: 'expired' });
      }
    }, QR_EXPIRY_SECONDS * 1000);

    res.json({
      success: true,
      data: { paymentId, deeplink, webFallbackUrl, expiresAt },
    });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// POST /api/payments/webhook
// Nhận xác nhận thanh toán từ cổng/ví (server-to-server)
// Đây là nguồn xác nhận chính thức duy nhất theo spec
// Request: { paymentId, status, signature }
// ══════════════════════════════════════════════════════════════
const paymentWebhook = async (req, res, next) => {
  try {
    const { paymentId, status, signature, orderId, amount } = req.body;

    // Verify signature HMAC (production: dùng key từ cổng thanh toán thực)
    const payload = `${paymentId}:${status}:${orderId || ''}:${amount || ''}`;
    const expectedSig = crypto.createHmac('sha256', WEBHOOK_SECRET).update(payload).digest('hex');

    // Trong sandbox: bỏ qua verify signature (chấp nhận mọi request)
    // Production: throw 401 nếu signature không khớp
    const isSandbox = process.env.NODE_ENV !== 'production';
    if (!isSandbox && signature !== expectedSig) {
      throw createError('Invalid webhook signature', 401);
    }

    if (!['success', 'failed'].includes(status)) {
      throw createError('status phải là success hoặc failed', 400);
    }

    // Cập nhật paymentStore
    const entry = paymentStore.get(paymentId);
    if (entry) {
      paymentStore.set(paymentId, { ...entry, status });
    }

    // Ghi vào database nếu success
    if (status === 'success') {
      const storeEntry = entry || { orderId, amount: Number(amount) };
      try {
        // Tìm booking từ orderId (format: "BK{id}" hoặc trực tiếp id)
        const bookingId = parseInt(String(storeEntry.orderId).replace(/\D/g, '')) || null;
        if (bookingId) {
          const invoice = await ensureInvoice(bookingId, storeEntry.amount);
          await Payment.create({
            invoice_id: invoice.id,
            hotel_branch_id: 1,
            amount: storeEntry.amount,
            payment_method: storeEntry.method || 'QRCode',
            transaction_ref: paymentId,
            status: 'Success',
            notes: `Webhook confirmed - ${storeEntry.wallet || 'QR'}`,
          });
          await invoice.update({ status: 'Paid' });

          // Thông báo
          await Notification.create({
            type: 'Payment',
            hotel_branch_id: 1,
            title: 'Thanh toán thành công',
            message: `Booking #${bookingId} đã được thanh toán ${storeEntry.amount?.toLocaleString('vi-VN')} VNĐ qua ${storeEntry.method}`,
            related_id: invoice.id,
            related_type: 'invoice',
          });
        }
      } catch (dbErr) {
        console.error('Webhook DB write error:', dbErr.message);
        // Không throw - vẫn trả 200 cho cổng thanh toán
      }
    }

    res.json({ success: true, message: 'Webhook received' });
  } catch (err) { next(err); }
};

// ══════════════════════════════════════════════════════════════
// POST /api/payments/sandbox-confirm
// Endpoint sandbox để simulate webhook thành công (dev only)
// ══════════════════════════════════════════════════════════════
const sandboxConfirm = async (req, res, next) => {
  try {
    if (process.env.NODE_ENV === 'production') {
      throw createError('Sandbox endpoint disabled in production', 403);
    }
    const { paymentId } = req.body;
    if (!paymentId) throw createError('paymentId required', 400);

    const entry = paymentStore.get(paymentId);
    if (!entry) throw createError('paymentId not found', 404);

    paymentStore.set(paymentId, { ...entry, status: 'success' });

    // Ghi DB
    const bookingId = parseInt(String(entry.orderId).replace(/\D/g, '')) || null;
    if (bookingId) {
      try {
        const invoice = await ensureInvoice(bookingId, entry.amount);
        const existing = await Payment.findOne({ where: { transaction_ref: paymentId } });
        if (!existing) {
          await Payment.create({
            invoice_id: invoice.id,
            hotel_branch_id: 1,
            amount: entry.amount,
            payment_method: entry.method || 'QRCode',
            transaction_ref: paymentId,
            status: 'Success',
            notes: 'Sandbox confirmation',
          });
          await invoice.update({ status: 'Paid' });
        }
      } catch (e) { console.error('Sandbox DB:', e.message); }
    }

    res.json({ success: true, message: 'Sandbox: payment marked as success', data: { paymentId, status: 'success' } });
  } catch (err) { next(err); }
};

module.exports = {
  createQrPayment,
  getPaymentStatus,
  createWalletPayment,
  paymentWebhook,
  sandboxConfirm,
};
