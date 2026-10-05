USE hotel_management;
SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- 1. ORDERS TABLE
CREATE TABLE IF NOT EXISTS orders (
  id INT AUTO_INCREMENT PRIMARY KEY,
  customer_id INT NOT NULL,
  order_code VARCHAR(50) NOT NULL UNIQUE,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  final_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
  payment_status ENUM('UNPAID','PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'UNPAID',
  order_status ENUM('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED') NOT NULL DEFAULT 'PENDING_PAYMENT',
  contact_name VARCHAR(100),
  contact_email VARCHAR(100),
  contact_phone VARCHAR(20),
  special_requests TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_orders_customer (customer_id),
  KEY idx_orders_status (order_status),
  KEY idx_orders_payment_status (payment_status),
  CONSTRAINT fk_orders_customer FOREIGN KEY (customer_id) REFERENCES customers(id)
);

-- 2. ALTER BOOKINGS (Hotel Booking) to add order_id
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'bookings' AND COLUMN_NAME = 'order_id') = 0,
    'ALTER TABLE bookings ADD COLUMN order_id INT NULL, ADD CONSTRAINT fk_bookings_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 3. TOURS TABLE
CREATE TABLE IF NOT EXISTS tours (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(200) NOT NULL,
  slug VARCHAR(200) NOT NULL UNIQUE,
  description TEXT,
  city_id INT NOT NULL,
  location_id INT NULL,
  duration VARCHAR(50) NOT NULL,
  price DECIMAL(12,2) NOT NULL,
  max_participants INT DEFAULT 20,
  thumbnail VARCHAR(255),
  status ENUM('Active','Inactive') DEFAULT 'Active',
  cancellation_policy TEXT,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tours_city (city_id),
  KEY idx_tours_location (location_id),
  CONSTRAINT fk_tours_city FOREIGN KEY (city_id) REFERENCES cities(id),
  CONSTRAINT fk_tours_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- 4. TOUR SCHEDULES TABLE
CREATE TABLE IF NOT EXISTS tour_schedules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  start_datetime DATETIME NOT NULL,
  end_datetime DATETIME NOT NULL,
  available_slots INT NOT NULL DEFAULT 20,
  booked_slots INT NOT NULL DEFAULT 0,
  status ENUM('Open','Full','Cancelled','Completed') DEFAULT 'Open',
  meeting_point VARCHAR(255),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tour_schedules_tour (tour_id),
  KEY idx_tour_schedules_start (start_datetime),
  CONSTRAINT fk_tour_schedules_tour FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

-- 5. TOUR ITINERARIES TABLE
CREATE TABLE IF NOT EXISTS tour_itineraries (
  id INT AUTO_INCREMENT PRIMARY KEY,
  tour_id INT NOT NULL,
  sequence INT NOT NULL DEFAULT 1,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  start_time VARCHAR(20),
  end_time VARCHAR(20),
  location VARCHAR(200),
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_tour_itineraries_tour (tour_id),
  CONSTRAINT fk_tour_itineraries_tour FOREIGN KEY (tour_id) REFERENCES tours(id) ON DELETE CASCADE
);

-- 6. TOUR BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS tour_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  tour_id INT NOT NULL,
  schedule_id INT NULL,
  tour_date DATE NOT NULL,
  number_of_people INT NOT NULL DEFAULT 1,
  pickup_location VARCHAR(255),
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  status ENUM('Pending','Confirmed','Completed','Cancelled') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_tour_bookings_order (order_id),
  KEY idx_tour_bookings_tour (tour_id),
  CONSTRAINT fk_tour_bookings_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_tour_bookings_tour FOREIGN KEY (tour_id) REFERENCES tours(id)
);

-- 7. CARS TABLE
CREATE TABLE IF NOT EXISTS cars (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(150) NOT NULL,
  brand VARCHAR(80) NOT NULL,
  model VARCHAR(80) NOT NULL,
  type ENUM('Sedan','SUV','Hatchback','MPV','Pickup','Luxury') DEFAULT 'SUV',
  seats INT NOT NULL DEFAULT 5,
  transmission ENUM('Automatic','Manual') DEFAULT 'Automatic',
  fuel_type ENUM('Electric','Petrol','Diesel') DEFAULT 'Petrol',
  price_per_day DECIMAL(12,2) NOT NULL,
  city_id INT NOT NULL,
  location_id INT NULL,
  image VARCHAR(255),
  description TEXT,
  status ENUM('Available','Rented','Maintenance') DEFAULT 'Available',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_cars_city (city_id),
  KEY idx_cars_location (location_id),
  CONSTRAINT fk_cars_city FOREIGN KEY (city_id) REFERENCES cities(id),
  CONSTRAINT fk_cars_location FOREIGN KEY (location_id) REFERENCES locations(id) ON DELETE SET NULL
);

-- 8. CAR RENTAL BOOKINGS TABLE
CREATE TABLE IF NOT EXISTS car_rental_bookings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  car_id INT NOT NULL,
  pickup_location VARCHAR(255),
  dropoff_location VARCHAR(255),
  pickup_datetime DATETIME NOT NULL,
  return_datetime DATETIME NOT NULL,
  rental_days INT NOT NULL DEFAULT 1,
  driver_required BOOLEAN DEFAULT FALSE,
  driver_fee DECIMAL(12,2) DEFAULT 0.00,
  price_per_day DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  status ENUM('Pending','Confirmed','Active','Completed','Cancelled') DEFAULT 'Pending',
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  KEY idx_car_rentals_order (order_id),
  KEY idx_car_rentals_car (car_id),
  CONSTRAINT fk_car_rentals_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE,
  CONSTRAINT fk_car_rentals_car FOREIGN KEY (car_id) REFERENCES cars(id)
);

-- 9. ORDER ITEMS TABLE
CREATE TABLE IF NOT EXISTS order_items (
  id INT AUTO_INCREMENT PRIMARY KEY,
  order_id INT NOT NULL,
  service_type ENUM('HOTEL','TOUR','CAR_RENTAL') NOT NULL,
  service_id INT NOT NULL,
  item_name VARCHAR(200) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(12,2) NOT NULL,
  total_price DECIMAL(12,2) NOT NULL,
  metadata JSON,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  KEY idx_order_items_order (order_id),
  CONSTRAINT fk_order_items_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE CASCADE
);

-- 10. PAYMENTS link to Order
SET @sql = IF((SELECT COUNT(*) FROM information_schema.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'payments' AND COLUMN_NAME = 'order_id') = 0,
    'ALTER TABLE payments ADD COLUMN order_id INT NULL, ADD CONSTRAINT fk_payments_order FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL', 'SELECT 1');
PREPARE stmt FROM @sql; EXECUTE stmt; DEALLOCATE PREPARE stmt;

-- 11. SEED TOURS
INSERT INTO tours (id, name, slug, description, city_id, location_id, duration, price, max_participants, thumbnail, status, cancellation_policy) VALUES
(1, 'Tour Cano 4 Đảo Phú Quốc & Cáp Treo Hòn Thơm VIP', 'tour-cano-4-dao-phu-quoc', 'Hành trình lặn ngắm san hô tại Hòn Mây Rút, Hòn Gầm Ghì, Hòn Móng Tay, check-in công viên nước Aquatopia và trải nghiệm cáp treo vượt biển 3 dây dài nhất thế giới.', 1, 5, '1 ngày (08:30 - 17:30)', 850000, 25, 'https://images.unsplash.com/photo-1544644181-1484b3fdfc62?w=800', 'Active', 'Hủy trước 48h miễn phí. Hủy trước 24h tính phí 30%.'),
(2, 'Khám Phá VinWonders & Safari Bán Hoang Dã Phú Quốc', 'vinwonders-safari-phu-quoc', 'Tham quan vườn thú bán hoang dã Safari đầu tiên tại Việt Nam, show diễn triệu đô Once Show tại công viên chủ đề VinWonders lớn nhất Đông Nam Á.', 1, 4, '1 ngày (09:00 - 18:00)', 950000, 40, 'https://images.unsplash.com/photo-1534447677768-be436bb09401?w=800', 'Active', 'Hủy trước 24h hoàn tiền 100%.'),
(3, 'Tour 3 Đảo Nha Trang VIP & Tắm Bùn Khoáng Hòn Tằm', 'tour-3-dao-nha-trang-hon-tam', 'Khám phá Hòn Mun thiên đường san hô, dùng bữa trưa hải sản tươi sống tại Làng Chài và thư giãn tắm bùn khoáng nóng cao cấp tại MerPerle Hòn Tằm Resort.', 2, 8, '1 ngày (08:00 - 16:30)', 750000, 30, 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=800', 'Active', 'Hủy trước 24h miễn phí.'),
(4, 'Tour Bà Nà Hills - Cầu Vàng - Buffet Trưa Đẳng Cấp', 'tour-ba-na-hills-cau-vang-da-nang', 'Chinh phục đỉnh núi Chúa, check-in Cầu Vàng biểu tượng du lịch thế giới, khám phá Làng Pháp cổ kính và thỏa sức vui chơi tại Fantasy Park.', 3, NULL, '1 ngày (07:30 - 17:00)', 1250000, 35, 'https://images.unsplash.com/photo-1570789210967-2cac24afeb00?w=800', 'Active', 'Hủy trước 48h hoàn 100%.'),
(5, 'Hành Trình Di Sản: Ngũ Hành Sơn - Phố Cổ Hội An Về Đêm', 'tour-ngu-hanh-son-hoi-an', 'Khám phá hang động thạch nhũ huyền bí tại danh thắng Ngũ Hành Sơn, dạo thuyền thả hoa đăng trên sông Hoài và thưởng thức ẩm thực đặc sản Hội An.', 3, NULL, 'Buổi chiều (14:30 - 21:00)', 550000, 20, 'https://images.unsplash.com/photo-1559592413-7cec4d0cae2b?w=800', 'Active', 'Hủy trước 24h miễn phí.'),
(6, 'Hà Nội City Tour Đậm Đà Bản Sắc: Lăng Bác - Văn Miếu - Hồ Gươm', 'ha-noi-city-tour-1-ngay', 'Tham quan Lăng Chủ tịch Hồ Chí Minh, Chùa Một Cột, Văn Miếu Quốc Tử Giám, trải nghiệm xích lô phố cổ và thưởng thức cà phê trứng truyền thống.', 4, NULL, '1 ngày (08:00 - 16:30)', 600000, 20, 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800', 'Active', 'Hủy trước 24h hoàn 100%.'),
(7, 'Du Ngoạn Miền Tây Sông Nước: Mỹ Tho - Bến Tre 1 Ngày', 'tour-mien-tay-my-tho-ben-tre', 'Xuôi thuyền trên sông Tiền, thưởng thức trái cây miệt vườn, nghe đờn ca tài tử Nam Bộ, thăm lò kẹo dừa Bến Tre và chèo xuồng ba lá len lỏi rừng dừa nước.', 5, NULL, '1 ngày (07:30 - 17:30)', 650000, 30, 'https://images.unsplash.com/photo-1528127269322-539801943592?w=800', 'Active', 'Hủy trước 24h miễn phí.')
ON DUPLICATE KEY UPDATE name = VALUES(name), price = VALUES(price), description = VALUES(description);

-- 12. SEED TOUR SCHEDULES
INSERT INTO tour_schedules (tour_id, start_datetime, end_datetime, available_slots, booked_slots, status, meeting_point) VALUES
(1, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 8 HOUR + INTERVAL 30 MINUTE, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, 20, 5, 'Open', 'Cảng An Thới, Nam đảo Phú Quốc (hoặc đón khách tận khách sạn)'),
(1, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY) + INTERVAL 8 HOUR + INTERVAL 30 MINUTE, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, 25, 0, 'Open', 'Cảng An Thới, Nam đảo Phú Quốc'),
(1, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY) + INTERVAL 8 HOUR + INTERVAL 30 MINUTE, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY) + INTERVAL 17 HOUR + INTERVAL 30 MINUTE, 25, 0, 'Open', 'Cảng An Thới, Nam đảo Phú Quốc'),
(2, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 9 HOUR, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 18 HOUR, 35, 5, 'Open', 'Cổng Safari Phú Quốc, Gành Dầu'),
(3, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 8 HOUR, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 16 HOUR + INTERVAL 30 MINUTE, 28, 2, 'Open', 'Cảng Du lịch Nha Trang (Vĩnh Trường)'),
(4, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 7 HOUR + INTERVAL 30 MINUTE, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 17 HOUR, 30, 5, 'Open', 'Sảnh khách sạn tại Đà Nẵng hoặc Ga cáp treo Suối Mơ'),
(5, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 14 HOUR + INTERVAL 30 MINUTE, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY) + INTERVAL 21 HOUR, 18, 2, 'Open', 'Điểm đón trung tâm TP Đà Nẵng');

-- 13. SEED TOUR ITINERARIES
INSERT INTO tour_itineraries (tour_id, sequence, title, description, start_time, end_time, location) VALUES
(1, 1, 'Đón khách & khởi hành cano', 'Xe đón khách tại khách sạn trung tâm Dương Đông, di chuyển về cảng An Thới lên cano cao tốc.', '08:30', '09:30', 'Cảng An Thới'),
(1, 2, 'Lặn san hô Hòn Gầm Ghì', 'Tự do bơi lội, lặn ngắm hệ sinh thái rạn san hô tự nhiên đẹp nhất Phú Quốc với trang bị kính lặn cao cấp.', '09:30', '11:00', 'Hòn Gầm Ghì'),
(1, 3, 'Chụp hình SUP Hòn Móng Tay', 'Check-in bãi cát trắng mịn làn nước ngọc bích, chụp ảnh flycam & chèo thuyền SUP miễn phí.', '11:00', '12:30', 'Hòn Móng Tay'),
(1, 4, 'Bữa trưa hải sản Hòn Mây Rút', 'Thưởng thức bữa trưa 8 món hải sản tươi ngon đậm chất biển đảo Phú Quốc.', '12:30', '14:00', 'Hòn Mây Rút'),
(1, 5, 'Cáp treo Hòn Thơm & Công viên nước', 'Trải nghiệm cáp treo 3 dây vượt biển, vui chơi thả ga tại công viên nước Aquatopia.', '14:00', '17:00', 'Hòn Thơm'),
(4, 1, 'Khởi hành lên Bà Nà', 'Xe & HDV đón khách tại điểm hẹn, di chuyển đến chân núi Bà Nà.', '07:30', '08:30', 'Đà Nẵng'),
(4, 2, 'Check-in Cầu Vàng & Vườn hoa Le Jardin', 'Đi cáp treo đạt kỷ lục Guiness, dạo bước trên đôi bàn tay khổng lồ Cầu Vàng sương mờ.', '09:00', '11:30', 'Cầu Vàng'),
(4, 3, 'Buffet trưa đẳng cấp hơn 100 món', 'Thưởng thức ẩm thực Á - Âu phong phú tại nhà hàng sang trọng trên đỉnh núi.', '11:30', '13:00', 'Nhà hàng buffet Bà Nà'),
(4, 4, 'Làng Pháp & Fantasy Park', 'Chinh phục khu trò chơi cảm giác mạnh trong nhà lớn nhất Việt Nam.', '13:00', '16:30', 'Làng Pháp');

-- 14. SEED CARS
INSERT INTO cars (id, name, brand, model, type, seats, transmission, fuel_type, price_per_day, city_id, location_id, image, description, status) VALUES
(1, 'VinFast VF5 Plus (Mới 2024)', 'VinFast', 'VF5 Plus', 'SUV', 5, 'Automatic', 'Electric', 650000, 1, 1, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800', 'Xe điện thông minh, vận hành êm ái, tiết kiệm chi phí, hỗ trợ sạc miễn phí tại các trạm sạc VinFast trên toàn đảo Phú Quốc.', 'Available'),
(2, 'VinFast VF8 Eco (Luxury SUV)', 'VinFast', 'VF8 Eco', 'Luxury', 5, 'Automatic', 'Electric', 1200000, 1, 2, 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800', 'SUV điện hạng D sang trọng, nội thất da cao cấp, hệ thống hỗ trợ lái thông minh ADAS, trải nghiệm đỉnh cao.', 'Available'),
(3, 'Toyota Fortuner 2.4G 2023', 'Toyota', 'Fortuner', 'SUV', 7, 'Automatic', 'Diesel', 1100000, 1, 5, 'https://images.unsplash.com/photo-1533473359331-0135ef1b58bf?w=800', 'SUV 7 chỗ gầm cao mạnh mẽ, khoang hành lý cực rộng, máy dầu tiết kiệm nhiên liệu, phù hợp gia đình du lịch đảo.', 'Available'),
(4, 'Kia Carnival Signature 7 Chỗ VIP', 'Kia', 'Carnival', 'MPV', 7, 'Automatic', 'Petrol', 1800000, 1, 2, 'https://images.unsplash.com/photo-1550355291-bbee04a92027?w=800', 'Chuyên cơ mặt đất với hàng ghế thương gia ngả lưng chỉnh điện, màn hình giải trí, phục vụ chuẩn VIP đón tiễn resort.', 'Available'),
(5, 'VinFast VF5 Plus Nha Trang', 'VinFast', 'VF5 Plus', 'SUV', 5, 'Automatic', 'Electric', 650000, 2, 6, 'https://images.unsplash.com/photo-1549399542-7e3f8b79c341?w=800', 'Xe điện hiện đại giao nhận tận nơi tại sân bay Cam Ranh hoặc trung tâm TP Nha Trang.', 'Available'),
(6, 'Hyundai Tucson 2023 Turbo', 'Hyundai', 'Tucson', 'SUV', 5, 'Automatic', 'Petrol', 950000, 2, 7, 'https://images.unsplash.com/photo-1508974239320-0a029497e820?w=800', 'Crossover trẻ trung, cửa sổ trời toàn cảnh panorama, lướt êm trên cung đường biển Nha Trang tuyệt đẹp.', 'Available'),
(7, 'VinFast VF8 Eco Đà Nẵng', 'VinFast', 'VF8 Eco', 'Luxury', 5, 'Automatic', 'Electric', 1200000, 3, NULL, 'https://images.unsplash.com/photo-1617814076367-b759c7d7e738?w=800', 'SUV điện cao cấp sẵn sàng giao tại Sân bay Đà Nẵng hoặc Hội An.', 'Available'),
(8, 'Hyundai Accent 2023 AT', 'Hyundai', 'Accent', 'Sedan', 5, 'Automatic', 'Petrol', 600000, 3, NULL, 'https://images.unsplash.com/photo-1580273916550-e323be2ae537?w=800', 'Sedan 5 chỗ nhỏ gọn, tiết kiệm xăng, lý tưởng dạo quanh Đà Nẵng và phố cổ Hội An.', 'Available'),
(9, 'Toyota Camry 2.5Q Doanh Nhân', 'Toyota', 'Camry', 'Luxury', 5, 'Automatic', 'Petrol', 1500000, 4, NULL, 'https://images.unsplash.com/photo-1621007947382-bb3c3994e3fb?w=800', 'Sedan hạng D sang trọng, phục vụ công tác và hội nghị tại thủ đô Hà Nội.', 'Available'),
(10, 'VinFast VF9 Plus 6 Chỗ Captain', 'VinFast', 'VF9 Plus', 'Luxury', 6, 'Automatic', 'Electric', 2200000, 5, NULL, 'https://images.unsplash.com/photo-1553440569-bcc63803a83d?w=800', 'SUV điện full-size đẳng cấp nhất của VinFast, ghế cơ trưởng massage, giao nhận tại TP. Hồ Chí Minh.', 'Available')
ON DUPLICATE KEY UPDATE name = VALUES(name), price_per_day = VALUES(price_per_day), status = VALUES(status);

SET FOREIGN_KEY_CHECKS = 1;
