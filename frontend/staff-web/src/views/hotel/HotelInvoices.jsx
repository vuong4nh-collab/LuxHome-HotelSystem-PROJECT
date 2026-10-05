import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchInvoices,
  fetchInvoiceById,
  processPayment,
} from '../../services/bookingService';

const STATUS_LABEL = {
  Draft: 'Nháp',
  Issued: 'Đã xuất',
  Paid: 'Đã thanh toán',
  Cancelled: 'Đã huỷ',
  Overdue: 'Quá hạn',
};

const STATUS_CLASS = {
  Draft: 'pending',
  Issued: 'confirmed',
  Paid: 'checkedin',
  Cancelled: 'cancelled',
  Overdue: 'noshow',
};

const PAYMENT_METHODS = [
  { value: 'Cash', label: 'Tiền mặt' },
  { value: 'Card', label: 'Thẻ tín dụng / ghi nợ' },
  { value: 'BankTransfer', label: 'Chuyển khoản ngân hàng' },
  { value: 'QR', label: 'QR Code' },
];

const formatMoney = (val) =>
  (parseFloat(val) || 0).toLocaleString('vi-VN') + ' đ';

export default function HotelInvoices() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [statusFilter, setStatusFilter] = useState('');

  // Detail modal
  const [detailModal, setDetailModal] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);

  // Payment modal
  const [payModal, setPayModal] = useState(null); // invoice object
  const [payMethod, setPayMethod] = useState('Cash');
  const [payRef, setPayRef] = useState('');
  const [payLoading, setPayLoading] = useState(false);

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      const res = await fetchInvoices(params);
      setInvoices(res.data || []);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể tải danh sách hóa đơn');
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  // ─── Mở chi tiết ────────────────────────────
  const openDetail = async (invoice) => {
    setDetailModal(null);
    setDetailLoading(true);
    try {
      const res = await fetchInvoiceById(invoice.id);
      setDetailModal(res.data);
    } catch (err) {
      alert(err.response?.data?.message || 'Không thể tải chi tiết hóa đơn');
    } finally {
      setDetailLoading(false);
    }
  };

  // ─── Thanh toán ─────────────────────────────
  const openPayModal = (invoice) => {
    setPayModal(invoice);
    setPayMethod('Cash');
    setPayRef('');
  };

  const handlePay = async () => {
    if (!payModal) return;
    setPayLoading(true);
    try {
      await processPayment(payModal.id, {
        amount: payModal.total_amount,
        payment_method: payMethod,
        transaction_ref: payRef,
      });
      setPayModal(null);
      await loadInvoices();
    } catch (err) {
      alert(err.response?.data?.message || 'Thanh toán thất bại');
    } finally {
      setPayLoading(false);
    }
  };

  const getCustomerName = (inv) =>
    inv.booking?.customer?.full_name || inv.customer?.full_name || '—';

  return (
    <div className="tab-invoices">
      <div className="page-header flex-between">
        <div>
          <h2>Hóa Đơn & Báo Cáo Tài Chính</h2>
          <p>Lịch sử thanh toán và thống kê chi tiết</p>
        </div>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <select
            className="form-control"
            style={{ width: 'auto', minWidth: '160px' }}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="">Tất cả trạng thái</option>
            {Object.entries(STATUS_LABEL).map(([val, label]) => (
              <option key={val} value={val}>{label}</option>
            ))}
          </select>
          <button className="btn btn-outline" onClick={loadInvoices} disabled={loading}>
            ↻ Làm mới
          </button>
        </div>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <div className="panel">
        <h3>Danh Sách Hóa Đơn</h3>

        {loading ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            ⏳ Đang tải dữ liệu...
          </div>
        ) : invoices.length === 0 ? (
          <div className="text-center" style={{ padding: '40px', color: 'var(--text-muted)' }}>
            Không có hóa đơn nào{statusFilter ? ` với trạng thái "${STATUS_LABEL[statusFilter]}"` : ''}.
          </div>
        ) : (
          <table className="custom-table">
            <thead>
              <tr>
                <th>Số HĐ</th>
                <th>Mã Booking</th>
                <th>Khách Hàng</th>
                <th>Tiền Phòng</th>
                <th>Dịch Vụ</th>
                <th>Tổng Tiền</th>
                <th>Trạng Thái</th>
                <th>Ngày Xuất</th>
                <th>Thao Tác</th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((inv) => (
                <tr key={inv.id}>
                  <td><strong>{inv.invoice_number}</strong></td>
                  <td>{inv.booking_id || inv.booking?.id || '—'}</td>
                  <td>{getCustomerName(inv)}</td>
                  <td>{formatMoney(inv.room_charge)}</td>
                  <td>{formatMoney(inv.service_charge)}</td>
                  <td><strong>{formatMoney(inv.total_amount)}</strong></td>
                  <td>
                    <span className={`status-badge ${STATUS_CLASS[inv.status] || ''}`}>
                      {STATUS_LABEL[inv.status] || inv.status}
                    </span>
                  </td>
                  <td>{inv.issued_at ? new Date(inv.issued_at).toLocaleDateString('vi-VN') : '—'}</td>
                  <td style={{ display: 'flex', gap: '4px' }}>
                    <button
                      className="btn btn-sm btn-outline"
                      disabled={detailLoading}
                      onClick={() => openDetail(inv)}
                    >
                      Xem Chi Tiết
                    </button>
                    {['Issued', 'Draft'].includes(inv.status) && (
                      <button
                        className="btn btn-sm btn-primary"
                        style={{ backgroundColor: '#2eb85c', borderColor: '#2eb85c', color: '#fff' }}
                        onClick={() => openPayModal(inv)}
                      >
                        Thanh Toán
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* ─── MODAL: CHI TIẾT HÓA ĐƠN ─── */}
      {(detailLoading || detailModal) && (
        <div className="modal-backdrop">
          <div className="modal-content modal-lg">
            <div className="modal-header">
              <h3>Chi Tiết Hóa Đơn{detailModal ? ` — ${detailModal.invoice_number}` : ''}</h3>
              <button type="button" className="btn-close" onClick={() => setDetailModal(null)}>✕</button>
            </div>

            {detailLoading ? (
              <div className="modal-body text-center" style={{ padding: '40px' }}>⏳ Đang tải...</div>
            ) : detailModal && (
              <div className="modal-body">
                <div className="invoice-header text-center">
                  <h2>👑 LuxStay Hotel & Resorts</h2>
                  <p>123 Trần Phú, Quận 1, TP. Hồ Chí Minh | Hotline: 1900 8888</p>
                  <hr className="divider" />
                  <h3>HÓA ĐƠN GIAO DỊCH</h3>
                  <p>Số HĐ: <strong>{detailModal.invoice_number}</strong></p>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', margin: '16px 0' }}>
                  <div>
                    <p><strong>Khách hàng:</strong> {getCustomerName(detailModal)}</p>
                    <p><strong>Booking:</strong> #{detailModal.booking_id}</p>
                  </div>
                  <div>
                    <p><strong>Ngày nhận:</strong> {detailModal.booking?.checkin_date || '—'}</p>
                    <p><strong>Ngày trả:</strong> {detailModal.booking?.checkout_date || '—'}</p>
                  </div>
                </div>

                {/* Items */}
                {detailModal.items?.length > 0 && (
                  <div style={{ marginBottom: '16px' }}>
                    <h4>Dịch Vụ</h4>
                    <table className="custom-table">
                      <thead>
                        <tr><th>Tên dịch vụ</th><th>SL</th><th>Đơn giá</th><th>Thành tiền</th></tr>
                      </thead>
                      <tbody>
                        {detailModal.items.map((item, i) => (
                          <tr key={i}>
                            <td>{item.description || item.service_name}</td>
                            <td>{item.quantity}</td>
                            <td>{formatMoney(item.unit_price)}</td>
                            <td>{formatMoney(item.subtotal)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}

                <div className="invoice-summary" style={{ background: 'var(--bg-secondary, #f8f9fa)', padding: '16px', borderRadius: '8px' }}>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Tiền phòng:</span><strong>{formatMoney(detailModal.room_charge)}</strong>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Dịch vụ:</span><strong>{formatMoney(detailModal.service_charge)}</strong>
                  </p>
                  {parseFloat(detailModal.extra_fee) > 0 && (
                    <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span>Phụ phí:</span><strong>{formatMoney(detailModal.extra_fee)}</strong>
                    </p>
                  )}
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>Giảm giá:</span><strong>- {formatMoney(detailModal.discount_amount)}</strong>
                  </p>
                  <p style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>VAT (10%):</span><strong>{formatMoney(detailModal.tax_amount)}</strong>
                  </p>
                  <hr />
                  <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: 'var(--primary, #321fdb)' }}>
                    <span>Tổng thanh toán:</span>
                    <span>{formatMoney(detailModal.total_amount)}</span>
                  </p>
                </div>

                {/* Lịch sử thanh toán */}
                {detailModal.payments?.length > 0 && (
                  <div style={{ marginTop: '16px' }}>
                    <h4>Lịch Sử Thanh Toán</h4>
                    {detailModal.payments.map((p, i) => (
                      <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                        <span>{p.payment_method} — {p.transaction_ref || '—'}</span>
                        <strong>{formatMoney(p.amount)}</strong>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setDetailModal(null)}>Đóng</button>
              {detailModal && ['Issued', 'Draft'].includes(detailModal.status) && (
                <button
                  type="button"
                  className="btn btn-primary"
                  style={{ backgroundColor: '#2eb85c', borderColor: '#2eb85c', color: '#fff' }}
                  onClick={() => { setDetailModal(null); openPayModal(detailModal); }}
                >
                  Thanh Toán Ngay
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL: THANH TOÁN ─── */}
      {payModal && (
        <div className="modal-backdrop">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Thanh Toán — {payModal.invoice_number}</h3>
              <button type="button" className="btn-close" onClick={() => setPayModal(null)}>✕</button>
            </div>
            <div className="modal-body">
              <div className="invoice-summary" style={{ background: 'var(--bg-secondary, #f8f9fa)', padding: '16px', borderRadius: '8px', marginBottom: '16px' }}>
                <p style={{ display: 'flex', justifyContent: 'space-between', fontSize: '18px', fontWeight: 'bold', color: 'var(--primary, #321fdb)' }}>
                  <span>Số tiền cần thu:</span>
                  <span>{formatMoney(payModal.total_amount)}</span>
                </p>
              </div>

              <div className="form-group">
                <label>Phương thức thanh toán</label>
                <select
                  className="form-control"
                  value={payMethod}
                  onChange={(e) => setPayMethod(e.target.value)}
                >
                  {PAYMENT_METHODS.map((m) => (
                    <option key={m.value} value={m.value}>{m.label}</option>
                  ))}
                </select>
              </div>
              <div className="form-group">
                <label>Mã giao dịch / tham chiếu (tuỳ chọn)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="VD: TXN20261005XXXX"
                  value={payRef}
                  onChange={(e) => setPayRef(e.target.value)}
                />
              </div>
            </div>
            <div className="modal-footer">
              <button type="button" className="btn btn-outline" onClick={() => setPayModal(null)}>Huỷ</button>
              <button
                type="button"
                className="btn btn-primary"
                style={{ backgroundColor: '#2eb85c', borderColor: '#2eb85c', color: '#fff' }}
                disabled={payLoading}
                onClick={handlePay}
              >
                {payLoading ? '⏳ Đang xử lý...' : 'Xác Nhận Thanh Toán ✓'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
