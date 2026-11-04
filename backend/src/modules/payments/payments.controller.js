const crypto = require('crypto');
const { sequelize, Payment, Invoice, Booking, Order, Notification } = require('../../models');
const { createError } = require('../../middlewares/errorHandler');

const QR_EXPIRY_SECONDS = 300; // 5 phút theo config

// ── Helper: tạo paymentId unique ──────────────────────────────
const genPaymentId = () => `PAY-${Date.now()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`;
const isValidOrderIdentifier = (value) => {
  if (typeof value === 'number') return Number.isSafeInteger(value) && value > 0;
  return typeof value === 'string' && value.length <= 50 &&
    (/^ORD-[A-Z0-9-]+$/i.test(value) || /^(?:BK)?\d+$/.test(value));
};
const paymentMetadata = (orderId, expiresAt, wallet = null) =>
  JSON.stringify({ orderId: String(orderId), expiresAt, wallet });
const parsePaymentMetadata = (notes) => {
  try {
    return JSON.parse(notes || '{}');
  } catch {
    return {};
  }
};
const resolvePaymentTarget = async (orderId, amount) => {
  const identifier = String(orderId);
  let order = null;
  let booking = null;

  if (identifier.startsWith('ORD-')) {
    order = await Order.findOne({ where: { order_code: identifier } });
  } else if (/^\d+$/.test(identifier)) {
    order = await Order.findByPk(Number(identifier));
  }

  if (order) {
    booking = await Booking.findOne({ where: { order_id: order.id }, order: [['id', 'ASC']] });
    if (Number(order.final_amount) !== Number(amount)) {
      throw createError('Số tiền thanh toán không khớp với đơn hàng', 400);
    }
    return {
      orderDbId: order.id,
      invoiceId: null,
      branchId: booking?.hotel_branch_id || null,
    };
  }

  const bookingId = identifier.match(/^(?:BK)?(\d+)$/)?.[1];
  if (bookingId) booking = await Booking.findByPk(Number(bookingId));
  if (!booking) throw createError('Không tìm thấy đơn hàng hoặc đặt phòng', 404);
  if (Number(booking.room_price_total) !== Number(amount)) {
    throw createError('Số tiền thanh toán không khớp với đặt phòng', 400);
  }
  const invoice = await Invoice.findOne({ where: { booking_id: booking.id } });
  return {
    orderDbId: null,
    invoiceId: invoice?.id || null,
    branchId: booking.hotel_branch_id,
  };
};

// ── Tạo hóa đơn draft nếu chưa có (helper cho flow khách) ─────
const ensureInvoice = async (bookingId, amount, transaction) => {
  let invoice = await Invoice.findOne({ where: { booking_id: bookingId }, transaction });
  if (!invoice) {
    const booking = await Booking.findByPk(bookingId, { transaction });
    if (!booking) throw createError('Không tìm thấy đặt phòng', 404);
    if (!booking.hotel_branch_id) throw createError('Đặt phòng chưa có chi nhánh khách sạn', 422);
    invoice = await Invoice.create({
      booking_id: bookingId,
      hotel_branch_id: booking.hotel_branch_id,
      invoice_number: `INV-${Date.now()}`,
      customer_id: booking.customer_id,
      room_charge: amount,
      total_amount: amount,
      status: 'Issued',
      issued_at: new Date(),
    }, { transaction });
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
    if (!isValidOrderIdentifier(orderId) || !amount) {
      throw createError('orderId hoặc amount không hợp lệ', 400);
    }

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) throw createError('amount phải là số dương', 400);

    const paymentId = genPaymentId();
    const expiresAt = new Date(Date.now() + QR_EXPIRY_SECONDS * 1000).toISOString();

    // Sinh QR VietQR sandbox (dùng vietqr.io API công khai, không cần key)
    // Bank: VIETCOMBANK, account: 1234567890, amount in VND
    const bankBin = '970436';       // Vietcombank BIN
    const accountNo = '9876543210';
    const accountName = 'LUXSTAY HOTEL';
    const addInfo = `Dat phong ${orderId}`;
    const qrImageUrl = `https://img.vietqr.io/image/${bankBin}-${accountNo}-compact2.png?amount=${numAmount}&addInfo=${encodeURIComponent(addInfo)}&accountName=${encodeURIComponent(accountName)}`;

    const target = await resolvePaymentTarget(orderId, numAmount);
    await Payment.create({
      order_id: target.orderDbId,
      invoice_id: target.invoiceId,
      hotel_branch_id: target.branchId,
      amount: numAmount,
      payment_method: 'QRCode',
      transaction_ref: paymentId,
      status: 'Pending',
      notes: paymentMetadata(orderId, expiresAt),
    });

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
    const dbPayment = await Payment.findOne({ where: { transaction_ref: paymentId } });
    if (!dbPayment) throw createError('Không tìm thấy giao dịch', 404);
    const metadata = parsePaymentMetadata(dbPayment.notes);
    const isExpired = dbPayment.status === 'Pending' && metadata.expiresAt &&
      new Date(metadata.expiresAt).getTime() <= Date.now();
    res.json({
      success: true,
      data: {
        status: isExpired ? 'expired' : dbPayment.status.toLowerCase(),
        amount: Number(dbPayment.amount),
        orderId: metadata.orderId,
      },
    });
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
    if (!isValidOrderIdentifier(orderId) || !amount || !wallet) {
      throw createError('orderId, amount, và wallet là bắt buộc và phải hợp lệ', 400);
    }
    if (!['momo', 'zalopay'].includes(wallet)) throw createError('wallet phải là momo hoặc zalopay', 400);

    const numAmount = Number(amount);
    if (!Number.isFinite(numAmount) || numAmount <= 0) throw createError('amount phải là số dương', 400);
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

    const target = await resolvePaymentTarget(orderId, numAmount);
    await Payment.create({
      order_id: target.orderDbId,
      invoice_id: target.invoiceId,
      hotel_branch_id: target.branchId,
      amount: numAmount,
      payment_method: wallet === 'momo' ? 'Momo' : 'VNPay',
      transaction_ref: paymentId,
      status: 'Pending',
      notes: paymentMetadata(orderId, expiresAt, wallet),
    });

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

    // Verify signature HMAC — bắt buộc trong MỌI môi trường
    // Cổng thanh toán thực (MoMo/VNPay) phải gửi đúng HMAC-SHA256
    // Sandbox test: dùng đúng WEBHOOK_SECRET để ký request
    const webhookSecret = process.env.PAYMENT_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw createError('Payment webhook is not configured', 503);
    }

    const payload = `${paymentId}:${status}:${orderId || ''}:${amount || ''}`;
    const expectedSig = crypto.createHmac('sha256', webhookSecret).update(payload).digest('hex');
    const hasValidSignatureFormat = typeof signature === 'string' && /^[a-f\d]{64}$/i.test(signature);

    if (!hasValidSignatureFormat || !crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSig, 'hex'))) {
      throw createError('Invalid webhook signature', 401);
    }

    if (!['success', 'failed'].includes(status)) {
      throw createError('status phải là success hoặc failed', 400);
    }
    if (typeof paymentId !== 'string' || paymentId.length > 100 || !paymentId ||
        !isValidOrderIdentifier(orderId) || !Number.isFinite(Number(amount)) || Number(amount) <= 0) {
      throw createError('Thông tin giao dịch không hợp lệ', 400);
    }

    const transaction = await sequelize.transaction();
    try {
      const existingPayment = await Payment.findOne({
        where: { transaction_ref: paymentId },
        lock: transaction.LOCK.UPDATE,
        transaction,
      });
      if (!existingPayment) throw createError('Không tìm thấy giao dịch thanh toán', 404);

      const metadata = parsePaymentMetadata(existingPayment.notes);
      if (String(metadata.orderId || '') !== String(orderId) || Number(existingPayment.amount) !== Number(amount)) {
        throw createError('Thông tin giao dịch không khớp', 409);
      }
      if (metadata.expiresAt && new Date(metadata.expiresAt).getTime() <= Date.now() &&
          existingPayment.status === 'Pending') {
        throw createError('Giao dịch thanh toán đã hết hạn', 409);
      }
      if (existingPayment.status === (status === 'success' ? 'Success' : 'Failed')) {
        await transaction.commit();
        return res.json({ success: true, message: 'Webhook already processed' });
      }
      if (existingPayment.status !== 'Pending') throw createError('Giao dịch đã ở trạng thái kết thúc', 409);

      if (status === 'success') {
        let order = null;
        if (existingPayment.order_id) {
          order = await Order.findByPk(existingPayment.order_id, { transaction });
        }
        if (!order && String(orderId).startsWith('ORD-')) {
          order = await Order.findOne({ where: { order_code: orderId }, transaction });
        }
        if (order) {
          await order.update({ payment_status: 'PAID', order_status: 'CONFIRMED' }, { transaction });
        }

        const bookingMatch = String(orderId).match(/^(?:BK)?(\d+)$/);
        if (!order && bookingMatch) {
          const bookingId = Number(bookingMatch[1]);
          const booking = await Booking.findByPk(bookingId, { transaction });
          if (!booking) throw createError('Không tìm thấy đặt phòng', 404);
          const invoice = await ensureInvoice(bookingId, Number(amount), transaction);
          await invoice.update({ status: 'Paid' }, { transaction });
          await Notification.create({
            type: 'Payment',
            hotel_branch_id: booking.hotel_branch_id,
            title: 'Thanh toán thành công',
            message: `Booking #${bookingId} đã được thanh toán ${Number(amount).toLocaleString('vi-VN')} VNĐ`,
            related_id: invoice.id,
            related_type: 'invoice',
          }, { transaction });
          if (!existingPayment.invoice_id) {
            await existingPayment.update({ invoice_id: invoice.id }, { transaction });
          }
        }
      }

      await existingPayment.update({
        status: status === 'success' ? 'Success' : 'Failed',
        paid_at: status === 'success' ? new Date() : existingPayment.paid_at,
        notes: JSON.stringify({ ...metadata, webhookStatus: status }),
      }, { transaction });
      await transaction.commit();
    } catch (error) {
      if (!transaction.finished) await transaction.rollback();
      throw error;
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
    const sandboxEnabled = process.env.NODE_ENV === 'test' ||
      (process.env.NODE_ENV === 'development' && process.env.ENABLE_PAYMENT_SANDBOX === 'true');
    if (!sandboxEnabled) {
      throw createError('Sandbox endpoint disabled in production', 403);
    }
    const { paymentId } = req.body;
    if (typeof paymentId !== 'string' || paymentId.length > 100 || !paymentId) {
      throw createError('paymentId required', 400);
    }
    if (!process.env.PAYMENT_WEBHOOK_SECRET) {
      throw createError('Payment webhook is not configured', 503);
    }

    const payment = await Payment.findOne({ where: { transaction_ref: paymentId } });
    if (!payment) throw createError('paymentId not found', 404);
    if (payment.status !== 'Pending') throw createError('Giao dịch không ở trạng thái chờ thanh toán', 409);
    const metadata = parsePaymentMetadata(payment.notes);
    const orderId = metadata.orderId;
    const amount = Number(payment.amount);
    if (!isValidOrderIdentifier(orderId) || !Number.isFinite(amount) || amount <= 0) {
      throw createError('Thông tin giao dịch không hợp lệ', 409);
    }

    req.body = { paymentId, status: 'success', orderId, amount };
    const payload = `${paymentId}:success:${orderId}:${amount}`;
    req.body.signature = crypto.createHmac('sha256', process.env.PAYMENT_WEBHOOK_SECRET)
      .update(payload)
      .digest('hex');
    return paymentWebhook(req, res, next);
  } catch (err) { next(err); }
};

module.exports = {
  createQrPayment,
  getPaymentStatus,
  createWalletPayment,
  paymentWebhook,
  sandboxConfirm,
};
