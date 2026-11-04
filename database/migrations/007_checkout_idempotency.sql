CREATE TABLE IF NOT EXISTS checkout_idempotency (
  idempotency_key VARCHAR(128) NOT NULL PRIMARY KEY,
  request_hash CHAR(64) NOT NULL,
  response_json JSON NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  KEY idx_checkout_idempotency_expires_at (expires_at)
);
