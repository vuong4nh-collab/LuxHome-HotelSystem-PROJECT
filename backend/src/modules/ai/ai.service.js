const { GoogleGenAI } = require('@google/genai');
const { CONCIERGE_SYSTEM_PROMPT } = require('./prompts/concierge.prompt');

// Khởi tạo Gemini client một lần duy nhất (Singleton)
const genAI = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// In-memory conversation store: { [conversationId]: history[] }
// Trong production, nên dùng Redis để scale ngang.
const conversationStore = new Map();

const MODEL_NAME = 'gemini-3.6-flash'; // Nhanh, rẻ, hỗ trợ tiếng Việt xuất sắc

/**
 * Lấy hoặc khởi tạo lịch sử hội thoại của một phòng/khách.
 * @param {string} conversationId - UUID phiên hội thoại
 * @returns {Array} Mảng lịch sử tin nhắn (định dạng Gemini)
 */
const getOrCreateHistory = (conversationId) => {
  if (!conversationStore.has(conversationId)) {
    conversationStore.set(conversationId, []);
  }
  return conversationStore.get(conversationId);
};

/**
 * Gửi tin nhắn đến AI Concierge và nhận phản hồi.
 * @param {object} params
 * @param {string} params.conversationId - ID phiên hội thoại (để duy trì ngữ cảnh)
 * @param {string} params.message - Tin nhắn từ khách
 * @param {object|null} params.guestContext - Ngữ cảnh khách hàng (tên, số phòng, booking...) nếu có
 * @returns {Promise<{reply: string, conversationId: string, suggestedActions: Array}>}
 */
const chatWithConcierge = async ({ conversationId, message, guestContext = null }) => {
  // Chuẩn bị system instruction với ngữ cảnh khách nếu có
  let systemInstruction = CONCIERGE_SYSTEM_PROMPT;
  if (guestContext) {
    systemInstruction += `\n\n## THÔNG TIN KHÁCH ĐANG CHAT\n`;
    if (guestContext.guestName) systemInstruction += `- Tên khách: ${guestContext.guestName}\n`;
    if (guestContext.roomNumber) systemInstruction += `- Số phòng: ${guestContext.roomNumber}\n`;
    if (guestContext.roomType) systemInstruction += `- Loại phòng: ${guestContext.roomType}\n`;
    if (guestContext.checkinDate) systemInstruction += `- Ngày check-in: ${guestContext.checkinDate}\n`;
    if (guestContext.checkoutDate) systemInstruction += `- Ngày check-out: ${guestContext.checkoutDate}\n`;
    if (guestContext.includesBreakfast !== undefined) {
      systemInstruction += `- Ăn sáng: ${guestContext.includesBreakfast ? 'ĐÃ BAO GỒM trong gói phòng' : 'KHÔNG bao gồm'}\n`;
    }
  }

  const history = getOrCreateHistory(conversationId);

  // Tạo chat session với Gemini, truyền toàn bộ lịch sử hội thoại
  const chat = genAI.chats.create({
    model: MODEL_NAME,
    config: {
      systemInstruction,
      temperature: 0.7,         // Hơi sáng tạo nhưng vẫn nhất quán
      maxOutputTokens: 512,     // Giới hạn độ dài phản hồi (đủ dùng, không lan man)
      topP: 0.9,
    },
    history,
  });

  // Gửi tin nhắn và nhận phản hồi
  const result = await chat.sendMessage({ message });
  const reply = result.text;

  // Cập nhật lịch sử vào store để duy trì ngữ cảnh cho lần nhắn tiếp theo
  history.push({ role: 'user', parts: [{ text: message }] });
  history.push({ role: 'model', parts: [{ text: reply }] });

  // Giới hạn lịch sử tối đa 20 lượt (10 cặp hỏi/đáp) để tránh vượt context window
  if (history.length > 40) {
    // Giữ lại 20 tin nhắn gần nhất
    conversationStore.set(conversationId, history.slice(-40));
  }

  // Gợi ý hành động nhanh dựa trên nội dung phản hồi (rule-based đơn giản)
  const suggestedActions = buildSuggestedActions(message, reply);

  return { reply, conversationId, suggestedActions };
};

/**
 * Xóa lịch sử hội thoại (khi khách bắt đầu phiên mới hoặc check-out)
 * @param {string} conversationId
 */
const clearConversation = (conversationId) => {
  conversationStore.delete(conversationId);
};

/**
 * Tạo danh sách gợi ý hành động nhanh dựa trên nội dung tin nhắn.
 * (Rule-based, không cần thêm AI call)
 * @param {string} userMessage
 * @param {string} aiReply
 * @returns {Array<{label: string, action: string}>}
 */
const buildSuggestedActions = (userMessage, aiReply) => {
  const lowerMsg = (userMessage + ' ' + aiReply).toLowerCase();
  const actions = [];

  if (lowerMsg.includes('ăn sáng') || lowerMsg.includes('nhà hàng') || lowerMsg.includes('menu') || lowerMsg.includes('breakfast')) {
    actions.push({ label: '🍳 Xem thực đơn nhà hàng', action: 'VIEW_RESTAURANT_MENU' });
  }
  if (lowerMsg.includes('dịch vụ') || lowerMsg.includes('gọi đồ') || lowerMsg.includes('room service') || lowerMsg.includes('đặt đồ')) {
    actions.push({ label: '🛎 Gọi dịch vụ phòng', action: 'ORDER_ROOM_SERVICE' });
  }
  if (lowerMsg.includes('spa') || lowerMsg.includes('massage') || lowerMsg.includes('đặt lịch')) {
    actions.push({ label: '💆 Đặt lịch Spa', action: 'BOOK_SPA' });
  }
  if (lowerMsg.includes('check-out') || lowerMsg.includes('trả phòng') || lowerMsg.includes('hóa đơn') || lowerMsg.includes('thanh toán')) {
    actions.push({ label: '🧾 Xem hóa đơn của tôi', action: 'VIEW_INVOICE' });
  }
  if (lowerMsg.includes('wifi') || lowerMsg.includes('mật khẩu')) {
    actions.push({ label: '📶 Lấy mật khẩu WiFi', action: 'GET_WIFI_PASSWORD' });
  }
  if (lowerMsg.includes('sân bay') || lowerMsg.includes('taxi') || lowerMsg.includes('xe') || lowerMsg.includes('transport')) {
    actions.push({ label: '🚕 Đặt xe đưa đón', action: 'BOOK_TRANSPORT' });
  }

  // Mặc định: luôn có nút liên hệ lễ tân
  if (actions.length === 0 || actions.length > 3) {
    actions.push({ label: '📞 Gọi quầy lễ tân', action: 'CALL_RECEPTION' });
  }

  return actions.slice(0, 3); // Tối đa 3 gợi ý để giao diện gọn
};

module.exports = { chatWithConcierge, clearConversation };
