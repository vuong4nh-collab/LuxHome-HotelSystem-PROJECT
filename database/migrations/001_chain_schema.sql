-- Apply this migration to an existing hotel_management database volume.
-- The Docker init scripts only run when the MySQL volume is created.

USE hotel_management;

SET FOREIGN_KEY_CHECKS = 0;

CREATE TABLE IF NOT EXISTS hotel_chains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    country VARCHAR(60) DEFAULT 'Vietnam',
    headquarters_city VARCHAR(80),
    status ENUM('Active','Inactive','Pending') DEFAULT 'Active',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS hotels (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_chain_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    city VARCHAR(80) NOT NULL,
    region VARCHAR(60),
    country VARCHAR(60) DEFAULT 'Vietnam',
    address VARCHAR(255),
    phone VARCHAR(30),
    email VARCHAR(120),
    star_rating INT DEFAULT 4,
    status ENUM('Active','Inactive','Maintenance') DEFAULT 'Active',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_chain_id) REFERENCES hotel_chains(id)
);

CREATE TABLE IF NOT EXISTS hotel_branches (
    id INT AUTO_INCREMENT PRIMARY KEY,
    hotel_id INT NOT NULL,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    city VARCHAR(80) NOT NULL,
    region VARCHAR(60),
    country VARCHAR(60) DEFAULT 'Vietnam',
    address VARCHAR(255),
    phone VARCHAR(30),
    email VARCHAR(120),
    timezone VARCHAR(50) DEFAULT 'Asia/Ho_Chi_Minh',
    status ENUM('Active','Inactive','Closed') DEFAULT 'Active',
    latitude DECIMAL(9,6),
    longitude DECIMAL(9,6),
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

INSERT IGNORE INTO hotel_chains (id, name, code, country, headquarters_city, status, description)
VALUES (1, 'LuxStay Group', 'LXST', 'Vietnam', 'Ha Noi', 'Active', 'LuxStay hotel chain');

INSERT IGNORE INTO hotels (id, hotel_chain_id, name, code, city, region, country, status)
VALUES
    (1, 1, 'LuxStay Hanoi', 'LXST-HN', 'Ha Noi', 'North', 'Vietnam', 'Active'),
    (2, 1, 'LuxStay Da Nang', 'LXST-DN', 'Da Nang', 'Central', 'Vietnam', 'Active'),
    (3, 1, 'LuxStay Ho Chi Minh', 'LXST-HCM', 'Ho Chi Minh City', 'South', 'Vietnam', 'Active');

INSERT IGNORE INTO hotel_branches (id, hotel_id, name, code, city, region, country, status)
VALUES
    (1, 1, 'LuxStay Hanoi Central', 'LXST-HN-01', 'Ha Noi', 'North', 'Vietnam', 'Active'),
    (2, 2, 'LuxStay Da Nang Beachfront', 'LXST-DN-01', 'Da Nang', 'Central', 'Vietnam', 'Active'),
    (3, 3, 'LuxStay Saigon Riverside', 'LXST-HCM-01', 'Ho Chi Minh City', 'South', 'Vietnam', 'Active');

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel_chains' AND COLUMN_NAME = 'updated_at') = 0,
    'ALTER TABLE hotel_chains ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotels' AND COLUMN_NAME = 'updated_at') = 0,
    'ALTER TABLE hotels ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotel_branches' AND COLUMN_NAME = 'updated_at') = 0,
    'ALTER TABLE hotel_branches ADD COLUMN updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

ALTER TABLE roles
    MODIFY COLUMN name ENUM('Admin','Manager','Receptionist','Housekeeping','Customer','ChainAdmin','AreaManager','PropertyManager') NOT NULL;

SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'users' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE users ADD COLUMN hotel_branch_id INT NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'rooms' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE rooms ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE bookings ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'service_orders' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE service_orders ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'housekeeping_tasks' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE housekeeping_tasks ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'invoices' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE invoices ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE payments ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'notifications' AND COLUMN_NAME = 'hotel_branch_id') = 0,
    'ALTER TABLE notifications ADD COLUMN hotel_branch_id INT NOT NULL DEFAULT 1', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

UPDATE rooms SET hotel_branch_id = 1 WHERE hotel_branch_id IS NULL;
UPDATE bookings b
JOIN rooms r ON r.id = b.room_id
SET b.hotel_branch_id = r.hotel_branch_id
WHERE b.hotel_branch_id IS NULL OR b.hotel_branch_id = 1;
UPDATE service_orders so
JOIN bookings b ON b.id = so.booking_id
SET so.hotel_branch_id = b.hotel_branch_id
WHERE so.hotel_branch_id IS NULL OR so.hotel_branch_id = 1;
UPDATE housekeeping_tasks ht
JOIN rooms r ON r.id = ht.room_id
SET ht.hotel_branch_id = r.hotel_branch_id
WHERE ht.hotel_branch_id IS NULL OR ht.hotel_branch_id = 1;
UPDATE invoices i
JOIN bookings b ON b.id = i.booking_id
SET i.hotel_branch_id = b.hotel_branch_id
WHERE i.hotel_branch_id IS NULL OR i.hotel_branch_id = 1;
UPDATE payments p
JOIN invoices i ON i.id = p.invoice_id
SET p.hotel_branch_id = i.hotel_branch_id
WHERE p.hotel_branch_id IS NULL OR p.hotel_branch_id = 1;
UPDATE notifications SET hotel_branch_id = 1 WHERE hotel_branch_id IS NULL;

SET FOREIGN_KEY_CHECKS = 1;