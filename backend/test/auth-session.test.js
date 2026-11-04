const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('node:crypto');
const jwt = require('jsonwebtoken');

const authController = require('../src/modules/auth/auth.controller');
const { AuthRefreshSession, User } = require('../src/models');

test('refresh rotates a database-backed refresh token and issues HttpOnly cookies', async () => {
  const originalSecret = process.env.JWT_SECRET;
  const originalFindOne = AuthRefreshSession.findOne;
  const originalUserFindByPk = User.findByPk;
  const refreshToken = 'current-refresh-token';
  const session = {
    id: 'session-id',
    user_id: 7,
    async update(values) {
      Object.assign(this, values);
    },
  };
  const cookies = [];
  let responseBody;
  process.env.JWT_SECRET = 'test-jwt-secret';
  AuthRefreshSession.findOne = async () => session;
  User.findByPk = async () => ({ id: 7, is_active: true });

  try {
    await authController.refresh(
      { headers: { cookie: `luxhome_refresh=${refreshToken}` } },
      {
        cookie(name, value, options) {
          cookies.push({ name, value, options });
        },
        json(body) {
          responseBody = body;
        },
      },
      (error) => {
        throw error;
      }
    );

    assert.equal(responseBody.success, true);
    assert.equal(cookies.length, 2);
    assert.ok(cookies.every((cookie) => cookie.options.httpOnly));
    assert.equal(session.token_hash, crypto.createHash('sha256')
      .update(cookies.find((cookie) => cookie.name === 'luxhome_refresh').value)
      .digest('hex'));
    const accessClaims = jwt.decode(cookies.find((cookie) => cookie.name === 'luxhome_access').value);
    assert.equal(accessClaims.sid, session.id);
    assert.equal(accessClaims.exp - accessClaims.iat, 30 * 60);
  } finally {
    if (originalSecret === undefined) delete process.env.JWT_SECRET;
    else process.env.JWT_SECRET = originalSecret;
    AuthRefreshSession.findOne = originalFindOne;
    User.findByPk = originalUserFindByPk;
  }
});

test('logout revokes the refresh token and clears both auth cookies', async () => {
  const originalUpdate = AuthRefreshSession.update;
  const refreshToken = 'refresh-token-to-revoke';
  let updateArgs;
  const clearedCookies = [];
  let responseBody;
  AuthRefreshSession.update = async (...args) => {
    updateArgs = args;
  };

  try {
    await authController.logout(
      { headers: { cookie: `luxhome_refresh=${refreshToken}` } },
      {
        clearCookie(name, options) {
          clearedCookies.push({ name, options });
        },
        json(body) {
          responseBody = body;
        },
      },
      (error) => {
        throw error;
      }
    );

    assert.equal(responseBody.success, true);
    assert.equal(updateArgs[0].revoked_at instanceof Date, true);
    assert.equal(updateArgs[1].where.token_hash, crypto.createHash('sha256').update(refreshToken).digest('hex'));
    assert.deepEqual(clearedCookies.map((cookie) => cookie.name), ['luxhome_access', 'luxhome_refresh']);
  } finally {
    AuthRefreshSession.update = originalUpdate;
  }
});
