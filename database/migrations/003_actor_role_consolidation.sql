-- Consolidate legacy account roles into the five supported actors.
-- The Docker init hook runs this only when the database volume is first created.
USE hotel_management;

ALTER TABLE roles
    MODIFY COLUMN name ENUM(
        'Admin', 'Manager', 'Receptionist', 'Customer', 'Staff',
        'Housekeeping', 'ChainAdmin', 'AreaManager', 'PropertyManager'
    ) NOT NULL;

INSERT INTO roles (name, description)
SELECT 'Staff', 'Nhân viên xử lý dịch vụ, tình trạng phòng, vệ sinh và bảo trì'
WHERE NOT EXISTS (SELECT 1 FROM roles WHERE name = 'Staff');

UPDATE users AS u
JOIN roles AS old_role ON old_role.id = u.role_id
JOIN roles AS target_role ON target_role.name = CASE old_role.name
    WHEN 'Housekeeping' THEN 'Staff'
    WHEN 'ChainAdmin' THEN 'Admin'
    WHEN 'AreaManager' THEN 'Manager'
    WHEN 'PropertyManager' THEN 'Manager'
END
SET u.role_id = target_role.id
WHERE old_role.name IN ('Housekeeping', 'ChainAdmin', 'AreaManager', 'PropertyManager');

DELETE FROM roles
WHERE name IN ('Housekeeping', 'ChainAdmin', 'AreaManager', 'PropertyManager');

ALTER TABLE roles
    MODIFY COLUMN name ENUM('Admin', 'Manager', 'Receptionist', 'Staff', 'Customer') NOT NULL;
