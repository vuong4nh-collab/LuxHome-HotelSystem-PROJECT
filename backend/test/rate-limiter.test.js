'use strict';
/**
 * test/rate-limiter.test.js
 * AUD-011: In-memory sliding-window rate limiter
 * Verifies the rateLimit middleware factory and its enforcement logic.
 */

const test = require('node:test');
const assert = require('node:assert/strict');

const { rateLimit } = require('../src/middlewares/rateLimiter');

// ─── helpers ───────────────────────────────────────────────────────────────
/** Build a fake req with a given IP */
const makeReq = (ip = '127.0.0.1') => ({
  ip,
  socket: { remoteAddress: ip },
});

/** Build a fake res that captures status/json calls */
const makeRes = () => {
  const r = {};
  r._headers = {};
  r.setHeader = (k, v) => { r._headers[k] = v; };
  r.status = (s) => { r._status = s; return r; };
  r.json = (b) => { r._body = b; };
  return r;
};

// ─── rateLimit factory ───────────────────────────────────────────────────────

test('rateLimit: factory returns a middleware function', () => {
  const middleware = rateLimit({ windowMs: 1000, max: 5 });
  assert.equal(typeof middleware, 'function', 'should return a function');
  assert.equal(middleware.length, 3, 'middleware must accept (req, res, next)');
});

// ─── Under-limit traffic ─────────────────────────────────────────────────────

test('rateLimit: requests under the limit are passed through', () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 3, message: 'rate limited' });
  let nextCallCount = 0;
  const next = () => { nextCallCount++; };
  const req = makeReq('10.0.0.1');
  const res = makeRes();

  middleware(req, res, next);  // request 1 → passes
  middleware(req, res, next);  // request 2 → passes
  middleware(req, res, next);  // request 3 → passes (at limit, not over)

  assert.equal(nextCallCount, 3, 'next should be called 3 times (at limit)');
  assert.equal(res._status, undefined, 'should not send 429 response');
});

// ─── Over-limit traffic ──────────────────────────────────────────────────────

test('rateLimit: 4th request over max=3 returns 429', () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 3, message: 'rate limited' });
  let nextCallCount = 0;
  const next = () => { nextCallCount++; };
  const req = makeReq('10.0.0.2');
  const res = makeRes();

  middleware(req, res, next);  // 1
  middleware(req, res, next);  // 2
  middleware(req, res, next);  // 3 → at limit
  middleware(req, res, next);  // 4 → over limit

  assert.equal(nextCallCount, 3, 'next should only be called 3 times');
  assert.equal(res._status, 429, 'should return 429 on 4th request');
  assert.equal(res._body.success, false);
  assert.ok(res._body.message, 'should include a message');
  assert.ok(typeof res._body.retryAfterSeconds === 'number', 'should include retryAfterSeconds');
  assert.ok(res._headers['Retry-After'], 'should set Retry-After header');
});

// ─── Different IPs are tracked independently ─────────────────────────────────

test('rateLimit: different IPs have independent counters', () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 1, message: 'rate limited' });
  let nextCallCount = 0;
  const next = () => { nextCallCount++; };

  const req1 = makeReq('192.168.1.1');
  const req2 = makeReq('192.168.1.2');
  const res = makeRes();

  middleware(req1, res, next);  // IP1 req 1 → passes (at limit 1/1)
  middleware(req2, res, next);  // IP2 req 1 → passes (at limit 1/1, different IP)

  assert.equal(nextCallCount, 2, 'both IPs should get through for first request');
});

// ─── Retry-After header is set correctly ─────────────────────────────────────

test('rateLimit: Retry-After header value is a positive integer', () => {
  const middleware = rateLimit({ windowMs: 60_000, max: 1 });
  const req = makeReq('10.0.0.3');
  const res = makeRes();
  const next = () => {};

  middleware(req, res, next);  // passes
  middleware(req, res, next);  // blocked → sets Retry-After

  const retryAfter = Number(res._headers['Retry-After']);
  assert.ok(Number.isInteger(retryAfter) && retryAfter > 0, 'Retry-After should be a positive integer');
});
