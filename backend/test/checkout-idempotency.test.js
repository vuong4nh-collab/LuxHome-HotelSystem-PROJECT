'use strict';
/**
 * test/checkout-idempotency.test.js
 * AUD-005: Idempotency key — double-submit protection on POST /api/checkout
 * Verifies that a repeated Idempotency-Key returns the cached response and
 * that invalid/impossible booking dates are rejected early.
 */

const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');

const { checkout } = require('../src/modules/orders/orders.controller');
const { sequelize, CheckoutIdempotency, Customer } = require('../src/models');

// ─── helpers ───────────────────────────────────────────────────────────────
const makeRes = () => {
  const r = { _status: 201 };
  r.status = (s) => { r._status = s; return r; };
  r.json = (b) => { r._body = b; };
  return r;
};

const makeTransaction = () => ({
  LOCK: { UPDATE: 'UPDATE' },
  finished: false,
  async commit() { this.finished = 'commit'; },
  async rollback() { this.finished = 'rollback'; },
});

// ─── Missing Idempotency-Key returns 400 ───────────────────────────────────
test('checkout: missing Idempotency-Key header returns 400', async () => {
  let caughtError;
  await checkout(
    { headers: {}, body: {}, user: null },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

// ─── Invalid Idempotency-Key characters return 400 ────────────────────────
test('checkout: Idempotency-Key with invalid characters returns 400', async () => {
  let caughtError;
  await checkout(
    { headers: { 'idempotency-key': '../../etc/passwd' }, body: {}, user: null },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

// ─── Duplicate key returns cached response without re-processing ───────────
test('checkout: second request with same Idempotency-Key returns cached response (idempotent)', async () => {
  const originals = {
    transaction: sequelize.transaction,
    findOrCreate: CheckoutIdempotency.findOrCreate,
    customerFindOne: Customer.findOne,
  };

  const cachedResponse = {
    success: true,
    message: 'Đặt đơn hàng thành công',
    data: { order_code: 'ORD-20261119-CACHED' },
  };

  // Build the EXACT same requestHash the controller will compute for this req
  const reqUser = { id: 7, email: 'user@example.com', full_name: 'Test User', role: { name: 'Customer' } };
  const reqBody = {
    hotelBooking: { roomId: 1, checkIn: '2026-12-01', checkOut: '2026-12-03' },
    customerInfo: { fullName: 'Test User', email: 'user@example.com', phone: '0912345678' },
  };
  const correctHash = crypto.createHash('sha256')
    .update(JSON.stringify({ userId: reqUser.id, body: reqBody }))
    .digest('hex');

  const t = makeTransaction();
  sequelize.transaction = async () => t;
  CheckoutIdempotency.findOrCreate = async () => [
    {
      request_hash: correctHash,      // ← matches what controller computes
      response_json: cachedResponse,  // ← already has a finished response
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000), // not expired
      async update() {},
      async destroy() {},
    },
    false, // created = false → duplicate
  ];
  Customer.findOne = async () => ({ id: 5 });

  try {
    const res = makeRes();
    await checkout(
      { headers: { 'idempotency-key': 'duplicate-key-123' }, user: reqUser, body: reqBody },
      res,
      (err) => { throw err; }
    );

    assert.equal(res._body.data.order_code, 'ORD-20261119-CACHED', 'must return the cached order code');
    assert.equal(t.finished, 'rollback', 'transaction must be rolled back for idempotent replay');
  } finally {
    sequelize.transaction = originals.transaction;
    CheckoutIdempotency.findOrCreate = originals.findOrCreate;
    Customer.findOne = originals.customerFindOne;
  }
});

// ─── Conflicting key (same key, different body) returns 409 ───────────────
test('checkout: same Idempotency-Key with different body returns 409', async () => {
  const originals = {
    transaction: sequelize.transaction,
    findOrCreate: CheckoutIdempotency.findOrCreate,
  };

  const t = makeTransaction();
  sequelize.transaction = async () => t;
  // Stored hash is a fixed string; computed hash will differ because body differs
  CheckoutIdempotency.findOrCreate = async () => [
    {
      request_hash: 'old-hash-that-wont-match',
      response_json: null,
      expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000),
      async update() {},
      async destroy() {},
    },
    false, // created = false → duplicate
  ];

  try {
    let caughtError;
    await checkout(
      {
        headers: { 'idempotency-key': 'conflict-key' },
        user: { id: 1 },
        body: { hotelBooking: { roomId: 99, checkIn: '2027-01-01', checkOut: '2027-01-03' } },
      },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 409);
  } finally {
    sequelize.transaction = originals.transaction;
    CheckoutIdempotency.findOrCreate = originals.findOrCreate;
  }
});

// ─── Invalid DATEONLY (Feb 30) is rejected with 400 ───────────────────────
test('checkout: impossible date (Feb 30) is rejected with 400 and transaction rolled back', async () => {
  const originals = {
    transaction: sequelize.transaction,
    findOrCreate: CheckoutIdempotency.findOrCreate,
    customerFindOne: Customer.findOne,
  };

  const t = makeTransaction();
  sequelize.transaction = async () => t;
  CheckoutIdempotency.findOrCreate = async () => [
    { request_hash: '', response_json: null, async update() {}, async destroy() {} },
    true,
  ];
  Customer.findOne = async () => ({ id: 5 });

  try {
    let caughtError;
    await checkout(
      {
        headers: { 'idempotency-key': 'bad-date-key-feb30' },
        user: { id: 7, email: 'user@example.com', full_name: 'Test User', role: { name: 'Customer' } },
        body: {
          hotelBooking: { roomId: 1, checkIn: '2026-02-30', checkOut: '2026-03-02' },
          customerInfo: { fullName: 'Test', email: 'test@e.com', phone: '0900000000' },
        },
      },
      { status() { return this; }, json() {} },
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 400);
    assert.equal(t.finished, 'rollback');
  } finally {
    sequelize.transaction = originals.transaction;
    CheckoutIdempotency.findOrCreate = originals.findOrCreate;
    Customer.findOne = originals.customerFindOne;
  }
});

// ─── Empty order (no services) is rejected with 400 ──────────────────────
test('checkout: order with no services is rejected with 400 and transaction rolled back', async () => {
  const originals = {
    transaction: sequelize.transaction,
    findOrCreate: CheckoutIdempotency.findOrCreate,
    customerFindOne: Customer.findOne,
  };

  const t = makeTransaction();
  sequelize.transaction = async () => t;
  CheckoutIdempotency.findOrCreate = async () => [
    { request_hash: '', response_json: null, async update() {}, async destroy() {} },
    true,
  ];
  Customer.findOne = async () => ({ id: 5 });

  try {
    let caughtError;
    await checkout(
      {
        headers: { 'idempotency-key': 'empty-order-key-xyz' },
        user: { id: 7, email: 'user@example.com', full_name: 'Test User', role: { name: 'Customer' } },
        body: {
          hotelBookings: [],   // explicitly empty
          tourBookings: [],
          carRentals: [],
          customerInfo: { fullName: 'Test', email: 'test@e.com', phone: '0900000000' },
        },
      },
      { status() { return this; }, json() {} },
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 400);
    assert.equal(t.finished, 'rollback');
  } finally {
    sequelize.transaction = originals.transaction;
    CheckoutIdempotency.findOrCreate = originals.findOrCreate;
    Customer.findOne = originals.customerFindOne;
  }
});
