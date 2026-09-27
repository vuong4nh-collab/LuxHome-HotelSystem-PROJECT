const { Router } = require('express');
const { conciergeChatHandler, clearChatHandler, aiHealthHandler } = require('./ai.controller');

const router = Router();

/**
 * AI Concierge Chatbot Routes
 * Base path: /api/ai
 *
 * Các endpoint này được để PUBLIC (không yêu cầu JWT) để:
 * - Khách hàng chưa đăng nhập vẫn có thể hỏi thông tin chung về khách sạn.
 * - Customer PWA có thể nhúng chatbot trước khi đặt phòng.
 *
 * Nếu muốn bảo vệ endpoint, thêm middleware authenticate trước handler.
 */

// ── GET /api/ai/concierge/health ──────────────────────────────────────────────
// Kiểm tra trạng thái module AI (không yêu cầu xác thực)
router.get('/concierge/health', aiHealthHandler);

// ── POST /api/ai/concierge/chat ───────────────────────────────────────────────
// Gửi tin nhắn và nhận phản hồi từ AI Concierge
// Body: { message, conversationId?, bookingContext? }
router.post('/concierge/chat', conciergeChatHandler);

// ── DELETE /api/ai/concierge/chat/:conversationId ─────────────────────────────
// Xóa lịch sử hội thoại (reset phiên chat)
router.delete('/concierge/chat/:conversationId', clearChatHandler);

module.exports = router;
