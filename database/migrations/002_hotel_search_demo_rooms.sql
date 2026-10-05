USE hotel_management;
SET NAMES utf8mb4;

START TRANSACTION;

INSERT INTO room_types (id, name, description, base_price, max_guests, amenities, image_url) VALUES
  (91, 'LuxHome Demo Deluxe', 'Demo room for hotel search flow', 2200000, 3, JSON_ARRAY('Wi-Fi', 'Old Quarter View', 'Breakfast'), 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85'),
  (92, 'LuxHome Demo Premier', 'Demo room for hotel search flow', 1850000, 3, JSON_ARRAY('Ocean View', 'Wi-Fi', 'Pool'), 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85'),
  (93, 'LuxHome Demo Executive', 'Demo room for hotel search flow', 1450000, 2, JSON_ARRAY('River View', 'Wi-Fi', 'Gym'), 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1000&q=85'),
  (94, 'LuxHome Demo Villa', 'Demo room for hotel search flow', 2650000, 4, JSON_ARRAY('Private Garden', 'Wi-Fi', 'Private Beach'), 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=85')
ON DUPLICATE KEY UPDATE
  name = VALUES(name),
  description = VALUES(description),
  base_price = VALUES(base_price),
  max_guests = VALUES(max_guests),
  amenities = VALUES(amenities),
  image_url = VALUES(image_url);

INSERT INTO hotels (id, hotel_chain_id, name, code, city, region, country, address, star_rating, status, description) VALUES
  (901, 1, 'LuxHome Hanoi Heritage', 'LXHM-DEMO-HN', 'Hà Nội', 'North', 'Vietnam', '18 Hàng Bông, Hoàn Kiếm', 5, 'Active', 'Khách sạn boutique giữa khu phố cổ, thuận tiện khám phá Hồ Gươm và các điểm di sản.'),
  (902, 1, 'LuxHome Da Nang Beachfront', 'LXHM-DEMO-DN', 'Đà Nẵng', 'Central', 'Vietnam', '92 Võ Nguyên Giáp, Sơn Trà', 5, 'Active', 'Khu nghỉ dưỡng ven biển với hồ bơi ngoài trời và tầm nhìn hướng biển Mỹ Khê.'),
  (903, 1, 'LuxHome Saigon Riverside', 'LXHM-DEMO-SG', 'TP.HCM', 'South', 'Vietnam', '12 Tôn Đức Thắng, Quận 1', 4, 'Active', 'Khách sạn thành thị bên sông Sài Gòn, gần phố đi bộ Nguyễn Huệ.'),
  (904, 1, 'LuxHome Pearl Island Resort', 'LXHM-DEMO-PQ', 'Phú Quốc', 'South', 'Vietnam', 'Bãi Dài, Gành Dầu, Phú Quốc', 5, 'Active', 'Khu nghỉ dưỡng nhiệt đới gần Bãi Dài với villa hướng vườn và bãi biển riêng.')
ON DUPLICATE KEY UPDATE
  hotel_chain_id = VALUES(hotel_chain_id),
  name = VALUES(name),
  code = VALUES(code),
  city = VALUES(city),
  region = VALUES(region),
  country = VALUES(country),
  address = VALUES(address),
  star_rating = VALUES(star_rating),
  status = VALUES(status),
  description = VALUES(description);

INSERT INTO hotel_branches (id, hotel_id, name, code, city, region, country, address, status, latitude, longitude) VALUES
  (9001, 901, 'Hanoi Heritage', 'LXHM-DEMO-HN-01', 'Hà Nội', 'North', 'Vietnam', '18 Hàng Bông, Hoàn Kiếm', 'Active', 21.031000, 105.849000),
  (9002, 902, 'Da Nang Beachfront', 'LXHM-DEMO-DN-01', 'Đà Nẵng', 'Central', 'Vietnam', '92 Võ Nguyên Giáp, Sơn Trà', 'Active', 16.061000, 108.246000),
  (9003, 903, 'Saigon Riverside', 'LXHM-DEMO-SG-01', 'TP.HCM', 'South', 'Vietnam', '12 Tôn Đức Thắng, Quận 1', 'Active', 10.778000, 106.706000),
  (9004, 904, 'Pearl Island Resort', 'LXHM-DEMO-PQ-01', 'Phú Quốc', 'South', 'Vietnam', 'Bãi Dài, Gành Dầu, Phú Quốc', 'Active', 10.338000, 103.886000)
ON DUPLICATE KEY UPDATE
  hotel_id = VALUES(hotel_id),
  name = VALUES(name),
  code = VALUES(code),
  city = VALUES(city),
  region = VALUES(region),
  country = VALUES(country),
  address = VALUES(address),
  status = VALUES(status),
  latitude = VALUES(latitude),
  longitude = VALUES(longitude);

INSERT INTO rooms (id, room_type_id, hotel_branch_id, room_number, floor, status, description, image_url, is_active) VALUES
  (99001, 91, 9001, '501', 5, 'Available', 'LuxHome demo room for payment flow', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1000&q=85', TRUE),
  (99002, 92, 9002, '608', 6, 'Available', 'LuxHome demo room for payment flow', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1000&q=85', TRUE),
  (99003, 93, 9003, '1205', 12, 'Available', 'LuxHome demo room for payment flow', 'https://images.unsplash.com/photo-1595576508898-0ad5c879a061?auto=format&fit=crop&w=1000&q=85', TRUE),
  (99004, 94, 9004, 'V12', 1, 'Available', 'LuxHome demo room for payment flow', 'https://images.unsplash.com/photo-1613490493576-7fde63acd811?auto=format&fit=crop&w=1000&q=85', TRUE)
ON DUPLICATE KEY UPDATE
  room_type_id = VALUES(room_type_id),
  hotel_branch_id = VALUES(hotel_branch_id),
  room_number = VALUES(room_number),
  floor = VALUES(floor),
  description = VALUES(description),
  image_url = VALUES(image_url),
  is_active = VALUES(is_active);

COMMIT;