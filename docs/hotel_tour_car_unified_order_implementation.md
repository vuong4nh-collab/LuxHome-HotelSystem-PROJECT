# Implementation Plan — Hotel + Tour + Car Rental + Unified Orders

## 0. Phạm vi

**Hotel đã hoàn thành và đã có dữ liệu. Không xây lại Hotel.**

Lần triển khai này bổ sung:
1. Tour du lịch
2. Thuê xe
3. Unified Order — một đơn hàng chứa một hoặc nhiều dịch vụ
4. Thanh toán một lần cho toàn bộ đơn
5. Trang Đơn hàng hiển thị Hotel + Tour + Car
6. Cart/Trip để khách thêm nhiều dịch vụ trước khi checkout

---

## 1. Kiến trúc

```text
Customer
   |
   v
  Order
   |
   +-- Hotel Booking
   +-- Tour Booking
   +-- Car Rental Booking
```

Một Order có thể là:

```text
Hotel
Hotel + Tour
Hotel + Car
Tour + Car
Hotel + Tour + Car
```

Không bắt buộc khách phải đặt cả 3.

---

# 2. Module Tour

Tạo:

```text
backend/src/modules/tours/
├── controllers/
├── services/
├── repositories/
├── routes/
├── validators/
├── models/
└── dto/
```

## Tour

```text
Tour
├── id
├── name
├── slug
├── description
├── city_id
├── location_id
├── duration
├── price
├── max_participants
├── thumbnail
├── status
├── cancellation_policy
├── created_at
└── updated_at
```

Quan hệ:

```text
City 1 --- N Tour
Location 1 --- N Tour
```

Tour nên gắn với City và có thể gắn Location.

## TourSchedule

```text
TourSchedule
├── id
├── tour_id
├── start_datetime
├── end_datetime
├── available_slots
├── booked_slots
├── status
└── meeting_point
```

Quan hệ:

```text
Tour 1 --- N TourSchedule
```

## TourItinerary

```text
TourItinerary
├── id
├── tour_id
├── sequence
├── title
├── description
├── start_time
├── end_time
└── location
```

## Tour API

```http
GET /api/tours
GET /api/tours/:id
GET /api/cities/:cityId/tours
GET /api/locations/:locationId/tours
GET /api/tours/:id/schedules
GET /api/tours/search
```

Search hỗ trợ:

```text
city
location
date
guests
minPrice
maxPrice
```

---

# 3. Module Car Rental

Tạo:

```text
backend/src/modules/car-rentals/
├── controllers/
├── services/
├── repositories/
├── routes/
├── validators/
├── models/
└── dto/
```

## Car

```text
Car
├── id
├── name
├── brand
├── model
├── type
├── seats
├── transmission
├── fuel_type
├── price_per_day
├── city_id
├── location_id
├── image
├── description
└── status
```

## CarRental

```text
CarRental
├── id
├── car_id
├── pickup_datetime
├── return_datetime
└── status
```

Backend phải kiểm tra thời gian thuê có bị trùng booking hay không.

## API

```http
GET /api/cars
GET /api/cars/:id
GET /api/cities/:cityId/cars
GET /api/locations/:locationId/cars
GET /api/cars/search
```

Search:

```text
city
location
pickupDate
returnDate
seats
carType
minPrice
maxPrice
```

---

# 4. Unified Order

## Nguyên tắc

Không tạo 3 hệ thống Order độc lập.

```text
                    ORDER
                      |
          +-----------+-----------+
          |           |           |
       Hotel        Tour         Car
      Booking      Booking      Rental
```

## Order

Nếu project đã có Order thì **mở rộng**, không tạo duplicate.

```text
Order
├── id
├── user_id
├── order_code
├── total_amount
├── discount_amount
├── final_amount
├── payment_status
├── order_status
├── created_at
└── updated_at
```

Order status:

```text
PENDING_PAYMENT
CONFIRMED
IN_PROGRESS
COMPLETED
CANCELLED
```

Payment status:

```text
UNPAID
PENDING
PAID
FAILED
REFUNDED
PARTIALLY_REFUNDED
```

---

# 5. Tích hợp Hotel hiện tại

**Không tạo lại Hotel Booking nếu project đã có bảng booking.**

Kiểm tra bảng booking hiện tại và chỉ bổ sung:

```text
order_id
```

Ví dụ:

```text
Booking
├── id
├── order_id       <- NEW
├── hotel_id
├── room_id
├── check_in
├── check_out
├── guests
├── price
└── status
```

Giữ nguyên toàn bộ logic Hotel hiện tại.

---

# 6. TourBooking

```text
TourBooking
├── id
├── order_id
├── tour_id
├── schedule_id
├── number_of_people
├── pickup_location
├── total_price
└── status
```

Quan hệ:

```text
Order 1 --- N TourBooking
```

---

# 7. CarRentalBooking

```text
CarRentalBooking
├── id
├── order_id
├── car_id
├── pickup_location
├── dropoff_location
├── pickup_datetime
├── return_datetime
├── driver_required
├── total_price
└── status
```

Quan hệ:

```text
Order 1 --- N CarRentalBooking
```

---

# 8. OrderItem

Có thể dùng `OrderItem` để tổng hợp dịch vụ:

```text
OrderItem
├── id
├── order_id
├── service_type
├── service_id
├── quantity
├── unit_price
├── total_price
└── metadata
```

`service_type`:

```text
HOTEL
TOUR
CAR_RENTAL
```

**Không dùng OrderItem để thay thế Booking entity.**

Booking chứa nghiệp vụ riêng của từng dịch vụ; OrderItem dùng để tổng hợp/hiển thị.

---

# 9. Cart / Trip

Để khách có thể đặt nhiều dịch vụ cùng lúc, tạo Cart/Trip.

```text
Cart
├── id
├── user_id
├── status
└── created_at
```

```text
CartItem
├── id
├── cart_id
├── service_type
├── service_id
├── quantity
├── start_date
├── end_date
└── price
```

Luồng:

```text
Hotel
  -> Add to Trip

Tour
  -> Add to Trip

Car
  -> Add to Trip

       ↓

     Checkout
       ↓
 Validate tất cả
       ↓
 Create Order
       ↓
 Create Bookings
       ↓
 Payment
```

Không tạo Booking chính thức ngay khi khách chỉ mới thêm vào Cart.

---

# 10. Checkout

Ví dụ:

```json
{
  "hotelBooking": {
    "roomId": 123,
    "checkIn": "2026-10-10",
    "checkOut": "2026-10-13",
    "guests": 2
  },
  "tourBooking": {
    "tourId": 20,
    "scheduleId": 55,
    "people": 2
  },
  "carRental": {
    "carId": 30,
    "pickup": "2026-10-10T08:00:00",
    "return": "2026-10-13T18:00:00"
  }
}
```

API:

```http
POST /api/checkout
```

Backend:

```text
1. Validate Hotel availability
2. Validate Tour schedule/slots
3. Validate Car availability
4. Lấy giá từ database
5. Calculate subtotal
6. Calculate discount
7. Create Order
8. Create Hotel Booking
9. Create Tour Booking
10. Create Car Rental Booking
11. Create Payment
12. Return Order
```

**Không tin `price`, `total`, `discount` do frontend gửi.**

---

# 11. Availability

Trước checkout phải kiểm tra lại:

### Hotel

```text
Room còn trống?
Ngày hợp lệ?
Giá hiện tại?
```

### Tour

```text
Schedule còn chỗ?
Tour active?
Ngày hợp lệ?
```

### Car

```text
Xe còn trống?
Không có booking trùng?
```

Nếu một dịch vụ không còn khả dụng thì không tạo Order confirmed.

Nên thực hiện việc tạo Order + Booking trong transaction phù hợp với database hiện tại.

---

# 12. Payment

Payment gắn với Order:

```text
Order
  ↓
Payment
  ↓
Payment Gateway
```

```text
Payment
├── id
├── order_id
├── transaction_code
├── amount
├── method
├── status
└── paid_at
```

Có thể hỗ trợ:

```text
VNPay
MoMo
Bank Transfer
Cash
```

Sau payment success:

```text
Payment = PAID
Order = CONFIRMED
Hotel Booking = CONFIRMED
Tour Booking = CONFIRMED
Car Rental = CONFIRMED
```

---

# 13. Đơn hàng

Giữ menu hiện tại:

```text
Trang chủ
Đơn hàng
Check-in
Tài khoản
Thêm
```

Đơn hàng hiển thị toàn bộ dịch vụ:

```text
ORD-20261005-0001

Phú Quốc
10/10 -> 13/10

🏨 LuxHome Bai Dai Resort
   10/10 -> 13/10

🚌 Tour 4 đảo Phú Quốc
   11/10 - 2 người

🚗 VinFast VF5
   10/10 -> 13/10

Tổng: 5.500.000đ

[ Xem chi tiết ]
```

---

# 14. Order Detail

```text
CHUYẾN ĐI PHÚ QUỐC

10/10 -> 13/10

----------------------------

🏨 KHÁCH SẠN
LuxHome Bai Dai Resort
Check-in: 10/10
Check-out: 13/10
1 phòng • 2 khách

----------------------------

🚌 TOUR
Tour 4 đảo Phú Quốc
11/10
2 người

[ Xem lịch trình ]

----------------------------

🚗 THUÊ XE
VinFast VF5
10/10 -> 13/10

----------------------------

Tổng tiền: 5.500.000đ
Thanh toán: Đã thanh toán
```

---

# 15. Order API

```http
GET /api/orders
GET /api/orders/:id
POST /api/orders
POST /api/orders/:id/cancel
POST /api/checkout
```

Order detail nên trả về:

```json
{
  "orderCode": "ORD-20261005-0001",
  "status": "CONFIRMED",
  "paymentStatus": "PAID",
  "totalAmount": 5800000,
  "discountAmount": 300000,
  "finalAmount": 5500000,
  "services": {
    "hotel": [],
    "tour": [],
    "carRental": []
  }
}
```

---

# 16. Cancellation / Refund

Mỗi dịch vụ có thể có chính sách khác nhau.

Ví dụ:

```text
Hotel:
Hủy trước 24h -> hoàn 100%

Tour:
Hủy trước 48h -> hoàn 80%

Car:
Hủy trước 24h -> hoàn 90%
```

Khi hủy Order:

```text
Order
 ↓
Check từng Booking
 ↓
Calculate refund
 ↓
Cancel eligible bookings
 ↓
Refund Payment
```

Không mặc định hoàn 100% cho tất cả dịch vụ.

---

# 17. Phân quyền

## Customer

```text
Search
View
Add to Trip
Book
Pay
Cancel
View Orders
```

## Hotel Staff

Chỉ thấy Hotel Booking thuộc cơ sở mình quản lý.

## Tour Staff / Tour Operator

Chỉ thấy Tour Booking thuộc tour mình quản lý.

## Car Rental Staff

Chỉ thấy Car Rental Booking thuộc xe/khu vực mình quản lý.

## Chain Admin

Có thể xem:

```text
Hotel
Tour
Car
Orders
Revenue
Bookings
```

---

# 18. Dashboard

Sau khi thêm Tour + Car:

```text
TOTAL ORDERS
1,250

HOTEL BOOKINGS
820

TOUR BOOKINGS
560

CAR RENTALS
310

REVENUE
1.25B
```

Lưu ý:

```text
Total Orders != Total Bookings
```

Một Order có thể chứa nhiều Booking.

---

# 19. AI — triển khai sau

Sau khi 3 loại dịch vụ hoạt động, có thể xây AI trip recommendation.

Ví dụ:

```text
Customer:
"Tôi đi Phú Quốc 3 ngày với 2 người,
ngân sách khoảng 6 triệu."
```

AI phân tích:

```text
Hotel
+
Tour
+
Car
+
Budget
+
Dates
```

Đề xuất:

```text
LuxHome Bai Dai
3 đêm        3.0M

Tour 4 đảo
2 người      1.6M

VF5
3 ngày       1.2M

----------------
Total        5.8M
```

AI có thể tối ưu combo theo ngân sách, ngày đi và sở thích.

---

# 20. API / Frontend implementation order

## Phase 1 — Tour

- [ ] Tạo Tour model
- [ ] Tạo TourSchedule
- [ ] Tạo TourItinerary
- [ ] Seed Tour data
- [ ] API Tour
- [ ] Search Tour
- [ ] Tour Detail
- [ ] Tour Booking

## Phase 2 — Car Rental

- [ ] Tạo Car model
- [ ] Tạo Car Rental Booking
- [ ] Availability
- [ ] Seed Car data
- [ ] API Car
- [ ] Search Car
- [ ] Car Detail
- [ ] Car Booking

## Phase 3 — Unified Order

- [ ] Kiểm tra Order/Booking hiện tại
- [ ] Không phá Hotel Booking
- [ ] Link Hotel Booking -> Order
- [ ] Tạo TourBooking
- [ ] Tạo CarRentalBooking
- [ ] Tạo Order tổng
- [ ] Tính tổng tiền

## Phase 4 — Cart / Trip

- [ ] Tạo Cart
- [ ] Add Hotel
- [ ] Add Tour
- [ ] Add Car
- [ ] Remove item
- [ ] Validate Cart
- [ ] Checkout

## Phase 5 — Payment

- [ ] Payment entity
- [ ] Payment flow
- [ ] Payment callback
- [ ] Update Order
- [ ] Handle payment failure
- [ ] Refund

## Phase 6 — Orders UI

- [ ] Order list
- [ ] Order detail
- [ ] Hotel section
- [ ] Tour section
- [ ] Car section
- [ ] Cancellation
- [ ] Refund status

## Phase 7 — Notification

- [ ] Booking confirmation
- [ ] Payment notification
- [ ] Cancellation notification

## Phase 8 — AI

- [ ] Analyze customer requirements
- [ ] Recommend Hotel
- [ ] Recommend Tour
- [ ] Recommend Car
- [ ] Budget-aware trip planning

---

# 21. Definition of Done

## Hotel — giữ nguyên

- [x] Hotel đã hoàn thành
- [x] Hotel có dữ liệu
- [x] Hotel search hoạt động
- [x] Hotel booking hoạt động
- [ ] Chỉ bổ sung liên kết Order nếu cần

## Tour

- [ ] Tour
- [ ] Schedule
- [ ] Itinerary
- [ ] Search
- [ ] Booking

## Car

- [ ] Car
- [ ] Availability
- [ ] Search
- [ ] Booking

## Unified Order

- [ ] Order chứa Hotel
- [ ] Order chứa Tour
- [ ] Order chứa Car
- [ ] Order chứa nhiều dịch vụ
- [ ] Backend tự tính giá
- [ ] Payment gắn với Order

## Customer UI

- [ ] Tour
- [ ] Thuê xe
- [ ] Add to Trip/Cart
- [ ] Checkout
- [ ] Đơn hàng hiển thị tất cả dịch vụ
- [ ] Order Detail hiển thị Hotel + Tour + Car

## Data integrity

- [ ] Không double booking phòng
- [ ] Không double booking tour slot
- [ ] Không double booking xe
- [ ] Không tin giá từ frontend
- [ ] Validate availability trước checkout
- [ ] Transaction khi tạo Order + Bookings
- [ ] Payment failure không tạo booking confirmed
