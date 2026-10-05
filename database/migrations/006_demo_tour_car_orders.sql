USE hotel_management;
SET NAMES utf8mb4;

DROP TEMPORARY TABLE IF EXISTS demo_travel_orders;
CREATE TEMPORARY TABLE demo_travel_orders (
  order_code VARCHAR(50) PRIMARY KEY,
  customer_email VARCHAR(100) NOT NULL,
  service_type ENUM('TOUR','CAR_RENTAL') NOT NULL,
  service_id INT NOT NULL,
  quantity INT NOT NULL,
  day_offset INT NOT NULL,
  rental_days INT NOT NULL DEFAULT 0,
  driver_required BOOLEAN NOT NULL DEFAULT FALSE,
  pickup_location VARCHAR(255) NOT NULL,
  dropoff_location VARCHAR(255) NOT NULL
);

INSERT INTO demo_travel_orders
  (order_code, customer_email, service_type, service_id, quantity, day_offset, rental_days, driver_required, pickup_location, dropoff_location)
VALUES
  ('DEMO-TOUR-001', 'customer@hotel.com', 'TOUR', 1, 2, 2, 0, FALSE, 'Khách sạn tại Dương Đông', 'Cảng An Thới'),
  ('DEMO-TOUR-002', 'tuan.nm@gmail.com', 'TOUR', 3, 3, 3, 0, FALSE, 'Trung tâm Nha Trang', 'Cảng Vĩnh Trường'),
  ('DEMO-TOUR-003', 'hoa.tt@yahoo.com', 'TOUR', 4, 2, 4, 0, FALSE, 'Khách sạn tại Đà Nẵng', 'Bà Nà Hills'),
  ('DEMO-TOUR-004', 'david.wilson@email.com', 'TOUR', 5, 4, 5, 0, FALSE, 'Khách sạn tại Đà Nẵng', 'Phố cổ Hội An'),
  ('DEMO-TOUR-005', 'sakura@jp.com', 'TOUR', 6, 2, 6, 0, FALSE, 'Khách sạn khu vực Hoàn Kiếm', 'Văn Miếu - Quốc Tử Giám'),
  ('DEMO-CAR-001', 'customer@hotel.com', 'CAR_RENTAL', 1, 1, 8, 2, FALSE, 'Sân bay Phú Quốc', 'Sân bay Phú Quốc'),
  ('DEMO-CAR-002', 'tuan.nm@gmail.com', 'CAR_RENTAL', 5, 1, 9, 3, TRUE, 'Sân bay Cam Ranh', 'Trung tâm Nha Trang'),
  ('DEMO-CAR-003', 'hoa.tt@yahoo.com', 'CAR_RENTAL', 7, 1, 10, 2, FALSE, 'Sân bay Đà Nẵng', 'Khách sạn tại Đà Nẵng'),
  ('DEMO-CAR-004', 'david.wilson@email.com', 'CAR_RENTAL', 8, 1, 11, 1, TRUE, 'Sân bay Đà Nẵng', 'Sân bay Đà Nẵng'),
  ('DEMO-CAR-005', 'sakura@jp.com', 'CAR_RENTAL', 9, 1, 12, 2, FALSE, 'Sân bay Nội Bài', 'Quận Hoàn Kiếm');

INSERT INTO orders
  (customer_id, order_code, total_amount, discount_amount, final_amount, payment_status, order_status, contact_name, contact_email, contact_phone, special_requests)
SELECT c.id, s.order_code,
       CASE WHEN s.service_type = 'TOUR' THEN t.price * s.quantity
            ELSE car.price_per_day * s.rental_days + IF(s.driver_required, 300000 * s.rental_days, 0) END,
       0,
       CASE WHEN s.service_type = 'TOUR' THEN t.price * s.quantity
            ELSE car.price_per_day * s.rental_days + IF(s.driver_required, 300000 * s.rental_days, 0) END,
       'PENDING', 'CONFIRMED', c.full_name, c.email, c.phone,
       CONCAT('Đơn demo ', IF(s.service_type = 'TOUR', 'tour', 'thuê xe'), ' tạo từ dữ liệu mẫu.')
FROM demo_travel_orders s
JOIN customers c ON c.email = s.customer_email
LEFT JOIN tours t ON s.service_type = 'TOUR' AND t.id = s.service_id
LEFT JOIN cars car ON s.service_type = 'CAR_RENTAL' AND car.id = s.service_id
WHERE (s.service_type = 'TOUR' AND t.id IS NOT NULL OR s.service_type = 'CAR_RENTAL' AND car.id IS NOT NULL)
  AND NOT EXISTS (SELECT 1 FROM orders existing WHERE existing.order_code = s.order_code);

INSERT INTO tour_bookings
  (order_id, tour_id, schedule_id, tour_date, number_of_people, pickup_location, unit_price, total_price, status)
SELECT o.id, t.id, NULL, DATE_ADD(CURRENT_DATE, INTERVAL s.day_offset DAY), s.quantity,
       s.pickup_location, t.price, t.price * s.quantity, 'Confirmed'
FROM demo_travel_orders s
JOIN orders o ON o.order_code = s.order_code
JOIN tours t ON t.id = s.service_id
WHERE s.service_type = 'TOUR'
  AND NOT EXISTS (SELECT 1 FROM tour_bookings existing WHERE existing.order_id = o.id);

INSERT INTO car_rental_bookings
  (order_id, car_id, pickup_location, dropoff_location, pickup_datetime, return_datetime, rental_days, driver_required, driver_fee, price_per_day, total_price, status)
SELECT o.id, car.id, s.pickup_location, s.dropoff_location,
       DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL s.day_offset DAY), INTERVAL 9 HOUR),
       DATE_ADD(DATE_ADD(DATE_ADD(CURRENT_DATE, INTERVAL s.day_offset DAY), INTERVAL s.rental_days DAY), INTERVAL 9 HOUR),
       s.rental_days, s.driver_required,
       IF(s.driver_required, 300000 * s.rental_days, 0), car.price_per_day,
       car.price_per_day * s.rental_days + IF(s.driver_required, 300000 * s.rental_days, 0), 'Confirmed'
FROM demo_travel_orders s
JOIN orders o ON o.order_code = s.order_code
JOIN cars car ON car.id = s.service_id
WHERE s.service_type = 'CAR_RENTAL'
  AND NOT EXISTS (SELECT 1 FROM car_rental_bookings existing WHERE existing.order_id = o.id);

INSERT INTO order_items
  (order_id, service_type, service_id, item_name, quantity, unit_price, total_price, metadata)
SELECT o.id, s.service_type, s.service_id,
       CASE WHEN s.service_type = 'TOUR' THEN CONCAT('Tour - ', t.name)
            ELSE CONCAT('Thuê xe - ', car.name, ' (', s.rental_days, ' ngày)') END,
       CASE WHEN s.service_type = 'TOUR' THEN s.quantity ELSE s.rental_days END,
       CASE WHEN s.service_type = 'TOUR' THEN t.price ELSE car.price_per_day END,
       CASE WHEN s.service_type = 'TOUR' THEN t.price * s.quantity
            ELSE car.price_per_day * s.rental_days + IF(s.driver_required, 300000 * s.rental_days, 0) END,
       CASE WHEN s.service_type = 'TOUR'
            THEN JSON_OBJECT('tourDate', DATE_FORMAT(DATE_ADD(CURRENT_DATE, INTERVAL s.day_offset DAY), '%Y-%m-%d'), 'people', s.quantity, 'pickupLocation', s.pickup_location)
            ELSE JSON_OBJECT('pickupLocation', s.pickup_location, 'dropoffLocation', s.dropoff_location, 'rentalDays', s.rental_days, 'driverRequired', s.driver_required, 'driverFee', IF(s.driver_required, 300000 * s.rental_days, 0)) END
FROM demo_travel_orders s
JOIN orders o ON o.order_code = s.order_code
LEFT JOIN tours t ON s.service_type = 'TOUR' AND t.id = s.service_id
LEFT JOIN cars car ON s.service_type = 'CAR_RENTAL' AND car.id = s.service_id
WHERE NOT EXISTS (
  SELECT 1 FROM order_items existing
  WHERE existing.order_id = o.id AND existing.service_type = s.service_type AND existing.service_id = s.service_id
);

DROP TEMPORARY TABLE demo_travel_orders;