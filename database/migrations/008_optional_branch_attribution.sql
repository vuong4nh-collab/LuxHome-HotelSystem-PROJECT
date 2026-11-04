UPDATE invoices i
JOIN bookings b ON b.id = i.booking_id
SET i.hotel_branch_id = b.hotel_branch_id;

UPDATE housekeeping_tasks h
JOIN rooms r ON r.id = h.room_id
SET h.hotel_branch_id = r.hotel_branch_id;

UPDATE payments p
JOIN invoices i ON i.id = p.invoice_id
SET p.hotel_branch_id = i.hotel_branch_id
WHERE p.hotel_branch_id = 1;

UPDATE payments p
JOIN bookings b ON b.order_id = p.order_id
SET p.hotel_branch_id = b.hotel_branch_id
WHERE p.hotel_branch_id = 1;

UPDATE notifications n
JOIN bookings b ON n.related_type = 'booking' AND n.related_id = b.id
SET n.hotel_branch_id = b.hotel_branch_id
WHERE n.hotel_branch_id = 1;

UPDATE notifications n
JOIN orders o ON n.related_type = 'order' AND n.related_id = o.id
JOIN bookings b ON b.order_id = o.id
SET n.hotel_branch_id = b.hotel_branch_id
WHERE n.hotel_branch_id = 1;

ALTER TABLE payments
  MODIFY invoice_id INT NULL,
  MODIFY hotel_branch_id INT NULL DEFAULT NULL;

ALTER TABLE notifications
  MODIFY hotel_branch_id INT NULL DEFAULT NULL;

ALTER TABLE invoices
  MODIFY hotel_branch_id INT NOT NULL;

ALTER TABLE housekeeping_tasks
  MODIFY hotel_branch_id INT NOT NULL;
