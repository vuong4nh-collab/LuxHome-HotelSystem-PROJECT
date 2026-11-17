ALTER TABLE bookings
  ADD COLUMN booking_code VARCHAR(20) NULL AFTER room_id,
  ADD COLUMN booker_name VARCHAR(100) NULL AFTER booking_code,
  ADD COLUMN booker_email VARCHAR(100) NULL AFTER booker_name,
  ADD COLUMN booker_phone VARCHAR(20) NULL AFTER booker_email,
  ADD COLUMN guest_name VARCHAR(100) NULL AFTER booker_phone,
  ADD COLUMN guest_email VARCHAR(100) NULL AFTER guest_name,
  ADD COLUMN policy_snapshot JSON NULL AFTER special_requests,
  ADD COLUMN paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0 AFTER room_price_total;

UPDATE bookings
SET booking_code = CONCAT('BK', LPAD(id, 8, '0'))
WHERE booking_code IS NULL OR booking_code = '';

ALTER TABLE bookings
  MODIFY booking_code VARCHAR(20) NOT NULL,
  ADD UNIQUE KEY uq_bookings_booking_code (booking_code);

CREATE TABLE IF NOT EXISTS booking_qr_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  token_hash CHAR(64) NOT NULL UNIQUE,
  valid_from DATETIME NOT NULL,
  valid_until DATETIME NOT NULL,
  used_at DATETIME NULL,
  INDEX idx_booking_qr_booking (booking_id),
  CONSTRAINT fk_booking_qr_tokens_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS stay_registrations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  booking_id INT NOT NULL,
  booking_room_id INT NULL,
  full_name VARCHAR(100) NOT NULL,
  nationality VARCHAR(80) NULL,
  doc_type ENUM('CCCD','PASSPORT','OTHER') NOT NULL DEFAULT 'CCCD',
  doc_number_enc TEXT NOT NULL,
  doc_number_idx VARCHAR(128) NULL,
  exception_reason TEXT NULL,
  registered_by INT NOT NULL,
  registered_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_stay_reg_booking (booking_id),
  INDEX idx_stay_reg_doc_idx (doc_number_idx),
  CONSTRAINT fk_stay_registrations_booking FOREIGN KEY (booking_id) REFERENCES bookings(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS audit_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL,
  action VARCHAR(100) NOT NULL,
  entity_type VARCHAR(50) NULL,
  entity_id INT NULL,
  old_values JSON NULL,
  new_values JSON NULL,
  ip_address VARCHAR(45) NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_audit_logs_entity (entity_type, entity_id),
  INDEX idx_audit_logs_actor (user_id)
);
