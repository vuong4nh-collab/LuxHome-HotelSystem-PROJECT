import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  clearConciergeConversation,
  fetchConciergeHealth,
  getStoredConversationId,
  sendConciergeMessage,
  setStoredConversationId,
} from '../services/conciergeApi';

const WELCOME =
  'Xin chào! Em là LuxBot — trợ lý lễ tân ảo của LuxStay. Quý khách cần hỗ trợ về phòng, ăn uống, spa hay tham quan Đà Nẵng, cứ nhắn em nhé!';

const QUICK_PROMPTS = [
  'Giờ ăn sáng và nhà hàng ở đâu?',
  'Lấy mật khẩu WiFi thế nào?',
  'Đặt xe đón sân bay được không?',
];

function formatTime(iso) {
  try {
    return new Date(iso).toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });
  } catch {
    return '';
  }
}

export default function ConciergeChat({
  bookingContext,
  onSuggestedAction,
  open: openProp,
  onOpenChange,
}) {
  const [openInternal, setOpenInternal] = useState(false);
  const open = openProp !== undefined ? openProp : openInternal;
  const setOpen = onOpenChange || setOpenInternal;
  const [messages, setMessages] = useState([
    { id: 'welcome', role: 'assistant', text: WELCOME, at: new Date().toISOString() },
  ]);
  const [input, setInput] = useState('');
  const [suggestedActions, setSuggestedActions] = useState([]);
  const [conversationId, setConversationId] = useState(() => getStoredConversationId());
  const [sending, setSending] = useState(false);
  const [aiStatus, setAiStatus] = useState('unknown');
  const listRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    fetchConciergeHealth()
      .then((h) => setAiStatus(h?.geminiKeyConfigured ? 'ready' : 'offline'))
      .catch(() => setAiStatus('offline'));
  }, []);

  useEffect(() => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [messages, sending, open]);

  useEffect(() => {
    if (open) inputRef.current?.focus();
  }, [open]);

  const sendMessage = useCallback(
    async (text) => {
      const trimmed = text.trim();
      if (!trimmed || sending) return;

      const userMsg = {
        id: `u-${Date.now()}`,
        role: 'user',
        text: trimmed,
        at: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, userMsg]);
      setInput('');
      setSuggestedActions([]);
      setSending(true);

      try {
        const result = await sendConciergeMessage({
          message: trimmed,
          conversationId: conversationId || undefined,
          bookingContext: bookingContext || undefined,
        });
        setConversationId(result.conversationId);
        setStoredConversationId(result.conversationId);
        setMessages((prev) => [
          ...prev,
          {
            id: `a-${Date.now()}`,
            role: 'assistant',
            text: result.reply,
            at: result.timestamp || new Date().toISOString(),
          },
        ]);
        setSuggestedActions(result.suggestedActions || []);
      } catch (err) {
        const fallback =
          err.response?.data?.message ||
          err.message ||
          'Trợ lý ảo tạm thời không phản hồi. Vui lòng gọi hotline 1800-588-879.';
        setMessages((prev) => [
          ...prev,
          {
            id: `e-${Date.now()}`,
            role: 'assistant',
            text: fallback,
            at: new Date().toISOString(),
            error: true,
          },
        ]);
      } finally {
        setSending(false);
      }
    },
    [bookingContext, conversationId, sending]
  );

  const handleSubmit = (e) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleReset = async () => {
    if (conversationId) {
      try {
        await clearConciergeConversation(conversationId);
      } catch {
        setStoredConversationId(null);
      }
    }
    setConversationId(null);
    setSuggestedActions([]);
    setMessages([
      { id: 'welcome', role: 'assistant', text: WELCOME, at: new Date().toISOString() },
    ]);
  };

  const handleActionClick = (action) => {
    if (onSuggestedAction) onSuggestedAction(action);
    if (action.action === 'CALL_RECEPTION') {
      window.location.href = 'tel:1800588879';
    }
    if (action.action === 'GET_WIFI_PASSWORD') {
      sendMessage('Cho tôi biết cách lấy mật khẩu WiFi tại LuxStay');
    }
  };

  return (
    <>
      {!open && (
        <div className="concierge-fab-anchor">
          <button
            type="button"
            className="concierge-fab"
            onClick={() => setOpen(true)}
            aria-label="Mở trợ lý LuxBot"
          >
            <span className="concierge-fab-icon">💬</span>
            <span className="concierge-fab-label">LuxBot</span>
          </button>
        </div>
      )}

      {open && (
        <div className="concierge-panel" role="dialog" aria-label="LuxStay AI Concierge">
          <header className="concierge-header">
            <div>
              <div className="concierge-title">
                <span>🤖</span> LuxBot Concierge
              </div>
              <div className="concierge-subtitle">
                {aiStatus === 'ready' ? 'Trực tuyến 24/7' : 'Chế độ hạn chế — kiểm tra API key'}
              </div>
            </div>
            <div className="concierge-header-actions">
              <button type="button" className="concierge-icon-btn" onClick={handleReset} title="Cuộc trò chuyện mới">
                ↺
              </button>
              <button type="button" className="concierge-icon-btn" onClick={() => setOpen(false)} aria-label="Đóng">
                ✕
              </button>
            </div>
          </header>

          <div className="concierge-messages" ref={listRef}>
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`concierge-bubble-wrap ${msg.role === 'user' ? 'is-user' : 'is-bot'}`}
              >
                <div className={`concierge-bubble ${msg.error ? 'is-error' : ''}`}>{msg.text}</div>
                <span className="concierge-time">{formatTime(msg.at)}</span>
              </div>
            ))}
            {sending && (
              <div className="concierge-bubble-wrap is-bot">
                <div className="concierge-bubble concierge-typing">
                  <span />
                  <span />
                  <span />
                </div>
              </div>
            )}
          </div>

          {suggestedActions.length > 0 && (
            <div className="concierge-actions">
              {suggestedActions.map((act) => (
                <button
                  key={act.action}
                  type="button"
                  className="concierge-action-chip"
                  onClick={() => handleActionClick(act)}
                >
                  {act.label}
                </button>
              ))}
            </div>
          )}

          <div className="concierge-quick">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                className="concierge-quick-chip"
                disabled={sending}
                onClick={() => sendMessage(q)}
              >
                {q}
              </button>
            ))}
          </div>

          <form className="concierge-input-row" onSubmit={handleSubmit}>
            <input
              ref={inputRef}
              type="text"
              className="concierge-input"
              placeholder="Nhắn tin cho LuxBot..."
              value={input}
              maxLength={2000}
              disabled={sending}
              onChange={(e) => setInput(e.target.value)}
            />
            <button type="submit" className="concierge-send" disabled={sending || !input.trim()}>
              Gửi
            </button>
          </form>
        </div>
      )}
    </>
  );
}
