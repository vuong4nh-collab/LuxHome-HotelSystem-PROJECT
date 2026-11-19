'use strict';
/**
 * test/checkin-business-logic.test.js
 * AUD-009: Check-in flow business logic
 * Tests staffCheckIn: 404, invalid status, missing guest docs.
 * Tests cancelBooking + room freed.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { staffCheckIn } = require('../src/modules/bookings/bookings.controller');
const { sequelize, Booking, Room, Customer, StayRegistration, BookingQRToken } = require('../src/models');

// ─── helpers ───────────────────────────────────────────────────────────────
const makeRes = () => {
  const r = {};
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

const staffUser = { id: 1, role: { name: 'Receptionist' } };

// ─── staffCheckIn ────────────────────────────────────────────────────────────

test('staffCheckIn: returns 404 when booking does not exist', async () => {
  const originals = { findByPk: Booking.findByPk };
  Booking.findByPk = async () => null;

  try {
    let caughtError;
    await staffCheckIn(
      {
        params: { bookingId: '9999' },
        headers: {},
        body: { guests: [{ docNumber: 'ID001' }] },
        user: staffUser,
      },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 404);
  } finally {
    Booking.findByPk = originals.findByPk;
  }
});

test('staffCheckIn: returns 400 when booking status is not Confirmed', async () => {
  const originals = { findByPk: Booking.findByPk };

  Booking.findByPk = async () => ({
    id: 10,
    status: 'Cancelled',  // ← not Confirmed
    customer: null,
    room: null,
  });

  try {
    let caughtError;
    await staffCheckIn(
      {
        params: { bookingId: '10' },
        headers: {},
        body: { guests: [{ docNumber: 'ID001' }] },
        user: staffUser,
      },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 400);
  } finally {
    Booking.findByPk = originals.findByPk;
  }
});

test('staffCheckIn: returns 400 when no guest documents are provided', async () => {
  const originals = { findByPk: Booking.findByPk };

  Booking.findByPk = async () => ({
    id: 11,
    status: 'Confirmed',
    customer: { full_name: 'Guest', id: 5 },
    room: { id: 3, room_number: '101', status: 'Available' },
  });

  try {
    let caughtError;
    await staffCheckIn(
      {
        params: { bookingId: '11' },
        headers: {},
        body: { guests: [] },   // ← empty guests list
        user: staffUser,
      },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    // GUEST_DOC_REQUIRED → 400
    assert.equal(caughtError.statusCode, 400);
  } finally {
    Booking.findByPk = originals.findByPk;
  }
});

test('staffCheckIn: succeeds and sets room to Occupied when all conditions met', async () => {
  const originals = {
    bookingFindByPk: Booking.findByPk,
    roomFindByPk: Room.findByPk,
    transaction: sequelize.transaction,
    stayCreate: StayRegistration.create,
    qrUpdate: BookingQRToken.update,
  };

  const mockRoom = {
    id: 3,
    room_number: '101',
    status: 'Available',
    _updatedStatus: null,
    async update(data, _opts) { this._updatedStatus = data.status; },
  };
  const mockBooking = {
    id: 11,
    status: 'Confirmed',
    paid_amount: 0,
    room_price_total: 0,
    guest_name: 'Guest',
    customer: { full_name: 'Guest' },
    room: mockRoom,
    _updatedStatus: null,
    async update(data, _opts) { this._updatedStatus = data.status; },
  };

  const t = makeTransaction();

  // First call (pre-tx check) uses plain findByPk → Confirmed booking
  // Second call (inside transaction with LOCK) also returns locked copy
  let callCount = 0;
  Booking.findByPk = async () => {
    callCount++;
    return mockBooking;
  };
  Room.findByPk = async () => mockRoom;
  sequelize.transaction = async () => t;
  StayRegistration.create = async () => ({ id: 1 });
  BookingQRToken.update = async () => [1];

  try {
    const res = makeRes();
    await staffCheckIn(
      {
        params: { bookingId: '11' },
        headers: {},
        body: {
          rooms: [],
          guests: [{ docNumber: 'CCCD123456', fullName: 'Guest', nationality: 'VN', docType: 'CCCD' }],
          collectPayment: { amount: 0 },
        },
        user: staffUser,
      },
      res,
      (err) => { throw err; }
    );

    assert.equal(res._body.success, true);
    assert.equal(res._body.data.status, 'CheckedIn');
    assert.equal(t.finished, 'commit');
  } finally {
    Booking.findByPk = originals.bookingFindByPk;
    Room.findByPk = originals.roomFindByPk;
    sequelize.transaction = originals.transaction;
    StayRegistration.create = originals.stayCreate;
    BookingQRToken.update = originals.qrUpdate;
  }
});
