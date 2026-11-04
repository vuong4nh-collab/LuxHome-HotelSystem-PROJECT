CREATE TABLE IF NOT EXISTS auth_refresh_sessions (
  id CHAR(36) NOT NULL PRIMARY KEY,
  user_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  expires_at DATETIME NOT NULL,
  revoked_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  KEY idx_auth_refresh_user (user_id),
  KEY idx_auth_refresh_expiry (expires_at),
  CONSTRAINT fk_auth_refresh_user
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);
