const express = require('express');
const router = express.Router();
const ctrl = require('./payments.controller');
const { optionalAuth, authenticate, authorize } = require('../../middlewares/auth');

// ── Public / Webhook endpoints (không cần auth) ───────────────
// Webhook từ cổng thanh toán gọi thẳng, kiểm tra HMAC signature bắt buộc
router.post('/webhook', ctrl.paymentWebhook);

// AUD-014: Enable sandbox only when explicitly opted in for development or tests.
if (process.env.NODE_ENV === 'test' ||
    (process.env.NODE_ENV === 'development' && process.env.ENABLE_PAYMENT_SANDBOX === 'true')) {
  router.post('/sandbox-confirm', authenticate, authorize('Admin', 'Manager'), ctrl.sandboxConfirm);
}

// ── Payment creation & status endpoints (hỗ trợ cả khách vãng lai & thành viên) ──
router.use(optionalAuth);

// Tạo QR VietQR / NAPAS 247
router.post('/qr', ctrl.createQrPayment);

// Tạo deep link ví điện tử (MoMo / ZaloPay)
router.post('/wallet', ctrl.createWalletPayment);

// Poll trạng thái giao dịch
router.get('/:paymentId/status', ctrl.getPaymentStatus);

module.exports = router;
