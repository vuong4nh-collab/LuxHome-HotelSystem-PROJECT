const crypto = require('crypto');

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

function generateBookingCode(len = 10) {
  let out = '';
  for (let i = 0; i < len; i += 1) {
    out += ALPHABET[crypto.randomInt(ALPHABET.length)];
  }
  return out;
}

function hashQrToken(token) {
  return crypto.createHash('sha256').update(String(token)).digest('hex');
}

function generateQrToken() {
  return crypto.randomBytes(32).toString('base64url');
}

module.exports = {
  ALPHABET,
  generateBookingCode,
  hashQrToken,
  generateQrToken,
};
