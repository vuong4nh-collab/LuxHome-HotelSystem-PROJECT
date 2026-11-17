const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { paymentWebhook, getPaymentStatus, confirmPaymentByStaff } = require('../src/modules/payments/payments.controller');
const { sequelize, Payment, Order, Booking, Invoice, Notification, AuditLog } = require('../src/models');

const runWebhook = async (body) => {
  const response = {
    json(payload) {
      this.payload = payload;
    },
  };
  let error;

  await paymentWebhook({ body }, response, (err) => {
    error = err;
  });

  return { response, error };
};

test('payment webhook rejects unsigned success callbacks in non-production', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  process.env.NODE_ENV = 'development';
  process.env.PAYMENT_WEBHOOK_SECRET = 'test-webhook-secret';

  try {
    const { error, response } = await runWebhook({
      paymentId: 'PAY-unsigned',
      status: 'success',
      orderId: 'ORD-1',
      amount: 100,
    });

    assert.equal(error.statusCode, 401);
    assert.equal(response.payload, undefined);
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
  }
});

test('payment webhook accepts a valid HMAC in non-production', async () => {
  const originalNodeEnv = process.env.NODE_ENV;
  const originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  const originalFindOne = Payment.findOne;
  const originalTransaction = sequelize.transaction;
  const secret = 'test-webhook-secret';
  const body = {
    paymentId: 'PAY-valid',
    status: 'failed',
    orderId: 'ORD-1',
    amount: 100,
  };
  const payload = `${body.paymentId}:${body.status}:${body.orderId}:${body.amount}`;
  body.signature = crypto.createHmac('sha256', secret).update(payload).digest('hex');
  const payment = {
    amount: 100,
    status: 'Pending',
    notes: JSON.stringify({ orderId: body.orderId, expiresAt: new Date(Date.now() + 60_000).toISOString() }),
    order_id: null,
    async update(values) {
      Object.assign(this, values);
    },
  };
  sequelize.transaction = async () => ({
    LOCK: { UPDATE: 'UPDATE' },
    finished: false,
    async commit() {
      this.finished = 'commit';
    },
    async rollback() {
      this.finished = 'rollback';
    },
  });
  Payment.findOne = async () => payment;
  process.env.NODE_ENV = 'development';
  process.env.PAYMENT_WEBHOOK_SECRET = secret;

  try {
    const { error, response } = await runWebhook(body);

    assert.equal(error, undefined);
    assert.deepEqual(response.payload, { success: true, message: 'Webhook received' });
  } finally {
    if (originalNodeEnv === undefined) delete process.env.NODE_ENV;
    else process.env.NODE_ENV = originalNodeEnv;
    if (originalSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
    Payment.findOne = originalFindOne;
    sequelize.transaction = originalTransaction;
  }
});

test('payment webhook fails closed when its secret is not configured', async () => {
  const originalSecret = process.env.PAYMENT_WEBHOOK_SECRET;
  delete process.env.PAYMENT_WEBHOOK_SECRET;

  try {
    const { error, response } = await runWebhook({
      paymentId: 'PAY-unconfigured',
      status: 'success',
      signature: 'a'.repeat(64),
    });

    assert.equal(error.statusCode, 503);
    assert.equal(response.payload, undefined);
  } finally {
    if (originalSecret === undefined) delete process.env.PAYMENT_WEBHOOK_SECRET;
    else process.env.PAYMENT_WEBHOOK_SECRET = originalSecret;
  }
});

test('staff can manually confirm QR payment without a bank reference', async () => {
  const originals = {
    transaction: sequelize.transaction,
    paymentFindOne: Payment.findOne,
    orderFindByPk: Order.findByPk,
    bookingFindByPk: Booking.findByPk,
    invoiceFindOne: Invoice.findOne,
    notificationCreate: Notification.create,
    auditCreate: AuditLog.create,
  };
  const transaction = {
    LOCK: { UPDATE: 'UPDATE' },
    finished: false,
    async commit() {
      this.finished = 'commit';
    },
    async rollback() {
      this.finished = 'rollback';
    },
  };
  const booking = {
    id: 18,
    hotel_branch_id: 1,
    paid_amount: 0,
    async update(values) {
      Object.assign(this, values);
    },
  };
  const invoice = {
    id: 29,
    async update(values) {
      Object.assign(this, values);
    },
  };
  const payment = {
    id: 41,
    invoice_id: invoice.id,
    order_id: null,
    amount: 2400000,
    status: 'Pending',
    notes: JSON.stringify({ orderId: 'BK18', expiresAt: new Date(Date.now() - 60_000).toISOString() }),
    async update(values) {
      Object.assign(this, values);
    },
  };
  let responseBody;
  let statusResponseBody;

  sequelize.transaction = async () => transaction;
  Payment.findOne = async () => payment;
  Order.findByPk = async () => null;
  Booking.findByPk = async () => booking;
  Invoice.findOne = async () => invoice;
  Notification.create = async () => ({});
  AuditLog.create = async () => ({});

  try {
    await confirmPaymentByStaff(
      { params: { paymentId: 'PAY-verified' }, body: {}, user: { id: 7 } },
      { json(payload) { responseBody = payload; } },
      (error) => { throw error; }
    );

    assert.equal(responseBody.success, true);
    assert.equal(responseBody.data.status, 'Success');
    assert.equal(payment.status, 'Success');
    assert.equal(payment.paid_at instanceof Date, true);
    assert.equal(booking.paid_amount, 2400000);
    assert.equal(invoice.status, 'Paid');
    assert.equal(transaction.finished, 'commit');
    assert.equal(JSON.parse(payment.notes).staffVerifiedBy, 7);
    assert.equal(JSON.parse(payment.notes).staffVerifiedAt.length > 0, true);
    assert.equal(JSON.parse(payment.notes).bankReference, undefined);

    await getPaymentStatus(
      { params: { paymentId: 'PAY-verified' } },
      { json(payload) { statusResponseBody = payload; } },
      (error) => { throw error; }
    );
    assert.equal(statusResponseBody.data.status, 'success');
    assert.equal(statusResponseBody.data.orderId, 'BK18');
  } finally {
    sequelize.transaction = originals.transaction;
    Payment.findOne = originals.paymentFindOne;
    Order.findByPk = originals.orderFindByPk;
    Booking.findByPk = originals.bookingFindByPk;
    Invoice.findOne = originals.invoiceFindOne;
    Notification.create = originals.notificationCreate;
    AuditLog.create = originals.auditCreate;
  }
});

test('payment status endpoint exposes a staff-confirmed transfer as success', async () => {
  const originalFindOne = Payment.findOne;
  Payment.findOne = async () => ({
    status: 'Success',
    payment_method: 'QRCode',
    amount: 2400000,
    notes: JSON.stringify({ orderId: 'BK20' }),
  });
  let responseBody;

  try {
    await getPaymentStatus(
      { params: { paymentId: 'PAY-confirmed' } },
      { json(payload) { responseBody = payload; } },
      (error) => { throw error; }
    );

    assert.equal(responseBody.data.status, 'success');
    assert.equal(responseBody.data.orderId, 'BK20');
  } finally {
    Payment.findOne = originalFindOne;
  }
});
