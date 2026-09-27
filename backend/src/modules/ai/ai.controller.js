const { v4: uuidv4 } = require('uuid');
const { chatWithConcierge, clearConversation } = require('./ai.service');

/**
 * POST /api/ai/concierge/chat
 * Nhận tin nhắn từ khách và trả lời thông qua AI Concierge.
 *
 * Body:
 *   - message        {string}  [Bắt buộc] Tin nhắn của khách
 *   - conversationId {string}  [Tùy chọn] ID phiên hội thoại. Nếu bỏ trống sẽ tạo mới.
 *   - bookingContext  {object}  [Tùy chọn] Thông tin đặt phòng để AI cá nhân hóa
 *       - guestName       {string}
 *       - roomNumber      {string}
 *       - roomType        {string}
 *       - checkinDate     {string}
 *       - checkoutDate    {string}
 *       - includesBreakfast {boolean}
 */
const conciergeChatHandler = async (req, res, next) => {
  try {
    const { message, conversationId: clientConvId, bookingContext } = req.body;

    // Validate: message là bắt buộc
    if (!message || typeof message !== 'string' || message.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Trường "message" là bắt buộc và không được để trống.',
      });
    }

    if (message.trim().length > 2000) {
      return res.status(400).json({
        success: false,
        message: 'Tin nhắn quá dài. Vui lòng giới hạn dưới 2000 ký tự.',
      });
    }

    // Dùng conversationId từ client nếu có, nếu không thì tạo mới
    const conversationId = clientConvId || uuidv4();

    const result = await chatWithConcierge({
      conversationId,
      message: message.trim(),
      guestContext: bookingContext || null,
    });

    return res.json({
      success: true,
      data: {
        conversationId: result.conversationId,
        reply: result.reply,
        suggestedActions: result.suggestedActions,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (err) {
    // Xử lý lỗi riêng từ Gemini API (quota, network, v.v.)
    if (err.message && err.message.includes('API_KEY')) {
      return res.status(503).json({
        success: false,
        message: 'Dịch vụ AI tạm thời không khả dụng. Vui lòng liên hệ quầy lễ tân.',
        error: 'GEMINI_KEY_ERROR',
      });
    }
    if (err.status === 429 || (err.message && err.message.includes('quota'))) {
      return res.status(503).json({
        success: false,
        message: 'Trợ lý ảo đang bận. Vui lòng thử lại sau 10 giây hoặc gọi hotline 1800-588-879.',
        error: 'QUOTA_EXCEEDED',
      });
    }
    next(err);
  }
};

/**
 * DELETE /api/ai/concierge/chat/:conversationId
 * Xóa lịch sử hội thoại (khi khách check-out hoặc bắt đầu lại).
 */
const clearChatHandler = (req, res) => {
  const { conversationId } = req.params;
  if (!conversationId) {
    return res.status(400).json({ success: false, message: 'conversationId là bắt buộc.' });
  }
  clearConversation(conversationId);
  return res.json({ success: true, message: 'Lịch sử hội thoại đã được xóa.' });
};

/**
 * GET /api/ai/concierge/health
 * Kiểm tra trạng thái kết nối Gemini API (dùng cho healthcheck / admin).
 */
const aiHealthHandler = async (req, res) => {
  const hasKey = !!process.env.GEMINI_API_KEY;
  return res.json({
    success: true,
    data: {
      module: 'AI Concierge',
      status: hasKey ? 'READY' : 'NOT_CONFIGURED',
      geminiKeyConfigured: hasKey,
      model: 'gemini-1.5-flash',
      timestamp: new Date().toISOString(),
    },
  });
};

module.exports = { conciergeChatHandler, clearChatHandler, aiHealthHandler };
