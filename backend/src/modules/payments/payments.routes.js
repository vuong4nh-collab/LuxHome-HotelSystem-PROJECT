const express = require('express');
const router = express.Router();
const ctrl = require('./payments.controller');
const { optionalAuth } = require('../../middlewares/auth');

// ── Public / Webhook endpoints (không cần auth) ───────────────
// Webhook từ cổng thanh toán gọi thẳng, không có JWT
router.post('/webhook', ctrl.paymentWebhook);

// Sandbox simulate (dev only)
router.post('/sandbox-confirm', ctrl.sandboxConfirm);

// ── Payment creation & status endpoints (hỗ trợ cả khách vãng lai & thành viên) ──
router.use(optionalAuth);

// Tạo QR VietQR / NAPAS 247
router.post('/qr', ctrl.createQrPayment);

// Tạo deep link ví điện tử (MoMo / ZaloPay)
router.post('/wallet', ctrl.createWalletPayment);

// Poll trạng thái giao dịch
router.get('/:paymentId/status', ctrl.getPaymentStatus);

module.exports = router;
