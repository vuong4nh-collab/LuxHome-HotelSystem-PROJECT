require('dotenv').config();
const express = require('express');
const http = require('http');
const net = require('net');
const { Server } = require('socket.io');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const jwt = require('jsonwebtoken');

const sequelize = require('./config/database');
const { errorHandler } = require('./middlewares/errorHandler');

// ── Route imports ────────────────────────────────────────────
const authRoutes         = require('./modules/auth/auth.routes');
const hotelsRoutes       = require('./modules/hotels/hotels.routes');
const locationsRoutes    = require('./modules/hotels/locations.routes');
const roomsRoutes        = require('./modules/rooms/rooms.routes');
const customersRoutes    = require('./modules/customers/customers.routes');
const bookingsRoutes     = require('./modules/bookings/bookings.routes');
const checkinRoutes      = require('./modules/checkin/checkin.routes');
const housekeepingRoutes = require('./modules/housekeeping/housekeeping.routes');
const servicesRoutes     = require('./modules/services/services.routes');
const invoicesRoutes     = require('./modules/invoices/invoices.routes');
const dashboardRoutes    = require('./modules/dashboard/dashboard.routes');
const notificationsRoutes= require('./modules/notifications/notifications.routes');
const aiRoutes           = require('./modules/ai/ai.routes');
const paymentsRoutes     = require('./modules/payments/payments.routes');
const toursRoutes        = require('./modules/tours/tours.routes');
const carRentalsRoutes   = require('./modules/car-rentals/car-rentals.routes');
const ordersRoutes       = require('./modules/orders/orders.routes');
const ordersController   = require('./modules/orders/orders.controller');
const toursController    = require('./modules/tours/tours.controller');
const carRentalsController = require('./modules/car-rentals/car-rentals.controller');

// ── App setup ────────────────────────────────────────────────
const app = express();
const server = http.createServer(app);

// ── Socket.IO ────────────────────────────────────────────────
const io = new Server(server, {
  cors: {
    origin: [
      process.env.CLIENT_STAFF_URL || 'http://localhost:3001',
      process.env.CLIENT_CUSTOMER_URL || 'http://localhost:3002',
    ],
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

io.use((socket, next) => {
  const token = socket.handshake.auth?.token;
  if (!token) return next(new Error('Authentication required'));
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch {
    next(new Error('Invalid token'));
  }
});

io.on('connection', (socket) => {
  console.log(`🔌 Socket connected: user ${socket.userId}`);
  socket.join(`user_${socket.userId}`);

  socket.on('join:room', (roomId) => socket.join(`room_${roomId}`));
  socket.on('leave:room', (roomId) => socket.leave(`room_${roomId}`));

  socket.on('disconnect', () => {
    console.log(`🔌 Socket disconnected: user ${socket.userId}`);
  });
});

// ── Middlewares ───────────────────────────────────────────────
app.use(helmet({ crossOriginEmbedderPolicy: false }));
app.use(cors({
  origin: [
    process.env.CLIENT_STAFF_URL || 'http://localhost:3001',
    process.env.CLIENT_CUSTOMER_URL || 'http://localhost:3002',
    'http://localhost:3000',
  ],
  credentials: true,
}));
app.use(morgan('combined'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Welcome & Health check
app.get(['/', '/api'], (_, res) => res.json({
  success: true,
  name: 'LuxStay Hotel Management REST API',
  version: '1.0.0',
  status: 'ONLINE',
  timestamp: new Date().toISOString(),
  endpoints: {
    health: '/health',
    auth: '/api/auth/login',
    availableRooms: '/api/rooms/available',
    staffDashboard: 'http://localhost:3001',
    customerPWA: 'http://localhost:3000',
  }
}));

app.get('/health', (_, res) => res.json({
  status: 'OK', timestamp: new Date().toISOString(), uptime: process.uptime(),
}));

// ── Routes ───────────────────────────────────────────────────
const API = '/api';
app.use(`${API}/auth`,          authRoutes);
app.use(`${API}/hotels`,        hotelsRoutes);
app.use(`${API}`,               locationsRoutes);
app.use(`${API}/rooms`,         roomsRoutes);
app.use(`${API}/customers`,     customersRoutes);
app.use(`${API}/bookings`,      bookingsRoutes);
app.use(`${API}/ai`,            aiRoutes);            // 🤖 AI Concierge (public, trước mount /api rộng)
app.use(`${API}`,               checkinRoutes);   // /api/checkin/:id & /api/checkout/:id
app.use(`${API}/housekeeping`,  housekeepingRoutes);
app.use(`${API}/services`,      servicesRoutes);
app.use(`${API}/invoices`,      invoicesRoutes);
app.use(`${API}/dashboard`,     dashboardRoutes);
app.use(`${API}/notifications`, notificationsRoutes);
app.use(`${API}/payments`,    paymentsRoutes);
app.use(`${API}/tours`,       toursRoutes);
app.use(`${API}/cars`,        carRentalsRoutes);
app.use(`${API}/orders`,      ordersRoutes);
app.post(`${API}/checkout`,   ordersController.checkout);

// City & Location nested endpoints for Tours & Cars
app.get(`${API}/cities/:cityId/tours`, toursController.getToursByCity);
app.get(`${API}/locations/:locationId/tours`, toursController.getToursByLocation);
app.get(`${API}/cities/:cityId/cars`, carRentalsController.getCarsByCity);
app.get(`${API}/locations/:locationId/cars`, carRentalsController.getCarsByLocation);

// 404 handler
app.use((req, res) => {
  res.status(404).json({ success: false, message: `Route ${req.method} ${req.url} not found` });
});

// Global error handler
app.use(errorHandler);

// ── Database connection & server start ───────────────────────
const PORT = process.env.PORT || 5000;
const DB_RETRY_DELAY_MS = 3000;
const RETRYABLE_DB_ERRORS = new Set([
  'ECONNREFUSED',
  'ECONNRESET',
  'ETIMEDOUT',
  'EHOSTUNREACH',
  'ENOTFOUND',
]);

const getAvailablePort = async (basePort = PORT, maxAttempts = 10) => {
  let port = Number(basePort);
  if (!Number.isInteger(port) || port <= 0) {
    port = 5000;
  }

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const candidate = port + attempt;
    const isAvailable = await new Promise((resolve) => {
      const tester = net.createServer();
      tester.once('error', (err) => {
        resolve(err.code !== 'EADDRINUSE');
      });
      tester.once('listening', () => {
        tester.close(() => resolve(true));
      });
      tester.listen(candidate, '0.0.0.0');
    });

    if (isAvailable) {
      return candidate;
    }
  }

  throw new Error(`No free port found starting from ${basePort} after ${maxAttempts} attempts.`);
};

const startServer = async () => {
  while (true) {
    try {
      await sequelize.authenticate();
      break;
    } catch (err) {
      const code = err.original?.code || err.parent?.code || err.code;
      if (!RETRYABLE_DB_ERRORS.has(code)) {
        console.error('❌ Failed to start server:', err);
        process.exit(1);
      }

      console.error(`❌ Database unavailable (${code}); retrying in ${DB_RETRY_DELAY_MS / 1000}s`);
      await new Promise((resolve) => setTimeout(resolve, DB_RETRY_DELAY_MS));
    }
  }

  console.log('✅ Database connection established');

  // Sync models (do NOT use force:true in production!)
  // await sequelize.sync({ alter: true });

  const selectedPort = await getAvailablePort(PORT, 10);

  server.listen(selectedPort, '0.0.0.0', () => {
    console.log(`🚀 Hotel Management API running on port ${selectedPort}`);
    console.log(`📋 Environment: ${process.env.NODE_ENV}`);
    console.log(`🔗 Health: http://localhost:${selectedPort}/health`);
  });

  return selectedPort;
};

if (require.main === module) {
  startServer();
}

module.exports = { app, io, startServer, getAvailablePort };
