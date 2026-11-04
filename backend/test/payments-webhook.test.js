const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { paymentWebhook } = require('../src/modules/payments/payments.controller');
const { sequelize, Payment } = require('../src/models');

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
