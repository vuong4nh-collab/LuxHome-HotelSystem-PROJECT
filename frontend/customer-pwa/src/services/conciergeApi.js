import api from '../api';

const CONVERSATION_STORAGE_KEY = 'luxstay_concierge_conversation_id';

export function getStoredConversationId() {
  return localStorage.getItem(CONVERSATION_STORAGE_KEY);
}

export function setStoredConversationId(id) {
  if (id) localStorage.setItem(CONVERSATION_STORAGE_KEY, id);
  else localStorage.removeItem(CONVERSATION_STORAGE_KEY);
}

/**
 * @param {{ message: string, conversationId?: string, bookingContext?: object }} payload
 */
export async function sendConciergeMessage(payload) {
  const { data } = await api.post('/ai/concierge/chat', payload, { timeout: 45000 });
  if (!data.success) {
    throw new Error(data.message || 'Không thể gửi tin nhắn.');
  }
  return data.data;
}

export async function clearConciergeConversation(conversationId) {
  if (!conversationId) return;
  await api.delete(`/ai/concierge/chat/${encodeURIComponent(conversationId)}`);
  setStoredConversationId(null);
}

export async function fetchConciergeHealth() {
  const { data } = await api.get('/ai/concierge/health');
  return data.data;
}
