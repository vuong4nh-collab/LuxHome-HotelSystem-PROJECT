-- ============================================================
-- Hotel Management System — Full Database Schema
-- MySQL 8.0
-- ============================================================

CREATE DATABASE IF NOT EXISTS hotel_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE hotel_management;

SET FOREIGN_KEY_CHECKS = 0;

-- ────────────────────────────────────────────────────────────
-- ROLES & USERS (Authentication & Authorization)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hotel_chains (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(120) NOT NULL,
    code VARCHAR(30) NOT NULL UNIQUE,
    country VARCHAR(60) DEFAULT 'Vietnam',
    headquarters_city VARCHAR(80),
    status ENUM('Active','Inactive','Pending') DEFAULT 'Active',
    description TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
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
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (hotel_id) REFERENCES hotels(id)
);

CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name ENUM('Admin','Manager','Receptionist','Staff','Customer') NOT NULL UNIQUE,
    description VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    role_id INT NOT NULL,
    hotel_branch_id INT,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL UNIQUE,
    phone VARCHAR(20),
    password_hash VARCHAR(255) NOT NULL,
    avatar_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_login DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (role_id) REFERENCES roles(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- CUSTOMERS (khách hàng — có thể linked với user)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT UNIQUE,                    -- linked user account (nullable)
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    id_type ENUM('CCCD','Passport','Other') DEFAULT 'CCCD',
    id_number VARCHAR(50) UNIQUE,
    nationality VARCHAR(50) DEFAULT 'Vietnamese',
    date_of_birth DATE,
    gender ENUM('Male','Female','Other'),
    loyalty_points INT DEFAULT 0,
    notes TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- ROOM TYPES & ROOMS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS room_types (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,   -- Standard, Deluxe, Suite, Presidential
    description TEXT,
    base_price DECIMAL(12,2) NOT NULL,
    max_guests INT NOT NULL DEFAULT 2,
    amenities JSON,                     -- ["WiFi","TV","MiniBar",...]
    image_url VARCHAR(255),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id INT NOT NULL,
    hotel_branch_id INT NOT NULL DEFAULT 1,
    room_number VARCHAR(10) NOT NULL,
    floor INT NOT NULL DEFAULT 1,
    status ENUM('Available','Reserved','Occupied','Cleaning','Maintenance','Deactivated') DEFAULT 'Available',
    description TEXT,
    image_url VARCHAR(255),
    is_active BOOLEAN DEFAULT TRUE,
    last_cleaned_at DATETIME,
    notes TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id)
);

-- Giá phòng theo mùa / thời điểm
CREATE TABLE IF NOT EXISTS room_prices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id INT NOT NULL,
    price_type ENUM('Weekday','Weekend','Holiday','Seasonal') DEFAULT 'Weekday',
    price DECIMAL(12,2) NOT NULL,
    valid_from DATE,
    valid_to DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id)
);

-- ────────────────────────────────────────────────────────────
-- BOOKINGS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    hotel_branch_id INT NOT NULL DEFAULT 1,
    room_id INT NOT NULL,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    actual_checkin DATETIME,
    actual_checkout DATETIME,
    num_guests INT NOT NULL DEFAULT 1,
    status ENUM('Pending','Confirmed','CheckedIn','CheckedOut','Cancelled','NoShow') DEFAULT 'Pending',
    cancellation_reason TEXT,
    special_requests TEXT,
    total_nights INT GENERATED ALWAYS AS (DATEDIFF(checkout_date, checkin_date)) STORED,
    room_price_per_night DECIMAL(12,2) NOT NULL,
    room_price_total DECIMAL(12,2) NOT NULL,
    extra_fee DECIMAL(12,2) DEFAULT 0.00,
    extended_hours INT DEFAULT 0,
    discount_amount DECIMAL(12,2) DEFAULT 0.00,
    booking_source ENUM('Web','Staff','Phone','Walkin') DEFAULT 'Web',
    confirmed_by INT,                  -- user_id của receptionist xác nhận
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (confirmed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- SERVICES & SERVICE ORDERS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS services (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    category ENUM('Food','Beverage','Spa','Laundry','Transport','Other') DEFAULT 'Other',
    description TEXT,
    price DECIMAL(12,2) NOT NULL,
    unit VARCHAR(20) DEFAULT 'item',
    image_url VARCHAR(255),
    is_available BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS service_orders (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    hotel_branch_id INT NOT NULL DEFAULT 1,
    requested_by INT,                  -- user_id of customer or staff
    status ENUM('Pending','Processing','Completed','Cancelled') DEFAULT 'Pending',
    notes TEXT,
    total_amount DECIMAL(12,2) DEFAULT 0.00,
    processed_by INT,                  -- staff user_id
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id),
    FOREIGN KEY (requested_by) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

CREATE TABLE IF NOT EXISTS service_order_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    service_order_id INT NOT NULL,
    service_id INT NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    subtotal DECIMAL(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED,
    notes VARCHAR(255),
    FOREIGN KEY (service_order_id) REFERENCES service_orders(id) ON DELETE CASCADE,
    FOREIGN KEY (service_id) REFERENCES services(id)
);

-- ────────────────────────────────────────────────────────────
-- HOUSEKEEPING
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS housekeeping_tasks (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    hotel_branch_id INT NOT NULL DEFAULT 1,
    assigned_to INT,                   -- housekeeping staff user_id
    task_type ENUM('Cleaning','Turndown','Inspection','Maintenance','DeepClean') DEFAULT 'Cleaning',
    priority ENUM('Low','Normal','High','Urgent') DEFAULT 'Normal',
    status ENUM('Pending','InProgress','Done','Skipped') DEFAULT 'Pending',
    scheduled_at DATETIME,
    started_at DATETIME,
    completed_at DATETIME,
    notes TEXT,
    created_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id),
    FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE SET NULL,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- INVOICES & PAYMENTS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    hotel_branch_id INT NOT NULL DEFAULT 1,
    invoice_number VARCHAR(30) NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    room_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    service_charge DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    extra_fee DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    discount_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    total_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
    status ENUM('Draft','Issued','Paid','Overdue','Cancelled','Refunded') DEFAULT 'Draft',
    notes TEXT,
    issued_at DATETIME,
    due_date DATE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id)
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    description VARCHAR(255) NOT NULL,
    item_type ENUM('Room','Service','Extra','Discount','Tax') NOT NULL,
    quantity INT DEFAULT 1,
    unit_price DECIMAL(12,2) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    FOREIGN KEY (invoice_id) REFERENCES invoices(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    invoice_id INT NOT NULL,
    hotel_branch_id INT NOT NULL DEFAULT 1,
    amount DECIMAL(12,2) NOT NULL,
    payment_method ENUM('Cash','CreditCard','BankTransfer','QRCode','Momo','VNPay') DEFAULT 'Cash',
    transaction_ref VARCHAR(100),
    status ENUM('Pending','Success','Failed','Refunded') DEFAULT 'Pending',
    processed_by INT,
    paid_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    notes VARCHAR(255),
    FOREIGN KEY (invoice_id) REFERENCES invoices(id),
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id),
    FOREIGN KEY (processed_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- NOTIFICATIONS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS notifications (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,                       -- NULL = broadcast
    hotel_branch_id INT NOT NULL DEFAULT 1,
    type ENUM('Booking','CheckIn','CheckOut','ServiceOrder','Housekeeping','Payment','System') NOT NULL,
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    related_id INT,                    -- booking_id, task_id, etc.
    related_type VARCHAR(50),
    is_read BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (hotel_branch_id) REFERENCES hotel_branches(id)
);

-- ────────────────────────────────────────────────────────────
-- REVIEWS
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS reviews (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL UNIQUE,
    customer_id INT NOT NULL,
    room_id INT NOT NULL,
    rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
    cleanliness_rating INT CHECK (cleanliness_rating BETWEEN 1 AND 5),
    service_rating INT CHECK (service_rating BETWEEN 1 AND 5),
    comment TEXT,
    is_public BOOLEAN DEFAULT TRUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

-- ────────────────────────────────────────────────────────────
-- CONSULTATION REQUESTS (giữ từ hệ thống cũ)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS consultation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_type_id INT,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    checkin_date DATE,
    checkout_date DATE,
    num_guests INT DEFAULT 1,
    note TEXT,
    status ENUM('New','Contacted','Converted','Closed') DEFAULT 'New',
    handled_by INT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_type_id) REFERENCES room_types(id) ON DELETE SET NULL,
    FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- AUDIT LOG
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_logs (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(50),
    entity_id INT,
    old_values JSON,
    new_values JSON,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ────────────────────────────────────────────────────────────
-- INDEXES for performance
-- ────────────────────────────────────────────────────────────
CREATE INDEX idx_rooms_status ON rooms(status);
CREATE INDEX idx_rooms_type ON rooms(room_type_id);
CREATE INDEX idx_bookings_customer ON bookings(customer_id);
CREATE INDEX idx_bookings_room ON bookings(room_id);
CREATE INDEX idx_bookings_status ON bookings(status);
CREATE INDEX idx_bookings_dates ON bookings(checkin_date, checkout_date);
CREATE INDEX idx_hk_tasks_room ON housekeeping_tasks(room_id);
CREATE INDEX idx_hk_tasks_assigned ON housekeeping_tasks(assigned_to);
CREATE INDEX idx_hk_tasks_status ON housekeeping_tasks(status);
CREATE INDEX idx_notifications_user ON notifications(user_id, is_read);
CREATE INDEX idx_invoices_booking ON invoices(booking_id);

SET FOREIGN_KEY_CHECKS = 1;
