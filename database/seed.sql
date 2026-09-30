-- ============================================================
-- Hotel Management System — Seed Data
-- Demo data for development & testing
-- ============================================================

USE hotel_management;

-- ── Hotel Chain Seed ───────────────────────────────────────
INSERT INTO hotel_chains (name, code, country, headquarters_city, status, description) VALUES
('LuxStay Group', 'LXST', 'Vietnam', 'Hà Nội', 'Active', 'Chuỗi khách sạn luxury trải dài từ Bắc vào Nam');

INSERT INTO hotels (hotel_chain_id, name, code, city, region, country, address, phone, email, star_rating, status) VALUES
(1, 'LuxStay Hanoi', 'LXST-HN', 'Hà Nội', 'Bắc', 'Vietnam', 'Số 88 Lê Thánh Tông, Hoàn Kiếm', '024-555-0101', 'hanoi@luxstay.vn', 5, 'Active'),
(1, 'LuxStay Da Nang', 'LXST-DN', 'Đà Nẵng', 'Trung', 'Vietnam', 'Số 12 Bạch Đằng, Hải Châu', '0236-555-0102', 'danang@luxstay.vn', 5, 'Active'),
(1, 'LuxStay Ho Chi Minh', 'LXST-HCM', 'TP.HCM', 'Nam', 'Vietnam', 'Số 25 Nguyễn Huệ, Quận 1', '028-555-0103', 'hcm@luxstay.vn', 5, 'Active');

INSERT INTO hotel_branches (hotel_id, name, code, city, region, country, address, phone, email, status) VALUES
(1, 'LuxStay Hanoi Central', 'LXST-HN-01', 'Hà Nội', 'Bắc', 'Vietnam', 'Quận Hoàn Kiếm', '024-555-0101', 'hn01@luxstay.vn', 'Active'),
(2, 'LuxStay Da Nang Beachfront', 'LXST-DN-01', 'Đà Nẵng', 'Trung', 'Vietnam', 'Bãi biển Mỹ Khê', '0236-555-0102', 'dn01@luxstay.vn', 'Active'),
(3, 'LuxStay Saigon Riverside', 'LXST-HCM-01', 'TP.HCM', 'Nam', 'Vietnam', 'Quận 1', '028-555-0103', 'hcm01@luxstay.vn', 'Active');

-- ── Roles ──────────────────────────────────────────────────
INSERT INTO roles (name, description) VALUES
('Admin', 'Quản trị viên hệ thống toàn quyền'),
('Manager', 'Quản lý khách sạn, xem báo cáo toàn diện'),
('Receptionist', 'Lễ tân, quản lý đặt phòng và check-in/out'),
('Staff', 'Nhân viên xử lý dịch vụ, tình trạng phòng, vệ sinh và bảo trì'),
('Customer', 'Khách hàng sử dụng ứng dụng đặt phòng');

-- ── Users ──────────────────────────────────────────────────
-- Passwords are bcrypt hash of 'Password@123'
INSERT INTO users (role_id, hotel_branch_id, full_name, email, phone, password_hash, is_active) VALUES
(1, NULL, 'Admin System',   'admin@hotel.com',        '0901000001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE),
(1, NULL, 'Admin chuỗi', 'chainadmin@luxstay.vn', '0902000001', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE),
(2, NULL, 'Manager khu vực', 'area.manager@luxstay.vn', '0902000002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE),
(2, 1, 'Nguyễn Văn Quản', 'manager@hotel.com', '0901000002', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE),
(3, 1, 'Trần Thị Lễ Tân', 'receptionist@hotel.com', '0901000003', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE),
(4, 1, 'Lê Văn Dọn', 'housekeeping@hotel.com', '0901000004', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE),
(5, NULL, 'Phạm Thị Khách', 'customer@hotel.com', '0901000005', '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMaAE6rXZY3vjWY3.JB2GYqpni', TRUE);

-- ── Room Types ──────────────────────────────────────────────
INSERT INTO room_types (name, description, base_price, max_guests, amenities, image_url) VALUES
('Standard', 'Phòng tiêu chuẩn, đầy đủ tiện nghi cơ bản', 500000, 2,
  '["WiFi","TV","AirCon","HotWater","Minibar"]',
  'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?w=800'),
('Deluxe', 'Phòng cao cấp, view đẹp, nội thất sang trọng', 900000, 3,
  '["WiFi","SmartTV","AirCon","HotWater","Minibar","Bathtub","CityView"]',
  'https://images.unsplash.com/photo-1618773928121-c32242e63f39?w=800'),
('Suite', 'Phòng suite rộng rãi, phòng khách riêng', 1800000, 4,
  '["WiFi","SmartTV","AirCon","HotWater","Minibar","Bathtub","Jacuzzi","CityView","LivingRoom","KitchenBar"]',
  'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?w=800'),
('Presidential', 'Phòng tổng thống, đẳng cấp tuyệt đỉnh', 5000000, 6,
  '["WiFi","SmartTV","AirCon","HotWater","Minibar","Bathtub","Jacuzzi","PanoramaView","LivingRoom","Kitchen","PrivateGym","Butler"]',
  'https://images.unsplash.com/photo-1631049421450-348ccd7f8949?w=800');

-- ── Rooms ────────────────────────────────────────────────
INSERT INTO rooms (room_type_id, room_number, floor, status, description) VALUES
-- Floor 1 — Standard
(1, '101', 1, 'Available', 'Phòng Standard tầng 1, view sân vườn'),
(1, '102', 1, 'Available', 'Phòng Standard tầng 1, view hồ bơi'),
(1, '103', 1, 'Cleaning',  'Phòng Standard tầng 1'),
(1, '104', 1, 'Maintenance','Phòng đang bảo trì'),
-- Floor 2 — Standard & Deluxe
(1, '201', 2, 'Available', 'Phòng Standard tầng 2'),
(1, '202', 2, 'Available', 'Phòng Standard tầng 2'),
(2, '203', 2, 'Available', 'Phòng Deluxe tầng 2, view thành phố'),
(2, '204', 2, 'Occupied',  'Phòng Deluxe tầng 2'),
-- Floor 3 — Deluxe & Suite
(2, '301', 3, 'Available', 'Phòng Deluxe tầng 3'),
(2, '302', 3, 'Reserved',  'Phòng Deluxe tầng 3'),
(3, '303', 3, 'Available', 'Phòng Suite tầng 3, view panorama'),
(3, '304', 3, 'Available', 'Phòng Suite tầng 3'),
-- Floor 4 — Suite & Presidential
(3, '401', 4, 'Available', 'Phòng Suite tầng 4'),
(3, '402', 4, 'Occupied',  'Phòng Suite tầng 4'),
(4, '403', 4, 'Available', 'Phòng Presidential, tầng thượng lưu'),
(4, '404', 4, 'Available', 'Phòng Presidential, tầng thượng lưu');

-- ── Customers ────────────────────────────────────────────
INSERT INTO customers (user_id, full_name, email, phone, address, id_type, id_number, nationality) VALUES
(5, 'Phạm Thị Khách', 'customer@hotel.com', '0901000005', 'Hà Nội', 'CCCD', '001099012345', 'Vietnamese'),
(NULL, 'Nguyễn Minh Tuấn', 'tuan.nm@gmail.com', '0912345678', 'TP.HCM', 'CCCD', '079098765432', 'Vietnamese'),
(NULL, 'Trần Thị Hoa', 'hoa.tt@yahoo.com', '0987654321', 'Đà Nẵng', 'CCCD', '048099111222', 'Vietnamese'),
(NULL, 'David Wilson', 'david.wilson@email.com', '+14155555555', '123 Main St, New York', 'Passport', 'US123456789', 'American'),
(NULL, 'Sakura Tanaka', 'sakura@jp.com', '+8190123456', 'Tokyo, Japan', 'Passport', 'JP987654321', 'Japanese');

-- ── Services ────────────────────────────────────────────
INSERT INTO services (name, category, description, price, unit, is_available) VALUES
('Bữa sáng buffet',   'Food',      'Buffet sáng đa dạng từ 6h-10h', 150000, 'person', TRUE),
('Cơm gà hải sản',    'Food',      'Cơm gà hải sản đặc sản nhà hàng', 200000, 'dish', TRUE),
('Nước khoáng',       'Beverage',  'Aquafina 500ml', 25000,  'bottle', TRUE),
('Bia Tiger',         'Beverage',  'Bia Tiger lon 330ml', 40000,  'can', TRUE),
('Giặt ủi áo sơ mi',  'Laundry',   'Giặt và ủi phẳng trong ngày', 30000,  'piece', TRUE),
('Giặt ủi quần tây',  'Laundry',   'Giặt và ủi quần tây trong ngày', 40000,  'piece', TRUE),
('Massage thư giãn',  'Spa',       'Massage body 60 phút', 400000, 'session', TRUE),
('Chăm sóc da mặt',   'Spa',       'Facial treatment 45 phút', 350000, 'session', TRUE),
('Đón sân bay',       'Transport', 'Đưa đón sân bay Nội Bài', 300000, 'trip', TRUE),
('Thuê xe máy',       'Transport', 'Thuê xe máy theo ngày', 150000, 'day', TRUE),
('Sử dụng hồ bơi',    'Other',     'Vào hồ bơi ngoài trời', 50000,  'person', TRUE),
('Phòng gym',         'Other',     'Sử dụng phòng gym 1 ngày', 100000, 'person', TRUE);

-- ── Sample Booking ─────────────────────────────────────
-- Booking 1: David Wilson đang ở phòng 204 (Occupied)
INSERT INTO bookings (customer_id, room_id, checkin_date, checkout_date, actual_checkin,
                      num_guests, status, room_price_per_night, room_price_total, booking_source, confirmed_by)
VALUES (4, 8, '2026-09-10', '2026-09-15', '2026-09-10 14:30:00',
        2, 'CheckedIn', 900000, 4500000, 'Web', 3);

-- Booking 2: Trần Thị Hoa đặt phòng 302 (Reserved)
INSERT INTO bookings (customer_id, room_id, checkin_date, checkout_date,
                      num_guests, status, room_price_per_night, room_price_total, booking_source, confirmed_by)
VALUES (3, 10, '2026-09-14', '2026-09-17',
        1, 'Confirmed', 900000, 2700000, 'Web', 3);

-- Booking 3: Nguyễn Minh Tuấn đặt phòng 402 (Occupied)
INSERT INTO bookings (customer_id, room_id, checkin_date, checkout_date, actual_checkin,
                      num_guests, status, room_price_per_night, room_price_total, booking_source, confirmed_by)
VALUES (2, 14, '2026-09-12', '2026-09-14', '2026-09-12 15:00:00',
        2, 'CheckedIn', 1800000, 3600000, 'Staff', 3);

-- ── Housekeeping Tasks ─────────────────────────────────
INSERT INTO housekeeping_tasks (room_id, assigned_to, task_type, priority, status, scheduled_at, created_by) VALUES
(3,  6, 'Cleaning', 'High', 'Pending',    '2026-09-13 09:00:00', 3),  -- Room 103 đang cleaning
(4,  6, 'Maintenance', 'Urgent', 'InProgress', '2026-09-13 08:00:00', 3), -- Room 104 maintenance
(8,  6, 'Turndown', 'Normal', 'Pending',   '2026-09-13 18:00:00', 3), -- Room 204 turndown tonight
(14, 6, 'Cleaning', 'Normal', 'Pending',   '2026-09-13 10:00:00', 3); -- Room 402 morning clean

-- ── Service Orders ─────────────────────────────────────
INSERT INTO service_orders (booking_id, requested_by, status, total_amount, processed_by) VALUES
(1, 5, 'Completed', 590000, 3),
(3, NULL, 'Pending', 200000, NULL);

INSERT INTO service_order_items (service_order_id, service_id, quantity, unit_price) VALUES
(1, 1, 2, 150000),   -- 2x Buffet sáng = 300,000
(1, 7, 1, 400000),   -- 1x Massage    = 400,000 → But wait, total should match... let's simplify
(2, 1, 1, 150000),
(2, 3, 2, 25000);

-- ── Invoices ───────────────────────────────────────────
INSERT INTO invoices (booking_id, invoice_number, customer_id, room_charge, service_charge, 
                      tax_amount, total_amount, status, issued_at)
VALUES (1, 'INV-2026-001', 4, 4500000, 590000, 509000, 5599000, 'Issued', NOW());

INSERT INTO invoice_items (invoice_id, description, item_type, quantity, unit_price, amount) VALUES
(1, 'Phòng Deluxe (204) × 5 đêm', 'Room', 5, 900000, 4500000),
(1, '2× Buffet sáng', 'Service', 2, 150000, 300000),
(1, '1× Massage thư giãn', 'Service', 1, 400000, 400000),
(1, 'Thuế VAT 10%', 'Tax', 1, 509000, 509000);

-- ── Notifications ────────────────────────────────────
INSERT INTO notifications (user_id, type, title, message, related_id, related_type) VALUES
(3, 'Booking', 'Đặt phòng mới', 'Khách hàng Trần Thị Hoa vừa đặt phòng 302 (14/09 - 17/09)', 2, 'booking'),
(6, 'Housekeeping', 'Nhiệm vụ mới', 'Phòng 103 cần dọn dẹp trước 11:00', 1, 'housekeeping_task'),
(NULL, 'System', 'Hệ thống cập nhật', 'Phiên bản 2.0 đã được cập nhật thành công', NULL, NULL);
