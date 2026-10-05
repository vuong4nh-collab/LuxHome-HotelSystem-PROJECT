USE hotel_management;
SET NAMES utf8mb4;

CREATE TABLE IF NOT EXISTS cities (
  id INT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT,
  image VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS locations (
  id INT PRIMARY KEY,
  city_id INT NOT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(120) NOT NULL,
  description TEXT,
  image VARCHAR(255),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  UNIQUE KEY uq_locations_city_slug (city_id, slug),
  KEY idx_locations_city_id (city_id),
  CONSTRAINT fk_locations_city FOREIGN KEY (city_id) REFERENCES cities(id)
);

CREATE TABLE IF NOT EXISTS hotel_locations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  hotel_id INT NOT NULL,
  location_id INT NOT NULL,
  distance_km DECIMAL(6,2) NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_hotel_locations_pair (hotel_id, location_id),
  KEY idx_hotel_locations_location (location_id),
  CONSTRAINT fk_hotel_locations_hotel FOREIGN KEY (hotel_id) REFERENCES hotels(id) ON DELETE CASCADE,
  CONSTRAINT fk_hotel_locations_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE CASCADE
);

INSERT INTO cities (id, name, slug, description, is_active) VALUES
  (1, 'Phú Quốc', 'phu-quoc', 'Thành phố đảo với các khu nghỉ dưỡng và bãi biển.', TRUE),
  (2, 'Nha Trang', 'nha-trang', 'Thành phố biển thuộc tỉnh Khánh Hòa.', TRUE),
  (3, 'Đà Nẵng', 'da-nang', 'Thành phố biển miền Trung.', TRUE),
  (4, 'Hà Nội', 'ha-noi', 'Thủ đô Việt Nam.', TRUE),
  (5, 'TP.HCM', 'ho-chi-minh', 'Thành phố Hồ Chí Minh.', TRUE)
ON DUPLICATE KEY UPDATE name = VALUES(name), description = VALUES(description), is_active = TRUE;

INSERT INTO locations (id, city_id, name, slug, is_active) VALUES
  (1, 1, 'Bãi Dài', 'bai-dai', TRUE),
  (2, 1, 'Dương Đông', 'duong-dong', TRUE),
  (3, 1, 'Ông Lang', 'ong-lang', TRUE),
  (4, 1, 'Gành Dầu', 'ganh-dau', TRUE),
  (5, 1, 'An Thới', 'an-thoi', TRUE),
  (6, 2, 'Trung tâm Nha Trang', 'trung-tam-nha-trang', TRUE),
  (7, 2, 'Bãi biển Trần Phú', 'tran-phu', TRUE),
  (8, 2, 'Hòn Tre', 'hon-tre', TRUE),
  (9, 2, 'Vĩnh Hải', 'vinh-hai', TRUE),
  (10, 3, 'Mỹ Khê', 'my-khe', TRUE),
  (11, 3, 'An Thượng', 'an-thuong', TRUE),
  (12, 3, 'Sơn Trà', 'son-tra', TRUE),
  (13, 3, 'Bà Nà Hills', 'ba-na-hills', TRUE),
  (14, 4, 'Hoàn Kiếm', 'hoan-kiem', TRUE),
  (15, 4, 'Ba Đình', 'ba-dinh', TRUE),
  (16, 4, 'Tây Hồ', 'tay-ho', TRUE),
  (17, 4, 'Cầu Giấy', 'cau-giay', TRUE),
  (18, 5, 'Quận 1', 'quan-1', TRUE),
  (19, 5, 'Thảo Điền', 'thao-dien', TRUE),
  (20, 5, 'Phú Nhuận', 'phu-nhuan', TRUE),
  (21, 5, 'Quận 7', 'quan-7', TRUE)
ON DUPLICATE KEY UPDATE city_id = VALUES(city_id), name = VALUES(name), is_active = TRUE;

-- Add location fields to existing hotel rows without replacing their current city text.
SET @has_city_id = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotels' AND COLUMN_NAME = 'city_id');
SET @ddl = IF(@has_city_id = 0, 'ALTER TABLE hotels ADD COLUMN city_id INT NULL AFTER city', 'SELECT 1');
PREPARE migration_stmt FROM @ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_slug = (SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotels' AND COLUMN_NAME = 'slug');
SET @ddl = IF(@has_slug = 0, 'ALTER TABLE hotels ADD COLUMN slug VARCHAR(160) NULL AFTER name', 'SELECT 1');
PREPARE migration_stmt FROM @ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

UPDATE hotels h
JOIN cities c ON LOWER(TRIM(h.city)) = LOWER(TRIM(c.name))
SET h.city_id = c.id
WHERE h.city_id IS NULL;

UPDATE hotels SET slug = CONCAT('hotel-', id) WHERE slug IS NULL OR slug = '';

SET @has_city_index = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotels' AND INDEX_NAME = 'idx_hotels_city_id');
SET @ddl = IF(@has_city_index = 0, 'CREATE INDEX idx_hotels_city_id ON hotels(city_id)', 'SELECT 1');
PREPARE migration_stmt FROM @ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_slug_index = (SELECT COUNT(*) FROM information_schema.STATISTICS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'hotels' AND INDEX_NAME = 'uq_hotels_slug');
SET @ddl = IF(@has_slug_index = 0, 'CREATE UNIQUE INDEX uq_hotels_slug ON hotels(slug)', 'SELECT 1');
PREPARE migration_stmt FROM @ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

SET @has_city_fk = (SELECT COUNT(*) FROM information_schema.TABLE_CONSTRAINTS WHERE CONSTRAINT_SCHEMA = DATABASE() AND TABLE_NAME = 'hotels' AND CONSTRAINT_NAME = 'fk_hotels_city');
SET @ddl = IF(@has_city_fk = 0, 'ALTER TABLE hotels ADD CONSTRAINT fk_hotels_city FOREIGN KEY (city_id) REFERENCES cities(id)', 'SELECT 1');
PREPARE migration_stmt FROM @ddl;
EXECUTE migration_stmt;
DEALLOCATE PREPARE migration_stmt;

INSERT INTO hotel_chains (name, code, country, headquarters_city, status, description)
VALUES ('LuxHome', 'LXHOME', 'Vietnam', 'Hà Nội', 'Active', 'Chuỗi khách sạn LuxHome tại các điểm đến du lịch Việt Nam.')
ON DUPLICATE KEY UPDATE name = VALUES(name), status = 'Active';
SET @luxhome_chain_id = (SELECT id FROM hotel_chains WHERE code = 'LXHOME' LIMIT 1);

DROP TEMPORARY TABLE IF EXISTS luxhome_hotel_seed;
CREATE TEMPORARY TABLE luxhome_hotel_seed (
  hotel_id INT PRIMARY KEY,
  branch_id INT NOT NULL,
  room_id INT NOT NULL,
  city_id INT NOT NULL,
  location_id INT NOT NULL,
  extra_location_id INT NULL,
  name VARCHAR(120) NOT NULL,
  slug VARCHAR(160) NOT NULL,
  code VARCHAR(30) NOT NULL,
  address VARCHAR(255) NOT NULL,
  star_rating INT NOT NULL
);

INSERT INTO luxhome_hotel_seed VALUES
  (1001, 11001, 20001, 1, 1, NULL, 'LuxHome Bai Dai Resort', 'luxhome-bai-dai-resort', 'LXHM-PQ-BD-01', 'Khu vực Bãi Dài, Phú Quốc', 5),
  (1002, 11002, 20002, 1, 1, NULL, 'LuxHome Beach Phu Quoc', 'luxhome-beach-phu-quoc', 'LXHM-PQ-BD-02', 'Khu vực Bãi Dài, Phú Quốc', 4),
  (1003, 11003, 20003, 1, 2, NULL, 'LuxHome Duong Dong Hotel', 'luxhome-duong-dong-hotel', 'LXHM-PQ-DD-01', 'Khu vực Dương Đông, Phú Quốc', 4),
  (1004, 11004, 20004, 1, 2, NULL, 'LuxHome Central Phu Quoc', 'luxhome-central-phu-quoc', 'LXHM-PQ-DD-02', 'Trung tâm Dương Đông, Phú Quốc', 4),
  (1005, 11005, 20005, 1, 2, NULL, 'LuxHome Night Market Hotel', 'luxhome-night-market-hotel', 'LXHM-PQ-DD-03', 'Gần chợ đêm Dương Đông, Phú Quốc', 4),
  (1006, 11006, 20006, 1, 3, NULL, 'LuxHome Ong Lang Resort', 'luxhome-ong-lang-resort', 'LXHM-PQ-OL-01', 'Khu vực Ông Lang, Phú Quốc', 5),
  (1007, 11007, 20007, 1, 4, NULL, 'LuxHome Ganh Dau Resort', 'luxhome-ganh-dau-resort', 'LXHM-PQ-GD-01', 'Khu vực Gành Dầu, Phú Quốc', 5),
  (1008, 11008, 20008, 1, 5, NULL, 'LuxHome An Thoi Hotel', 'luxhome-an-thoi-hotel', 'LXHM-PQ-AT-01', 'Khu vực An Thới, Phú Quốc', 4),
  (1009, 11009, 20009, 2, 6, NULL, 'LuxHome Nha Trang Central', 'luxhome-nha-trang-central', 'LXHM-NT-TT-01', 'Trung tâm Nha Trang', 4),
  (1010, 11010, 20010, 2, 7, NULL, 'LuxHome Tran Phu Beach Hotel', 'luxhome-tran-phu-beach-hotel', 'LXHM-NT-TP-01', 'Đường Trần Phú, Nha Trang', 5),
  (1011, 11011, 20011, 2, 7, NULL, 'LuxHome Beach Nha Trang', 'luxhome-beach-nha-trang', 'LXHM-NT-TP-02', 'Bãi biển Trần Phú, Nha Trang', 4),
  (1012, 11012, 20012, 2, 8, NULL, 'LuxHome Hon Tre Resort', 'luxhome-hon-tre-resort', 'LXHM-NT-HT-01', 'Đảo Hòn Tre, Nha Trang', 5),
  (1013, 11013, 20013, 2, 9, NULL, 'LuxHome Vinh Hai Hotel', 'luxhome-vinh-hai-hotel', 'LXHM-NT-VH-01', 'Khu vực Vĩnh Hải, Nha Trang', 4),
  (1014, 11014, 20014, 3, 10, 11, 'LuxHome My Khe Beach', 'luxhome-my-khe-beach', 'LXHM-DN-MK-01', 'Bãi biển Mỹ Khê, Đà Nẵng', 4),
  (1015, 11015, 20015, 3, 10, NULL, 'LuxHome My Khe Resort', 'luxhome-my-khe-resort', 'LXHM-DN-MK-02', 'Bãi biển Mỹ Khê, Đà Nẵng', 5),
  (1016, 11016, 20016, 3, 10, NULL, 'LuxHome Beachfront Da Nang', 'luxhome-beachfront-da-nang', 'LXHM-DN-MK-03', 'Ven biển Mỹ Khê, Đà Nẵng', 4),
  (1017, 11017, 20017, 3, 11, NULL, 'LuxHome An Thuong Hotel', 'luxhome-an-thuong-hotel', 'LXHM-DN-AT-01', 'Khu An Thượng, Đà Nẵng', 4),
  (1018, 11018, 20018, 3, 11, NULL, 'LuxHome An Thuong Boutique', 'luxhome-an-thuong-boutique', 'LXHM-DN-AT-02', 'Khu An Thượng, Đà Nẵng', 4),
  (1019, 11019, 20019, 3, 12, NULL, 'LuxHome Son Tra Hotel', 'luxhome-son-tra-hotel', 'LXHM-DN-ST-01', 'Bán đảo Sơn Trà, Đà Nẵng', 4),
  (1020, 11020, 20020, 3, 13, NULL, 'LuxHome Ba Na Hills Resort', 'luxhome-ba-na-hills-resort', 'LXHM-DN-BN-01', 'Khu vực Bà Nà Hills, Đà Nẵng', 5),
  (1021, 11021, 20021, 4, 14, NULL, 'LuxHome Hoan Kiem Hotel', 'luxhome-hoan-kiem-hotel', 'LXHM-HN-HK-01', 'Quận Hoàn Kiếm, Hà Nội', 4),
  (1022, 11022, 20022, 4, 14, NULL, 'LuxHome Old Quarter Hotel', 'luxhome-old-quarter-hotel', 'LXHM-HN-HK-02', 'Phố cổ Hoàn Kiếm, Hà Nội', 4),
  (1023, 11023, 20023, 4, 14, NULL, 'LuxHome Lakeview Hanoi', 'luxhome-lakeview-hanoi', 'LXHM-HN-HK-03', 'Gần hồ Hoàn Kiếm, Hà Nội', 5),
  (1024, 11024, 20024, 4, 15, NULL, 'LuxHome Ba Dinh Hotel', 'luxhome-ba-dinh-hotel', 'LXHM-HN-BD-01', 'Quận Ba Đình, Hà Nội', 4),
  (1025, 11025, 20025, 4, 16, NULL, 'LuxHome Tay Ho Hotel', 'luxhome-tay-ho-hotel', 'LXHM-HN-TH-01', 'Quận Tây Hồ, Hà Nội', 4),
  (1026, 11026, 20026, 4, 16, NULL, 'LuxHome West Lake Resort', 'luxhome-west-lake-resort', 'LXHM-HN-TH-02', 'Ven hồ Tây, Hà Nội', 5),
  (1027, 11027, 20027, 4, 17, NULL, 'LuxHome Cau Giay Hotel', 'luxhome-cau-giay-hotel', 'LXHM-HN-CG-01', 'Quận Cầu Giấy, Hà Nội', 4),
  (1028, 11028, 20028, 5, 18, NULL, 'LuxHome District 1 Hotel', 'luxhome-district-1-hotel', 'LXHM-HCM-Q1-01', 'Quận 1, TP.HCM', 5),
  (1029, 11029, 20029, 5, 18, NULL, 'LuxHome Ben Thanh Hotel', 'luxhome-ben-thanh-hotel', 'LXHM-HCM-Q1-02', 'Gần chợ Bến Thành, Quận 1, TP.HCM', 4),
  (1030, 11030, 20030, 5, 18, NULL, 'LuxHome Central Saigon', 'luxhome-central-saigon', 'LXHM-HCM-Q1-03', 'Trung tâm Quận 1, TP.HCM', 4),
  (1031, 11031, 20031, 5, 19, NULL, 'LuxHome Thao Dien Hotel', 'luxhome-thao-dien-hotel', 'LXHM-HCM-TD-01', 'Phường Thảo Điền, TP.HCM', 4),
  (1032, 11032, 20032, 5, 19, NULL, 'LuxHome Riverside Saigon', 'luxhome-riverside-saigon', 'LXHM-HCM-TD-02', 'Ven sông Sài Gòn, TP.HCM', 5),
  (1033, 11033, 20033, 5, 20, NULL, 'LuxHome Phu Nhuan Hotel', 'luxhome-phu-nhuan-hotel', 'LXHM-HCM-PN-01', 'Quận Phú Nhuận, TP.HCM', 4),
  (1034, 11034, 20034, 5, 21, NULL, 'LuxHome District 7 Hotel', 'luxhome-district-7-hotel', 'LXHM-HCM-Q7-01', 'Quận 7, TP.HCM', 4),
  (1035, 11035, 20035, 5, 21, NULL, 'LuxHome Saigon South', 'luxhome-saigon-south', 'LXHM-HCM-Q7-02', 'Khu Nam Sài Gòn, TP.HCM', 5);

INSERT INTO hotels (id, hotel_chain_id, name, slug, code, city, city_id, region, country, address, star_rating, status, description)
SELECT s.hotel_id, @luxhome_chain_id, s.name, s.slug, s.code, c.name, s.city_id,
       CASE s.city_id WHEN 1 THEN 'Đảo Phú Quốc' WHEN 2 THEN 'Nam Trung Bộ' WHEN 3 THEN 'Trung Bộ' WHEN 4 THEN 'Miền Bắc' ELSE 'Miền Nam' END,
       'Vietnam', s.address, s.star_rating, 'Active', CONCAT(s.name, ' thuộc chuỗi LuxHome.')
FROM luxhome_hotel_seed s
JOIN cities c ON c.id = s.city_id
ON DUPLICATE KEY UPDATE hotel_chain_id = VALUES(hotel_chain_id), name = VALUES(name), slug = VALUES(slug), city = VALUES(city), city_id = VALUES(city_id), address = VALUES(address), star_rating = VALUES(star_rating), status = 'Active';

INSERT INTO hotel_branches (id, hotel_id, name, code, city, region, country, address, status, description)
SELECT s.branch_id, s.hotel_id, s.name, CONCAT(s.code, '-01'), c.name,
       CASE s.city_id WHEN 1 THEN 'Đảo Phú Quốc' WHEN 2 THEN 'Nam Trung Bộ' WHEN 3 THEN 'Trung Bộ' WHEN 4 THEN 'Miền Bắc' ELSE 'Miền Nam' END,
       'Vietnam', s.address, 'Active', CONCAT('Chi nhánh ', s.name)
FROM luxhome_hotel_seed s
JOIN cities c ON c.id = s.city_id
ON DUPLICATE KEY UPDATE hotel_id = VALUES(hotel_id), name = VALUES(name), city = VALUES(city), address = VALUES(address), status = 'Active';

INSERT INTO room_types (name, description, base_price, max_guests, amenities)
VALUES ('LuxHome Search Deluxe', 'Phòng demo để tìm kiếm khách sạn LuxHome.', 1200000, 4, JSON_ARRAY('Wi-Fi', 'Điều hòa', 'TV'))
ON DUPLICATE KEY UPDATE description = VALUES(description), base_price = VALUES(base_price), max_guests = VALUES(max_guests);
SET @luxhome_room_type_id = (SELECT id FROM room_types WHERE name = 'LuxHome Search Deluxe' LIMIT 1);

-- Repair room 1 if an earlier version of this migration matched its duplicate room_number.
UPDATE rooms r
JOIN room_types luxhome_type ON luxhome_type.id = r.room_type_id AND luxhome_type.name = 'LuxHome Search Deluxe'
JOIN hotel_branches luxhome_branch ON luxhome_branch.id = r.hotel_branch_id AND luxhome_branch.code LIKE 'LXHM-%'
JOIN room_types standard_type ON standard_type.name = 'Standard'
JOIN hotel_branches hanoi_branch ON hanoi_branch.code = 'LXST-HN-01'
SET r.room_type_id = standard_type.id,
    r.hotel_branch_id = hanoi_branch.id,
    r.status = 'Available',
    r.is_active = TRUE
WHERE r.id = 1 AND r.room_number = '101';

INSERT INTO rooms (id, room_type_id, hotel_branch_id, room_number, floor, status, description, is_active)
SELECT s.room_id, @luxhome_room_type_id, s.branch_id,
       CONCAT('LH', LPAD(s.hotel_id - 1000, 3, '0')), 1, 'Available', CONCAT('Phòng tìm kiếm tại ', s.name), TRUE
FROM luxhome_hotel_seed s
WHERE NOT EXISTS (
  SELECT 1 FROM rooms existing_room WHERE existing_room.id = s.room_id
);

INSERT INTO hotel_locations (hotel_id, location_id, distance_km, is_primary)
SELECT s.hotel_id, s.location_id, 0.3, TRUE FROM luxhome_hotel_seed s
ON DUPLICATE KEY UPDATE distance_km = VALUES(distance_km), is_primary = TRUE;

INSERT INTO hotel_locations (hotel_id, location_id, distance_km, is_primary)
SELECT s.hotel_id, s.extra_location_id, 1.0, FALSE FROM luxhome_hotel_seed s
WHERE s.extra_location_id IS NOT NULL
ON DUPLICATE KEY UPDATE distance_km = VALUES(distance_km), is_primary = FALSE;

-- Give any pre-existing active hotel a default location in its city.
INSERT INTO hotel_locations (hotel_id, location_id, distance_km, is_primary)
SELECT h.id, MIN(l.id), 0, TRUE
FROM hotels h
JOIN locations l ON l.city_id = h.city_id AND l.is_active = TRUE
LEFT JOIN hotel_locations hl ON hl.hotel_id = h.id
WHERE hl.hotel_id IS NULL
GROUP BY h.id;
