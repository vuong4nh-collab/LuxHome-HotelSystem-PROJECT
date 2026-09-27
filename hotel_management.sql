

CREATE DATABASE ql_khachsan;
USE ql_khachsan;

CREATE TABLE rooms (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_number VARCHAR(10) NOT NULL UNIQUE,
    room_type ENUM('Standard','Deluxe','Suite') NOT NULL,
    status ENUM('Empty','Booked','Occupied','Deactivated') DEFAULT 'Empty',
    price DECIMAL(10,2) NOT NULL,
    image_url VARCHAR(255),
    description VARCHAR(255),
    max_guests INT NOT NULL DEFAULT 2
);

CREATE TABLE customers (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    phone VARCHAR(20),
    address VARCHAR(255),
    id_type ENUM('CCCD','Passport') DEFAULT 'CCCD',
    id_number VARCHAR(20) UNIQUE
);

CREATE TABLE supplies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    unit VARCHAR(20) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    quantity INT DEFAULT 0
);

CREATE TABLE bookings (
    id INT AUTO_INCREMENT PRIMARY KEY,
    customer_id INT NOT NULL,
    room_id INT NOT NULL,
    checkin_date DATE NOT NULL,
    checkout_date DATE NOT NULL,
    actual_checkin DATETIME,
    actual_checkout DATETIME,
    status ENUM('Booked','Cancelled','CheckedIn','CheckedOut') DEFAULT 'Booked',
    booking_date DATETIME DEFAULT CURRENT_TIMESTAMP,
    extended_hours INT DEFAULT 0,
    extra_fee DECIMAL(10,2) DEFAULT 0.00,
    room_price DECIMAL(10,2) NOT NULL DEFAULT 0.00,
    room_number VARCHAR(10) NOT NULL DEFAULT '',
    room_type ENUM('Standard','Deluxe','Suite') NOT NULL DEFAULT 'Standard',
    room_image_url VARCHAR(255),
    FOREIGN KEY (customer_id) REFERENCES customers(id),
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);

CREATE TABLE invoices (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    status ENUM('Paid','Unpaid','Cancelled') DEFAULT 'Unpaid',
    payment_method ENUM('Cash','BankTransfer') DEFAULT 'Cash',
    FOREIGN KEY (booking_id) REFERENCES bookings(id)
);

CREATE TABLE booking_supplies (
    id INT AUTO_INCREMENT PRIMARY KEY,
    booking_id INT NOT NULL,
    supply_id INT NOT NULL,
    quantity INT NOT NULL,
    used_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (booking_id) REFERENCES bookings(id),
    FOREIGN KEY (supply_id) REFERENCES supplies(id)
);

CREATE TABLE consultation_requests (
    id INT AUTO_INCREMENT PRIMARY KEY,
    room_id INT NOT NULL,
    full_name VARCHAR(100),
    phone VARCHAR(20),
    email VARCHAR(100),
    note VARCHAR(255),
    status ENUM('New','Contacted','Closed') DEFAULT 'New',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (room_id) REFERENCES rooms(id)
);
ALTER TABLE invoices MODIFY amount DECIMAL(15,2);
