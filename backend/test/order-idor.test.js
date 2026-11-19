'use strict';
/**
 * test/order-idor.test.js
 * AUD-008: IDOR protection — Orders / Cancel / Pay
 * Verifies that Customer role can only access their own orders.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { getOrderById, cancelOrder, payOrder, getAllOrders } = require('../src/modules/orders/orders.controller');
const { sequelize, Order, Customer, Booking, TourBooking, CarRentalBooking, TourSchedule, Room, Payment } = require('../src/models');

// ─── helpers ───────────────────────────────────────────────────────────────
const makeRes = () => {
  const r = { _status: 200, _body: undefined };
  r.status = (s) => { r._status = s; return r; };
  r.json = (b) => { r._body = b; };
  return r;
};

const makeTransaction = (originals) => {
  const t = {
    LOCK: { UPDATE: 'UPDATE' },
    finished: false,
    async commit() { this.finished = 'commit'; },
    async rollback() { this.finished = 'rollback'; },
  };
  originals.transaction = sequelize.transaction;
  sequelize.transaction = async () => t;
  return t;
};

// ─── getAllOrders: Customer sees only own orders ────────────────────────────
test('getAllOrders: Customer role is restricted to their own customer_id', async () => {
  const original = Customer.findOne;
  let capturedWhere;
  Customer.findOne = async ({ where }) => {
    capturedWhere = where;
    return { id: 42 };
  };

  const originalFindAll = Order.findAndCountAll;
  let queryWhere;
  Order.findAndCountAll = async ({ where }) => {
    queryWhere = where;
    return { count: 0, rows: [] };
  };

  try {
    const res = makeRes();
    await getAllOrders(
      {
        user: { id: 7, role: { name: 'Customer' } },
        query: {},
      },
      res,
      (err) => { throw err; }
    );

    assert.equal(queryWhere.customer_id, 42, 'query must be scoped to customer id');
    assert.equal(capturedWhere.user_id, 7, 'must look up customer by user_id');
  } finally {
    Customer.findOne = original;
    Order.findAndCountAll = originalFindAll;
  }
});

// ─── getOrderById: Customer blocked from other customer's order ────────────
test('getOrderById: Customer cannot view another customer\'s order (403)', async () => {
  const originals = {
    orderFindOne: Order.findOne,
    customerFindOne: Customer.findOne,
  };

  Order.findOne = async () => ({
    id: 10,
    customer_id: 999, // different customer
  });
  Customer.findOne = async () => ({ id: 42 }); // current user is customer 42

  try {
    let caughtError;
    await getOrderById(
      {
        params: { id: '10' },
        user: { id: 7, role: { name: 'Customer' } },
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError, 'should have thrown an error');
    assert.equal(caughtError.statusCode, 403);
  } finally {
    Order.findOne = originals.orderFindOne;
    Customer.findOne = originals.customerFindOne;
  }
});

// ─── getOrderById: Customer can view their own order ──────────────────────
test('getOrderById: Customer can view their own order (200)', async () => {
  const originals = {
    orderFindOne: Order.findOne,
    customerFindOne: Customer.findOne,
  };

  Order.findOne = async () => ({
    id: 10,
    customer_id: 42,
  });
  Customer.findOne = async () => ({ id: 42 });

  try {
    const res = makeRes();
    await getOrderById(
      {
        params: { id: '10' },
        user: { id: 7, role: { name: 'Customer' } },
      },
      res,
      (err) => { throw err; }
    );

    assert.equal(res._body.success, true);
    assert.equal(res._body.data.customer_id, 42);
  } finally {
    Order.findOne = originals.orderFindOne;
    Customer.findOne = originals.customerFindOne;
  }
});

// ─── cancelOrder: Customer blocked from cancelling another's order ─────────
test('cancelOrder: Customer cannot cancel another customer\'s order (403)', async () => {
  const originals = { transaction: null, orderFindOne: Order.findOne, customerFindOne: Customer.findOne };
  const t = makeTransaction(originals);

  Order.findOne = async () => ({
    id: 5,
    customer_id: 99, // not this customer
    order_status: 'PENDING',
    hotelBookings: [],
    tourBookings: [],
    carRentals: [],
    payments: [],
  });
  Customer.findOne = async () => ({ id: 42 });

  try {
    let caughtError;
    await cancelOrder(
      {
        params: { id: '5' },
        user: { id: 7, role: { name: 'Customer' } },
        body: {},
        headers: {},
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 403);
    assert.equal(t.finished, 'rollback');
  } finally {
    sequelize.transaction = originals.transaction;
    Order.findOne = originals.orderFindOne;
    Customer.findOne = originals.customerFindOne;
  }
});

// ─── cancelOrder: Already-cancelled order returns 400 ─────────────────────
test('cancelOrder: cancelling an already-cancelled order returns 400', async () => {
  const originals = { transaction: null, orderFindOne: Order.findOne };
  makeTransaction(originals);

  Order.findOne = async () => ({
    id: 6,
    customer_id: 42,
    order_status: 'CANCELLED',
    hotelBookings: [],
    tourBookings: [],
    carRentals: [],
    payments: [],
  });

  try {
    let caughtError;
    await cancelOrder(
      {
        params: { id: '6' },
        user: { id: 7, role: { name: 'Admin' } },
        body: {},
        headers: {},
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 400);
  } finally {
    sequelize.transaction = originals.transaction;
    Order.findOne = originals.orderFindOne;
  }
});

// ─── payOrder: Non-Cash method is rejected ────────────────────────────────
test('payOrder: staff cannot use non-Cash method via this endpoint (400)', async () => {
  const originals = { transaction: null };
  makeTransaction(originals);

  try {
    let caughtError;
    await payOrder(
      {
        params: { id: '1' },
        user: { id: 1, role: { name: 'Admin' } },
        body: { paymentMethod: 'BankTransfer' },
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 400);
  } finally {
    sequelize.transaction = originals.transaction;
  }
});

// ─── payOrder: Already-PAID order returns 409 ─────────────────────────────
test('payOrder: paying an already-paid order returns 409', async () => {
  const originals = { transaction: null, orderFindOne: Order.findOne };
  makeTransaction(originals);

  Order.findOne = async () => ({
    id: 7,
    payment_status: 'PAID',
    order_status: 'CONFIRMED',
    payments: [],
    hotelBookings: [],
  });

  try {
    let caughtError;
    await payOrder(
      {
        params: { id: '7' },
        user: { id: 1, role: { name: 'Admin' } },
        body: { paymentMethod: 'Cash' },
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 409);
  } finally {
    sequelize.transaction = originals.transaction;
    Order.findOne = originals.orderFindOne;
  }
});
