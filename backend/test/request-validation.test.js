const test = require('node:test');
const assert = require('node:assert/strict');

const authController = require('../src/modules/auth/auth.controller');
const { checkout } = require('../src/modules/orders/orders.controller');
const { sequelize, CheckoutIdempotency, Customer } = require('../src/models');

test('registration rejects malformed email and weak password before database access', async () => {
  const cases = [
    { full_name: 'Test User', email: 'not-an-email', password: 'strongpass' },
    { full_name: 'Test User', email: 'user@example.com', password: 'short' },
  ];

  for (const body of cases) {
    let error;
    await authController.register({ body }, {}, (nextError) => {
      error = nextError;
    });

    assert.equal(error.statusCode, 400);
  }
});

test('checkout rejects impossible calendar dates and rolls back before inventory lookup', async () => {
  const originals = {
    transaction: sequelize.transaction,
    findOrCreate: CheckoutIdempotency.findOrCreate,
    customerFindOne: Customer.findOne,
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
  sequelize.transaction = async () => transaction;
  CheckoutIdempotency.findOrCreate = async () => [{
    request_hash: '',
    response_json: null,
    async update() {},
    async destroy() {},
  }, true];
  Customer.findOne = async () => ({ id: 5 });

  try {
    let error;
    await checkout(
      {
        headers: { 'idempotency-key': 'invalid-date-test' },
        user: { id: 7, email: 'user@example.com', full_name: 'Test User' },
        body: {
          hotelBooking: {
            roomId: 1,
            checkIn: '2026-02-30',
            checkOut: '2026-03-02',
          },
          customerInfo: {
            fullName: 'Test User',
            email: 'user@example.com',
            phone: '0912345678',
          },
        },
      },
      { status() { return this; }, json() {} },
      (nextError) => {
        error = nextError;
      }
    );

    assert.equal(error.statusCode, 400);
    assert.equal(transaction.finished, 'rollback');
  } finally {
    sequelize.transaction = originals.transaction;
    CheckoutIdempotency.findOrCreate = originals.findOrCreate;
    Customer.findOne = originals.customerFindOne;
  }
});
