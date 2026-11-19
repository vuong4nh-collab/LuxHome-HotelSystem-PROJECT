'use strict';
/**
 * test/auth-validation-extended.test.js
 * AUD-024: Server-side input validation on POST /api/auth/register
 * Covers edge cases: name length, email format, password boundary, phone format,
 * duplicate email (409), and password exactly at max boundary (72 chars).
 */

// JWT_SECRET must be set before importing any module that uses it
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-jwt-secret-for-unit-tests';

const test = require('node:test');
const assert = require('node:assert/strict');

const { register } = require('../src/modules/auth/auth.controller');
const { User, Role, Customer, AuthRefreshSession } = require('../src/models');

// ─── helpers ───────────────────────────────────────────────────────────────
const makeRes = () => {
  const r = { _cookies: [] };
  r.status = (s) => { r._status = s; return r; };
  r.json = (b) => { r._body = b; };
  r.cookie = (name, val, opts) => { r._cookies.push({ name, val, opts }); };
  return r;
};

/** Minimal valid registration payload */
const validBody = () => ({
  full_name: 'Nguyen Van A',
  email: 'valid@example.com',
  phone: '0912345678',
  password: 'SecurePass1',
});

// ─── full_name validation ───────────────────────────────────────────────────

test('register: full_name shorter than 2 chars returns 400', async () => {
  let caughtError;
  await register(
    { body: { ...validBody(), full_name: 'A' } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError, 'should call next with error');
  assert.equal(caughtError.statusCode, 400);
});

test('register: full_name longer than 100 chars returns 400', async () => {
  let caughtError;
  await register(
    { body: { ...validBody(), full_name: 'A'.repeat(101) } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

// ─── email validation ───────────────────────────────────────────────────────

test('register: email without @ returns 400', async () => {
  let caughtError;
  await register(
    { body: { ...validBody(), email: 'notanemail' } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

test('register: email longer than 100 chars returns 400', async () => {
  const longEmail = 'a'.repeat(90) + '@example.com';  // 102 chars total
  let caughtError;
  await register(
    { body: { ...validBody(), email: longEmail } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

// ─── password validation ────────────────────────────────────────────────────

test('register: password shorter than 8 chars returns 400', async () => {
  let caughtError;
  await register(
    { body: { ...validBody(), password: 'short' } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

test('register: password longer than 72 chars (bcrypt boundary) returns 400', async () => {
  let caughtError;
  await register(
    { body: { ...validBody(), password: 'P'.repeat(73) } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

// ─── phone validation ───────────────────────────────────────────────────────

test('register: invalid phone format returns 400', async () => {
  let caughtError;
  await register(
    { body: { ...validBody(), phone: 'abc-not-a-phone' } },
    makeRes(),
    (err) => { caughtError = err; }
  );
  assert.ok(caughtError);
  assert.equal(caughtError.statusCode, 400);
});

// ─── duplicate email ────────────────────────────────────────────────────────

test('register: duplicate email returns 409', async () => {
  const originals = { findOne: User.findOne };
  // Simulate that email is already registered
  User.findOne = async () => ({ id: 99, email: 'valid@example.com' });

  try {
    let caughtError;
    await register(
      { body: validBody() },
      makeRes(),
      (err) => { caughtError = err; }
    );
    assert.ok(caughtError, 'should call next with error');
    assert.equal(caughtError.statusCode, 409);
  } finally {
    User.findOne = originals.findOne;
  }
});

// ─── valid registration succeeds ────────────────────────────────────────────

test('register: valid input with all fields creates user and returns 201', async () => {
  const originals = {
    userFindOne: User.findOne,
    roleFindOne: Role.findOne,
    userCreate: User.create,
    customerCreate: Customer.create,
    sessionCreate: AuthRefreshSession.create,
  };

  User.findOne = async () => null;  // email not taken
  Role.findOne = async () => ({ id: 2, name: 'Customer' });
  User.create = async (data) => ({ id: 101, ...data, full_name: data.full_name, email: data.email });
  Customer.create = async () => ({ id: 55 });
  AuthRefreshSession.create = async () => ({ id: 'session-uuid-1' });

  try {
    const res = makeRes();
    await register(
      { body: validBody() },
      res,
      (err) => { throw err; }
    );
    assert.equal(res._status, 201);
    assert.equal(res._body.success, true);
    assert.ok(res._body.data.user, 'response should include user data');
    assert.equal(res._body.data.user.email, 'valid@example.com');
    assert.ok(res._cookies.length >= 2, 'should set both access and refresh cookies');
  } finally {
    User.findOne = originals.userFindOne;
    Role.findOne = originals.roleFindOne;
    User.create = originals.userCreate;
    Customer.create = originals.customerCreate;
    AuthRefreshSession.create = originals.sessionCreate;
  }
});

// ─── password at exact 72-char boundary (valid) ─────────────────────────────

test('register: password exactly 72 chars is accepted (bcrypt boundary)', async () => {
  const originals = {
    userFindOne: User.findOne,
    roleFindOne: Role.findOne,
    userCreate: User.create,
    customerCreate: Customer.create,
    sessionCreate: AuthRefreshSession.create,
  };

  User.findOne = async () => null;
  Role.findOne = async () => ({ id: 2, name: 'Customer' });
  User.create = async (data) => ({ id: 102, ...data });
  Customer.create = async () => ({ id: 56 });
  AuthRefreshSession.create = async () => ({ id: 'session-uuid-2' });

  try {
    const res = makeRes();
    await register(
      { body: { ...validBody(), email: 'boundary72@example.com', password: 'P'.repeat(72) } },
      res,
      (err) => { throw err; }
    );
    assert.equal(res._status, 201);
    assert.equal(res._body.success, true);
  } finally {
    User.findOne = originals.userFindOne;
    Role.findOne = originals.roleFindOne;
    User.create = originals.userCreate;
    Customer.create = originals.customerCreate;
    AuthRefreshSession.create = originals.sessionCreate;
  }
});
