# LuxStay Hotel Management System — Plan A Complete Implementation

Hệ thống Quản lý Khách sạn 5 sao toàn diện bao gồm **Backend RESTful API + Socket.IO**, **Staff Web Dashboard**, và **Customer Mobile PWA App**.

---

## 🌟 Kiến Trúc & Công Nghệ

```
HotelManagement/
├── backend/                  ← Node.js + Express + Sequelize ORM + Socket.IO
│   ├── src/
│   │   ├── config/           ← Cấu hình DB & JWT
│   │   ├── middlewares/      ← Authentication & Authorization (RBAC)
│   │   ├── models/           ← Sequelize Models (Users, Rooms, Bookings, Housekeeping, Invoices...)
│   │   └── modules/          ← Auth, Rooms, Customers, Bookings, Checkin, HK, Services, Invoices, Dashboard
│   └── Dockerfile
├── frontend/
│   ├── staff-web/            ← Web Quản trị / Lễ tân / Buồng phòng (React + Vite, Port 3001)
│   └── customer-pwa/         ← Web App PWA Khách hàng Đặt phòng & Order dịch vụ (React + Vite, Port 3000/3002)
├── database/
│   ├── schema.sql            ← Schema MySQL khởi tạo tự động
│   └── seed.sql              ← Seed data dữ liệu mẫu phong phú
└── docker-compose.yml        ← Điều phối container 1-click launch
```

---

## 🚀 Hướng Dẫn Chạy Nhanh (Quick Start)

### Cách 1: Chạy bằng Docker Compose (Khuyên dùng - 1 click)

```bash
# Clone repository & chuyển vào thư mục dự án
cd HotelManagement

# Khởi chạy tất cả container (Database MySQL, Backend API, Staff Web, Customer PWA)
docker-compose up -d --build
```

Sau khi các container hoàn tất khởi động:
- 📊 **Staff Web Dashboard (Lễ tân/Quản lý):** http://localhost:3001
- 📱 **Customer PWA (Khách hàng):** http://localhost:3002
- ⚡ **Backend API Server:** http://localhost:5000/api

---

### Cách 2: Chạy Thủ Công Không Dùng Docker

#### 1. Cấu hình Database MySQL
Khởi tạo database `hotel_management` và nạp schema + seed data:
```bash
mysql -u root -p hotel_management < database/schema.sql
mysql -u root -p hotel_management < database/seed.sql
```

#### 2. Chạy Backend Node.js API
```bash
cd backend
npm install
npm run dev
```

#### 3. Chạy Staff Web Frontend
```bash
cd frontend/staff-web
npm install
npm run dev
```

#### 4. Chạy Customer PWA Frontend
```bash
cd frontend/customer-pwa
npm install
npm run dev
```

---

## 🔑 Tài Khoản Đăng Nhập Thử Nghiệm

| Vai Trò | Username | Password | Quyền Hạn |
|---|---|---|---|
| **Admin** | `admin` | `Admin123!` | Toàn quyền xem báo cáo, quản lý phòng, nhân viên, hóa đơn |
| **Lễ Tân** | `receptionist` | `Staff123!` | Tạo đặt phòng, check-in, check-out, lập hóa đơn |
| **Buồng Phòng** | `housekeeper` | `Staff123!` | Xem nhiệm vụ dọn dẹp, đổi trạng thái phòng |

---

## 🔄 Quy Trình CI/CD (GitHub Actions)

Dự án đã tích hợp sẵn luồng **CI/CD tự động** thông qua GitHub Actions (`.github/workflows/ci-cd.yml`):

1. **Continuous Integration (CI)**:
   - Tự động chạy **Lint & Syntax Test** cho Backend Express Node.js với MySQL Service Container.
   - Tự động kiểm tra **Build Bundle** cho **Staff Web Dashboard** (React + Vite).
   - Tự động kiểm tra **Build Bundle & PWA Asset** cho **Customer PWA App** (React + Service Worker).
2. **Continuous Deployment (CD)**:
   - Tự động đóng gói và build các **Docker Image** (Backend, Staff Web, Customer PWA) mỗi khi code được push lên nhánh `main` hoặc `master`.

---

## 🛠️ Danh Sách API Chi Tiết (Backend Endpoints)

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, `GET /api/auth/me`
- **Phòng**: `GET /api/rooms/available`, `POST /api/rooms`, `PATCH /api/rooms/:id/status`
- **Đặt Phòng**: `POST /api/bookings`, `PUT /api/bookings/:id/cancel`, `GET /api/bookings/:id`
- **Check-in / Check-out**: `POST /api/checkin/:bookingId`, `POST /api/checkout/:bookingId`
- **Buồng Phòng**: `GET /api/housekeeping/tasks`, `PATCH /api/housekeeping/tasks/:id/status`
- **Order Dịch Vụ**: `GET /api/services`, `POST /api/service-orders`
- **Hóa Đơn & Thanh Toán**: `GET /api/invoices/:bookingId`, `POST /api/invoices/:id/pay`
- **Dashboard**: `GET /api/dashboard/summary`, `GET /api/dashboard/occupancy`

---

## ✨ Tính Năng Nổi Bật

1. **Dashboard Realtime**: Theo dõi tỷ lệ lấp đầy phòng, doanh thu trong ngày và số lượt Check-in/out.
2. **Sơ Đồ Phòng Trực Quan**: Phân loại theo tầng và mã màu trạng thái (Available, Occupied, Dirty, Maintenance).
3. **PWA Mobile**: Khách hàng có thể quét mã QR mở phòng, gọi đồ ăn bít tết/rượu vang tận phòng, xem tổng chi phí tức thì.
4. **Quy trình Check-out tự động**: Tính toán tiền phòng + phí dịch vụ phát sinh - tiền cọc và in hóa đơn giao dịch chuẩn nét.
