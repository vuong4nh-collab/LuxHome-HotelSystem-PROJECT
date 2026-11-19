'use strict';
/**
 * test/customer-mass-assignment.test.js
 * AUD-010: Mass assignment protection on PUT /api/customers/:id
 * Verifies that Customer role cannot escalate loyalty_points, is_active, user_id.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { updateCustomer } = require('../src/modules/customers/customers.controller');
const { Customer } = require('../src/models');

// ─── helpers ───────────────────────────────────────────────────────────────
const makeRes = () => {
  const r = {};
  r.json = (b) => { r._body = b; };
  return r;
};

// ─── Customer cannot update loyalty_points ─────────────────────────────────
test('updateCustomer: Customer role cannot set loyalty_points (field is silently dropped)', async () => {
  const originals = { findByPk: Customer.findByPk, findOne: Customer.findOne };

  const updatedFields = {};
  const fakeCustomer = {
    id: 42,
    async update(data) { Object.assign(updatedFields, data); },
  };

  Customer.findByPk = async () => fakeCustomer;
  Customer.findOne = async () => fakeCustomer; // myProfile = same customer

  try {
    const res = makeRes();
    await updateCustomer(
      {
        params: { id: '42' },
        user: { id: 7, role: { name: 'Customer' } },
        body: {
          full_name: 'Nguyen Van A',
          loyalty_points: 999999,   // ← must be stripped
          is_active: false,          // ← must be stripped
          user_id: 1,                // ← must be stripped
        },
      },
      res,
      (err) => { throw err; }
    );

    assert.equal(res._body.success, true, 'update should succeed');
    assert.equal(updatedFields.full_name, 'Nguyen Van A', 'allowed field must pass');
    assert.equal(updatedFields.loyalty_points, undefined, 'loyalty_points must be stripped for Customer');
    assert.equal(updatedFields.is_active, undefined, 'is_active must be stripped for Customer');
    assert.equal(updatedFields.user_id, undefined, 'user_id must be stripped for Customer');
  } finally {
    Customer.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});

// ─── Staff can update loyalty_points ───────────────────────────────────────
test('updateCustomer: Staff (Manager) is allowed to update loyalty_points', async () => {
  const originals = { findByPk: Customer.findByPk };

  const updatedFields = {};
  const fakeCustomer = {
    id: 42,
    async update(data) { Object.assign(updatedFields, data); },
  };

  Customer.findByPk = async () => fakeCustomer;

  try {
    const res = makeRes();
    await updateCustomer(
      {
        params: { id: '42' },
        user: { id: 1, role: { name: 'Manager' } },
        body: {
          full_name: 'Nguyen Van B',
          loyalty_points: 500,
        },
      },
      res,
      (err) => { throw err; }
    );

    assert.equal(res._body.success, true);
    assert.equal(updatedFields.loyalty_points, 500, 'Staff should be allowed to update loyalty_points');
  } finally {
    Customer.findByPk = originals.findByPk;
  }
});

// ─── Customer cannot update another customer's profile (403) ───────────────
test('updateCustomer: Customer cannot update another customer\'s profile (403)', async () => {
  const originals = { findByPk: Customer.findByPk, findOne: Customer.findOne };

  Customer.findByPk = async () => ({ id: 99 }); // target customer
  Customer.findOne = async () => ({ id: 42 });   // my profile

  try {
    let caughtError;
    await updateCustomer(
      {
        params: { id: '99' },
        user: { id: 7, role: { name: 'Customer' } },
        body: { full_name: 'Hacker' },
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 403);
  } finally {
    Customer.findByPk = originals.findByPk;
    Customer.findOne = originals.findOne;
  }
});

// ─── 404 when customer not found ───────────────────────────────────────────
test('updateCustomer: returns 404 when customer does not exist', async () => {
  const originals = { findByPk: Customer.findByPk };
  Customer.findByPk = async () => null;

  try {
    let caughtError;
    await updateCustomer(
      {
        params: { id: '9999' },
        user: { id: 1, role: { name: 'Admin' } },
        body: { full_name: 'Ghost' },
      },
      makeRes(),
      (err) => { caughtError = err; }
    );

    assert.ok(caughtError);
    assert.equal(caughtError.statusCode, 404);
  } finally {
    Customer.findByPk = originals.findByPk;
  }
});
