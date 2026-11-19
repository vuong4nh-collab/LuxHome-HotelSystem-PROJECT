'use strict';
/**
 * test/booking-idor.test.js
 * AUD-015: Insecure Direct Object Reference — GET /api/bookings/:id & DELETE /api/bookings/:id
 * Ensures a Customer can only view/cancel their OWN booking.
 * Staff (Admin/Manager/Receptionist) can access any booking.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { getBookingById, cancelBooking } = require('../src/modules/bookings/bookings.controller');
const { Booking, Customer } = require('../src/models');

// ─── helpers ───────────────────────────────────────────────────────────────
const makeRes = () => {
  const r = {};
  r.status = (s) => { r._status = s; return r; };
  r.json = (b) => { r._body = b; };
  return r;
};

// Customer user: owns customer_id = 10, NOT customer_id = 20
const customerUser = { id: 5, role: { name: 'Customer' } };
const staffUser = { id: 1, role: { name: 'Receptionist' } };

// ─── getBookingById ─────────────────────────────────────────────────────────

test('getBookingById: Customer cannot view another customer\'s booking (403)', async () => {
  const originals = {
    findByPk: Booking.findByPk,
    findOne: Customer.findOne,
  };

  // Booking belongs to customer_id 20; logged-in customer is customer_id 10
  Booking.findByPk = async () => ({
    id: 99,
    customer_id: 20,
    customer: { id: 20, full_name: 'Other Guest' },
    room: null,
    invoice: null,
  });
  Customer.findOne = async () => ({ id: 10, user_id: 5 });

  try {
    let caughtError;
    await getBookingById(
      { params: { id: '99' }, user: customerUser },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 403);
  } finally {
    Booking.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});

test('getBookingById: Customer can view their own booking (200)', async () => {
  const originals = {
    findByPk: Booking.findByPk,
    findOne: Customer.findOne,
  };

  // Booking belongs to customer_id 10 — same as logged-in customer
  Booking.findByPk = async () => ({
    id: 42,
    customer_id: 10,
    customer: { id: 10, full_name: 'My Guest' },
    room: null,
    invoice: null,
  });
  Customer.findOne = async () => ({ id: 10, user_id: 5 });

  try {
    const res = makeRes();
    await getBookingById(
      { params: { id: '42' }, user: customerUser },
      res,
      (err) => { throw err; }
    );
    assert.equal(res._body.success, true);
    assert.equal(res._body.data.id, 42);
  } finally {
    Booking.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});

test('getBookingById: Staff can view any customer\'s booking (200)', async () => {
  const originals = { findByPk: Booking.findByPk };

  Booking.findByPk = async () => ({
    id: 99,
    customer_id: 20,
    customer: { id: 20 },
    room: null,
    invoice: null,
  });

  try {
    const res = makeRes();
    await getBookingById(
      { params: { id: '99' }, user: staffUser },
      res,
      (err) => { throw err; }
    );
    assert.equal(res._body.success, true);
  } finally {
    Booking.findByPk = originals.findByPk;
  }
});

test('getBookingById: returns 404 for non-existent booking', async () => {
  const originals = { findByPk: Booking.findByPk };
  Booking.findByPk = async () => null;

  try {
    let caughtError;
    await getBookingById(
      { params: { id: '9999' }, user: staffUser },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 404);
  } finally {
    Booking.findByPk = originals.findByPk;
  }
});

// ─── cancelBooking ──────────────────────────────────────────────────────────

test('cancelBooking: Customer cannot cancel another customer\'s booking (403)', async () => {
  const originals = {
    findByPk: Booking.findByPk,
    findOne: Customer.findOne,
  };

  Booking.findByPk = async () => ({
    id: 55,
    customer_id: 30,  // different customer
    status: 'Confirmed',
    room: null,
  });
  Customer.findOne = async () => ({ id: 10, user_id: 5 });

  try {
    let caughtError;
    await cancelBooking(
      { params: { id: '55' }, user: customerUser, body: {} },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 403);
  } finally {
    Booking.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});

test('cancelBooking: cannot cancel a booking that is already CheckedIn (400)', async () => {
  const originals = {
    findByPk: Booking.findByPk,
    findOne: Customer.findOne,
  };

  Booking.findByPk = async () => ({
    id: 56,
    customer_id: 10,  // own booking
    status: 'CheckedIn',  // ← cannot cancel
    room: null,
  });
  Customer.findOne = async () => ({ id: 10, user_id: 5 });

  try {
    let caughtError;
    await cancelBooking(
      { params: { id: '56' }, user: customerUser, body: {} },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 400);
  } finally {
    Booking.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});

test('cancelBooking: cannot cancel a booking that is already Cancelled (400)', async () => {
  const originals = {
    findByPk: Booking.findByPk,
    findOne: Customer.findOne,
  };

  Booking.findByPk = async () => ({
    id: 57,
    customer_id: 10,
    status: 'Cancelled',  // ← already cancelled
    room: null,
  });
  Customer.findOne = async () => ({ id: 10, user_id: 5 });

  try {
    let caughtError;
    await cancelBooking(
      { params: { id: '57' }, user: customerUser, body: {} },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 400);
  } finally {
    Booking.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});
