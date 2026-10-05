const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

// ── Hotel Chain / Property Structure ─────────────────────────
const HotelChain = sequelize.define('HotelChain', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(120), allowNull: false },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  country: { type: DataTypes.STRING(60), defaultValue: 'Vietnam' },
  headquarters_city: DataTypes.STRING(80),
  status: { type: DataTypes.ENUM('Active','Inactive','Pending'), defaultValue: 'Active' },
  description: DataTypes.TEXT,
}, { tableName: 'hotel_chains' });

const Hotel = sequelize.define('Hotel', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hotel_chain_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  slug: DataTypes.STRING(160),
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  city: { type: DataTypes.STRING(80), allowNull: false },
  city_id: DataTypes.INTEGER,
  region: DataTypes.STRING(60),
  country: { type: DataTypes.STRING(60), defaultValue: 'Vietnam' },
  address: DataTypes.STRING(255),
  phone: DataTypes.STRING(30),
  email: DataTypes.STRING(120),
  star_rating: { type: DataTypes.INTEGER, defaultValue: 4 },
  status: { type: DataTypes.ENUM('Active','Inactive','Maintenance'), defaultValue: 'Active' },
  description: DataTypes.TEXT,
}, { tableName: 'hotels' });

const City = sequelize.define('City', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  slug: { type: DataTypes.STRING(120), allowNull: false, unique: true },
  description: DataTypes.TEXT,
  image: DataTypes.STRING(255),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'cities' });

const Location = sequelize.define('Location', {
  id: { type: DataTypes.INTEGER, primaryKey: true },
  city_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  slug: { type: DataTypes.STRING(120), allowNull: false },
  description: DataTypes.TEXT,
  image: DataTypes.STRING(255),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'locations' });

const HotelLocation = sequelize.define('HotelLocation', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hotel_id: { type: DataTypes.INTEGER, allowNull: false },
  location_id: { type: DataTypes.INTEGER, allowNull: false },
  distance_km: { type: DataTypes.DECIMAL(6, 2), defaultValue: 0 },
  is_primary: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'hotel_locations', updatedAt: false });

const HotelBranch = sequelize.define('HotelBranch', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  hotel_id: { type: DataTypes.INTEGER, allowNull: false },
  name: { type: DataTypes.STRING(120), allowNull: false },
  code: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  city: { type: DataTypes.STRING(80), allowNull: false },
  region: DataTypes.STRING(60),
  country: { type: DataTypes.STRING(60), defaultValue: 'Vietnam' },
  address: DataTypes.STRING(255),
  phone: DataTypes.STRING(30),
  email: DataTypes.STRING(120),
  timezone: { type: DataTypes.STRING(50), defaultValue: 'Asia/Ho_Chi_Minh' },
  status: { type: DataTypes.ENUM('Active','Inactive','Closed'), defaultValue: 'Active' },
  latitude: DataTypes.DECIMAL(9,6),
  longitude: DataTypes.DECIMAL(9,6),
  description: DataTypes.TEXT,
}, { tableName: 'hotel_branches' });

// ── Role ──────────────────────────────────────────────────────
const Role = sequelize.define('Role', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.ENUM('Admin','Manager','Receptionist','Staff','Customer'), allowNull: false, unique: true },
  description: DataTypes.STRING(255),
}, { tableName: 'roles', updatedAt: false });

// ── User ──────────────────────────────────────────────────────
const User = sequelize.define('User', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  role_id: { type: DataTypes.INTEGER, allowNull: false },
  hotel_branch_id: DataTypes.INTEGER,
  full_name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  phone: DataTypes.STRING(20),
  password_hash: { type: DataTypes.STRING(255), allowNull: false },
  avatar_url: DataTypes.STRING(255),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_login: DataTypes.DATE,
}, { tableName: 'users' });

// ── Customer ──────────────────────────────────────────────────
const Customer = sequelize.define('Customer', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: { type: DataTypes.INTEGER, unique: true },
  full_name: { type: DataTypes.STRING(100), allowNull: false },
  email: { type: DataTypes.STRING(100), allowNull: false, unique: true },
  phone: DataTypes.STRING(20),
  address: DataTypes.STRING(255),
  id_type: { type: DataTypes.ENUM('CCCD','Passport','Other'), defaultValue: 'CCCD' },
  id_number: { type: DataTypes.STRING(50), unique: true },
  nationality: { type: DataTypes.STRING(50), defaultValue: 'Vietnamese' },
  date_of_birth: DataTypes.DATEONLY,
  gender: DataTypes.ENUM('Male','Female','Other'),
  loyalty_points: { type: DataTypes.INTEGER, defaultValue: 0 },
  notes: DataTypes.TEXT,
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'customers' });

// ── RoomType ──────────────────────────────────────────────────
const RoomType = sequelize.define('RoomType', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  description: DataTypes.TEXT,
  base_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  max_guests: { type: DataTypes.INTEGER, defaultValue: 2 },
  amenities: { type: DataTypes.JSON },
  image_url: DataTypes.STRING(255),
}, { tableName: 'room_types', updatedAt: false });

// ── Room ──────────────────────────────────────────────────────
const Room = sequelize.define('Room', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_type_id: { type: DataTypes.INTEGER, allowNull: false },
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  room_number: { type: DataTypes.STRING(10), allowNull: false },
  floor: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: {
    type: DataTypes.ENUM('Available','Reserved','Occupied','Cleaning','Maintenance','Deactivated'),
    defaultValue: 'Available',
  },
  description: DataTypes.TEXT,
  image_url: DataTypes.STRING(255),
  is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  last_cleaned_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
}, { tableName: 'rooms' });

// ── Booking ───────────────────────────────────────────────────
const Booking = sequelize.define('Booking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: DataTypes.INTEGER,
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  checkin_date: { type: DataTypes.DATEONLY, allowNull: false },
  checkout_date: { type: DataTypes.DATEONLY, allowNull: false },
  actual_checkin: DataTypes.DATE,
  actual_checkout: DataTypes.DATE,
  num_guests: { type: DataTypes.INTEGER, defaultValue: 1 },
  status: {
    type: DataTypes.ENUM('Pending','Confirmed','CheckedIn','CheckedOut','Cancelled','NoShow'),
    defaultValue: 'Pending',
  },
  cancellation_reason: DataTypes.TEXT,
  special_requests: DataTypes.TEXT,
  room_price_per_night: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  room_price_total: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  extra_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  extended_hours: { type: DataTypes.INTEGER, defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  booking_source: { type: DataTypes.ENUM('Web','Staff','Phone','Walkin'), defaultValue: 'Web' },
  confirmed_by: DataTypes.INTEGER,
  booking_date: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
}, { tableName: 'bookings', createdAt: 'booking_date' });

// ── Service ───────────────────────────────────────────────────
const Service = sequelize.define('Service', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(100), allowNull: false },
  category: { type: DataTypes.ENUM('Food','Beverage','Spa','Laundry','Transport','Other'), defaultValue: 'Other' },
  description: DataTypes.TEXT,
  price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  unit: { type: DataTypes.STRING(20), defaultValue: 'item' },
  image_url: DataTypes.STRING(255),
  is_available: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'services' });

// ── ServiceOrder ──────────────────────────────────────────────
const ServiceOrder = sequelize.define('ServiceOrder', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  booking_id: { type: DataTypes.INTEGER, allowNull: false },
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  requested_by: DataTypes.INTEGER,
  status: { type: DataTypes.ENUM('Pending','Processing','Completed','Cancelled'), defaultValue: 'Pending' },
  notes: DataTypes.TEXT,
  total_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  processed_by: DataTypes.INTEGER,
}, { tableName: 'service_orders' });

// ── ServiceOrderItem ──────────────────────────────────────────
const ServiceOrderItem = sequelize.define('ServiceOrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  service_order_id: { type: DataTypes.INTEGER, allowNull: false },
  service_id: { type: DataTypes.INTEGER, allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  notes: DataTypes.STRING(255),
}, { tableName: 'service_order_items', updatedAt: false, timestamps: false });

// ── HousekeepingTask ──────────────────────────────────────────
const HousekeepingTask = sequelize.define('HousekeepingTask', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  assigned_to: DataTypes.INTEGER,
  task_type: { type: DataTypes.ENUM('Cleaning','Turndown','Inspection','Maintenance','DeepClean'), defaultValue: 'Cleaning' },
  priority: { type: DataTypes.ENUM('Low','Normal','High','Urgent'), defaultValue: 'Normal' },
  status: { type: DataTypes.ENUM('Pending','InProgress','Done','Skipped'), defaultValue: 'Pending' },
  scheduled_at: DataTypes.DATE,
  started_at: DataTypes.DATE,
  completed_at: DataTypes.DATE,
  notes: DataTypes.TEXT,
  created_by: DataTypes.INTEGER,
}, { tableName: 'housekeeping_tasks' });

// ── Invoice ───────────────────────────────────────────────────
const Invoice = sequelize.define('Invoice', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  booking_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  invoice_number: { type: DataTypes.STRING(30), allowNull: false, unique: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  room_charge: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  service_charge: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  extra_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  tax_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  total_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  status: { type: DataTypes.ENUM('Draft','Issued','Paid','Overdue','Cancelled','Refunded'), defaultValue: 'Draft' },
  notes: DataTypes.TEXT,
  issued_at: DataTypes.DATE,
  due_date: DataTypes.DATEONLY,
}, { tableName: 'invoices' });

// ── InvoiceItem ───────────────────────────────────────────────
const InvoiceItem = sequelize.define('InvoiceItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: false },
  description: { type: DataTypes.STRING(255), allowNull: false },
  item_type: { type: DataTypes.ENUM('Room','Service','Extra','Discount','Tax'), allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
}, { tableName: 'invoice_items', timestamps: false });

// ── Payment ───────────────────────────────────────────────────
const Payment = sequelize.define('Payment', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  invoice_id: { type: DataTypes.INTEGER, allowNull: true },
  order_id: { type: DataTypes.INTEGER, allowNull: true },
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: true, defaultValue: 1 },
  amount: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  payment_method: { type: DataTypes.ENUM('Cash','CreditCard','BankTransfer','QRCode','Momo','VNPay'), defaultValue: 'Cash' },
  transaction_ref: DataTypes.STRING(100),
  status: { type: DataTypes.ENUM('Pending','Success','Failed','Refunded'), defaultValue: 'Pending' },
  processed_by: DataTypes.INTEGER,
  paid_at: { type: DataTypes.DATE, defaultValue: DataTypes.NOW },
  notes: DataTypes.STRING(255),
}, { tableName: 'payments', timestamps: false });

// ── Notification ──────────────────────────────────────────────
const Notification = sequelize.define('Notification', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  user_id: DataTypes.INTEGER,
  hotel_branch_id: { type: DataTypes.INTEGER, allowNull: false, defaultValue: 1 },
  type: { type: DataTypes.ENUM('Booking','CheckIn','CheckOut','ServiceOrder','Housekeeping','Payment','System'), allowNull: false },
  title: { type: DataTypes.STRING(200), allowNull: false },
  message: { type: DataTypes.TEXT, allowNull: false },
  related_id: DataTypes.INTEGER,
  related_type: DataTypes.STRING(50),
  is_read: { type: DataTypes.BOOLEAN, defaultValue: false },
}, { tableName: 'notifications', updatedAt: false });

// ── Review ────────────────────────────────────────────────────
const Review = sequelize.define('Review', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  booking_id: { type: DataTypes.INTEGER, allowNull: false, unique: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  room_id: { type: DataTypes.INTEGER, allowNull: false },
  rating: { type: DataTypes.INTEGER, allowNull: false },
  cleanliness_rating: DataTypes.INTEGER,
  service_rating: DataTypes.INTEGER,
  comment: DataTypes.TEXT,
  is_public: { type: DataTypes.BOOLEAN, defaultValue: true },
}, { tableName: 'reviews', updatedAt: false });

// ── ConsultationRequest ───────────────────────────────────────
const ConsultationRequest = sequelize.define('ConsultationRequest', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  room_type_id: DataTypes.INTEGER,
  full_name: DataTypes.STRING(100),
  phone: DataTypes.STRING(20),
  email: DataTypes.STRING(100),
  checkin_date: DataTypes.DATEONLY,
  checkout_date: DataTypes.DATEONLY,
  num_guests: { type: DataTypes.INTEGER, defaultValue: 1 },
  note: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('New','Contacted','Converted','Closed'), defaultValue: 'New' },
  handled_by: DataTypes.INTEGER,
}, { tableName: 'consultation_requests', updatedAt: false });

// ── Unified Order & OrderItem ─────────────────────────────────
const Order = sequelize.define('Order', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  customer_id: { type: DataTypes.INTEGER, allowNull: false },
  order_code: { type: DataTypes.STRING(50), allowNull: false, unique: true },
  total_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  discount_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  final_amount: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  payment_status: {
    type: DataTypes.ENUM('UNPAID','PENDING','PAID','FAILED','REFUNDED','PARTIALLY_REFUNDED'),
    defaultValue: 'UNPAID',
  },
  order_status: {
    type: DataTypes.ENUM('PENDING_PAYMENT','CONFIRMED','IN_PROGRESS','COMPLETED','CANCELLED'),
    defaultValue: 'PENDING_PAYMENT',
  },
  contact_name: DataTypes.STRING(100),
  contact_email: DataTypes.STRING(100),
  contact_phone: DataTypes.STRING(20),
  special_requests: DataTypes.TEXT,
}, { tableName: 'orders' });

const OrderItem = sequelize.define('OrderItem', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  service_type: { type: DataTypes.ENUM('HOTEL','TOUR','CAR_RENTAL'), allowNull: false },
  service_id: { type: DataTypes.INTEGER, allowNull: false },
  item_name: { type: DataTypes.STRING(200), allowNull: false },
  quantity: { type: DataTypes.INTEGER, defaultValue: 1 },
  unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  metadata: DataTypes.JSON,
}, { tableName: 'order_items', updatedAt: false });

// ── Tour Models ───────────────────────────────────────────────
const Tour = sequelize.define('Tour', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(200), allowNull: false },
  slug: { type: DataTypes.STRING(200), allowNull: false, unique: true },
  description: DataTypes.TEXT,
  city_id: { type: DataTypes.INTEGER, allowNull: false },
  location_id: DataTypes.INTEGER,
  duration: { type: DataTypes.STRING(50), allowNull: false },
  price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  max_participants: { type: DataTypes.INTEGER, defaultValue: 20 },
  thumbnail: DataTypes.STRING(255),
  status: { type: DataTypes.ENUM('Active','Inactive'), defaultValue: 'Active' },
  cancellation_policy: DataTypes.TEXT,
}, { tableName: 'tours' });

const TourSchedule = sequelize.define('TourSchedule', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tour_id: { type: DataTypes.INTEGER, allowNull: false },
  start_datetime: { type: DataTypes.DATE, allowNull: false },
  end_datetime: { type: DataTypes.DATE, allowNull: false },
  available_slots: { type: DataTypes.INTEGER, defaultValue: 20 },
  booked_slots: { type: DataTypes.INTEGER, defaultValue: 0 },
  status: { type: DataTypes.ENUM('Open','Full','Cancelled','Completed'), defaultValue: 'Open' },
  meeting_point: DataTypes.STRING(255),
}, { tableName: 'tour_schedules' });

const TourItinerary = sequelize.define('TourItinerary', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  tour_id: { type: DataTypes.INTEGER, allowNull: false },
  sequence: { type: DataTypes.INTEGER, defaultValue: 1 },
  title: { type: DataTypes.STRING(200), allowNull: false },
  description: DataTypes.TEXT,
  start_time: DataTypes.STRING(20),
  end_time: DataTypes.STRING(20),
  location: DataTypes.STRING(200),
}, { tableName: 'tour_itineraries', updatedAt: false });

const TourBooking = sequelize.define('TourBooking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  tour_id: { type: DataTypes.INTEGER, allowNull: false },
  schedule_id: DataTypes.INTEGER,
  tour_date: { type: DataTypes.DATEONLY, allowNull: false },
  number_of_people: { type: DataTypes.INTEGER, defaultValue: 1 },
  pickup_location: DataTypes.STRING(255),
  unit_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  status: { type: DataTypes.ENUM('Pending','Confirmed','Completed','Cancelled'), defaultValue: 'Pending' },
}, { tableName: 'tour_bookings' });

// ── Car Rental Models ─────────────────────────────────────────
const Car = sequelize.define('Car', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  name: { type: DataTypes.STRING(150), allowNull: false },
  brand: { type: DataTypes.STRING(80), allowNull: false },
  model: { type: DataTypes.STRING(80), allowNull: false },
  type: { type: DataTypes.ENUM('Sedan','SUV','Hatchback','MPV','Pickup','Luxury'), defaultValue: 'SUV' },
  seats: { type: DataTypes.INTEGER, defaultValue: 5 },
  transmission: { type: DataTypes.ENUM('Automatic','Manual'), defaultValue: 'Automatic' },
  fuel_type: { type: DataTypes.ENUM('Electric','Petrol','Diesel'), defaultValue: 'Petrol' },
  price_per_day: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  city_id: { type: DataTypes.INTEGER, allowNull: false },
  location_id: DataTypes.INTEGER,
  image: DataTypes.STRING(255),
  description: DataTypes.TEXT,
  status: { type: DataTypes.ENUM('Available','Rented','Maintenance'), defaultValue: 'Available' },
}, { tableName: 'cars' });

const CarRentalBooking = sequelize.define('CarRentalBooking', {
  id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
  order_id: { type: DataTypes.INTEGER, allowNull: false },
  car_id: { type: DataTypes.INTEGER, allowNull: false },
  pickup_location: DataTypes.STRING(255),
  dropoff_location: DataTypes.STRING(255),
  pickup_datetime: { type: DataTypes.DATE, allowNull: false },
  return_datetime: { type: DataTypes.DATE, allowNull: false },
  rental_days: { type: DataTypes.INTEGER, defaultValue: 1 },
  driver_required: { type: DataTypes.BOOLEAN, defaultValue: false },
  driver_fee: { type: DataTypes.DECIMAL(12,2), defaultValue: 0 },
  price_per_day: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  total_price: { type: DataTypes.DECIMAL(12,2), allowNull: false },
  status: { type: DataTypes.ENUM('Pending','Confirmed','Active','Completed','Cancelled'), defaultValue: 'Pending' },
}, { tableName: 'car_rental_bookings' });

// ════════════════════════════════════════════════════════════
// ASSOCIATIONS
// ════════════════════════════════════════════════════════════
HotelChain.hasMany(Hotel, { foreignKey: 'hotel_chain_id', as: 'hotels' });
Hotel.belongsTo(HotelChain, { foreignKey: 'hotel_chain_id', as: 'chain' });

City.hasMany(Location, { foreignKey: 'city_id', as: 'locations' });
Location.belongsTo(City, { foreignKey: 'city_id', as: 'city' });
City.hasMany(Hotel, { foreignKey: 'city_id', as: 'hotels' });
Hotel.belongsTo(City, { foreignKey: 'city_id', as: 'cityDetails' });
Hotel.belongsToMany(Location, { through: HotelLocation, foreignKey: 'hotel_id', otherKey: 'location_id', as: 'locations' });
Location.belongsToMany(Hotel, { through: HotelLocation, foreignKey: 'location_id', otherKey: 'hotel_id', as: 'hotels' });

Hotel.hasMany(HotelBranch, { foreignKey: 'hotel_id', as: 'branches' });
HotelBranch.belongsTo(Hotel, { foreignKey: 'hotel_id', as: 'hotel' });

HotelChain.hasMany(HotelBranch, { foreignKey: 'hotel_id', as: 'chainBranches' });

Role.hasMany(User, { foreignKey: 'role_id' });
User.belongsTo(Role, { foreignKey: 'role_id', as: 'role' });

User.hasOne(Customer, { foreignKey: 'user_id' });
Customer.belongsTo(User, { foreignKey: 'user_id', as: 'user' });

HotelBranch.hasMany(User, { foreignKey: 'hotel_branch_id', as: 'staff' });
User.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });

RoomType.hasMany(Room, { foreignKey: 'room_type_id' });
Room.belongsTo(RoomType, { foreignKey: 'room_type_id', as: 'roomType' });

HotelBranch.hasMany(Room, { foreignKey: 'hotel_branch_id', as: 'rooms' });
Room.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });

Customer.hasMany(Booking, { foreignKey: 'customer_id' });
Booking.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });
Room.hasMany(Booking, { foreignKey: 'room_id' });
Booking.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
HotelBranch.hasMany(Booking, { foreignKey: 'hotel_branch_id', as: 'bookings' });
Booking.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });

// Unified Order Associations
Customer.hasMany(Order, { foreignKey: 'customer_id', as: 'orders' });
Order.belongsTo(Customer, { foreignKey: 'customer_id', as: 'customer' });

Order.hasMany(OrderItem, { foreignKey: 'order_id', as: 'items' });
OrderItem.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(Booking, { foreignKey: 'order_id', as: 'hotelBookings' });
Booking.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(TourBooking, { foreignKey: 'order_id', as: 'tourBookings' });
TourBooking.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(CarRentalBooking, { foreignKey: 'order_id', as: 'carRentals' });
CarRentalBooking.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

Order.hasMany(Payment, { foreignKey: 'order_id', as: 'payments' });
Payment.belongsTo(Order, { foreignKey: 'order_id', as: 'order' });

// Tour Associations
City.hasMany(Tour, { foreignKey: 'city_id', as: 'tours' });
Tour.belongsTo(City, { foreignKey: 'city_id', as: 'city' });
Location.hasMany(Tour, { foreignKey: 'location_id', as: 'tours' });
Tour.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });

Tour.hasMany(TourSchedule, { foreignKey: 'tour_id', as: 'schedules' });
TourSchedule.belongsTo(Tour, { foreignKey: 'tour_id', as: 'tour' });

Tour.hasMany(TourItinerary, { foreignKey: 'tour_id', as: 'itineraries' });
TourItinerary.belongsTo(Tour, { foreignKey: 'tour_id', as: 'tour' });

Tour.hasMany(TourBooking, { foreignKey: 'tour_id', as: 'bookings' });
TourBooking.belongsTo(Tour, { foreignKey: 'tour_id', as: 'tour' });
TourSchedule.hasMany(TourBooking, { foreignKey: 'schedule_id', as: 'bookings' });
TourBooking.belongsTo(TourSchedule, { foreignKey: 'schedule_id', as: 'schedule' });

// Car Rental Associations
City.hasMany(Car, { foreignKey: 'city_id', as: 'cars' });
Car.belongsTo(City, { foreignKey: 'city_id', as: 'city' });
Location.hasMany(Car, { foreignKey: 'location_id', as: 'cars' });
Car.belongsTo(Location, { foreignKey: 'location_id', as: 'location' });

Car.hasMany(CarRentalBooking, { foreignKey: 'car_id', as: 'rentals' });
CarRentalBooking.belongsTo(Car, { foreignKey: 'car_id', as: 'car' });

// Service / Housekeeping / Invoice
Booking.hasMany(ServiceOrder, { foreignKey: 'booking_id' });
ServiceOrder.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });
HotelBranch.hasMany(ServiceOrder, { foreignKey: 'hotel_branch_id', as: 'serviceOrders' });
ServiceOrder.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });
ServiceOrder.hasMany(ServiceOrderItem, { foreignKey: 'service_order_id', as: 'items' });
ServiceOrderItem.belongsTo(ServiceOrder, { foreignKey: 'service_order_id' });
Service.hasMany(ServiceOrderItem, { foreignKey: 'service_id' });
ServiceOrderItem.belongsTo(Service, { foreignKey: 'service_id', as: 'service' });

Room.hasMany(HousekeepingTask, { foreignKey: 'room_id' });
HousekeepingTask.belongsTo(Room, { foreignKey: 'room_id', as: 'room' });
User.hasMany(HousekeepingTask, { foreignKey: 'assigned_to', as: 'assignedTasks' });
HousekeepingTask.belongsTo(User, { foreignKey: 'assigned_to', as: 'assignee' });
HotelBranch.hasMany(HousekeepingTask, { foreignKey: 'hotel_branch_id', as: 'tasks' });
HousekeepingTask.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });

Booking.hasOne(Invoice, { foreignKey: 'booking_id' });
Invoice.belongsTo(Booking, { foreignKey: 'booking_id', as: 'booking' });
HotelBranch.hasMany(Invoice, { foreignKey: 'hotel_branch_id', as: 'invoices' });
Invoice.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });
Invoice.hasMany(InvoiceItem, { foreignKey: 'invoice_id', as: 'items' });
InvoiceItem.belongsTo(Invoice, { foreignKey: 'invoice_id' });
Invoice.hasMany(Payment, { foreignKey: 'invoice_id', as: 'payments' });
Payment.belongsTo(Invoice, { foreignKey: 'invoice_id', as: 'invoice' });
HotelBranch.hasMany(Payment, { foreignKey: 'hotel_branch_id', as: 'payments' });
Payment.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });

User.hasMany(Notification, { foreignKey: 'user_id' });
Notification.belongsTo(User, { foreignKey: 'user_id', as: 'user' });
HotelBranch.hasMany(Notification, { foreignKey: 'hotel_branch_id', as: 'notifications' });
Notification.belongsTo(HotelBranch, { foreignKey: 'hotel_branch_id', as: 'branch' });

module.exports = {
  sequelize,
  HotelChain, Hotel, HotelBranch, City, Location, HotelLocation,
  Role, User, Customer,
  RoomType, Room,
  Booking,
  Service, ServiceOrder, ServiceOrderItem,
  HousekeepingTask,
  Invoice, InvoiceItem, Payment,
  Notification, Review, ConsultationRequest,
  Order, OrderItem,
  Tour, TourSchedule, TourItinerary, TourBooking,
  Car, CarRentalBooking,
};
