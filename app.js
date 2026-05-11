require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const notificationRouter = require('./routers/notification.router');

const server = express();

// ==================== SECURITY MIDDLEWARE ====================

server.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Rate limiting
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many requests, please try again later." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, message: "Too many login attempts, please try again later." },
});

server.use('/user/login', authLimiter);
server.use('/user/register', authLimiter);
server.use('/admin/login', authLimiter);
server.use(apiLimiter);

// ==================== CORS ====================

// Build allowed origins list — strip trailing slashes for reliable matching
const rawOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean).map(o => o.replace(/\/$/, ''));

console.log('Allowed CORS origins:', rawOrigins);

server.use(cors({
  origin: (origin, callback) => {
    // No origin = server-to-server (Vercel SSR, curl, Postman) — always allow
    if (!origin) {
      console.log('No origin header - allowing (SSR/server-to-server)');
      return callback(null, true);
    }

    const normalised = origin.replace(/\/$/, '');
    console.log(`Checking origin: ${origin} (normalized: ${normalised})`);
    
    if (rawOrigins.includes(normalised)) {
      console.log(`✓ Origin allowed: ${origin}`);
      return callback(null, true);
    }

    // Unknown origin — reject with 403
    console.warn(`✗ CORS blocked origin: ${origin}`);
    return callback(new Error(`CORS blocked: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

// ==================== BODY PARSING ====================
server.use(express.json({ limit: '10mb' }));
server.use(express.urlencoded({ extended: true, limit: '10mb' }));
server.use(express.static("public"));
server.use(cookieParser());

// ==================== ROUTES ====================
server.use('/category', require('./routers/category.router'));
server.use('/brands', require('./routers/brand.router'));
server.use('/colors', require('./routers/color.router'));
server.use('/products', require('./routers/product.router'));
server.use("/user", require("./routers/user.router.js"));
server.use("/cart", require("./routers/cart.router.js"));
server.use("/order", require("./routers/order.router.js"));
server.use("/admin", require("./routers/admin.router.js"));
server.use('/api', notificationRouter);

// ==================== HEALTH CHECK ====================
server.get('/health', (req, res) => {
  res.json({ success: true, message: 'Server is running', timestamp: new Date().toISOString() });
});

// ==================== GLOBAL ERROR HANDLER ====================
server.use((err, req, res, next) => {
  console.error('Global Error:', err.message);
  if (err.message?.startsWith('CORS blocked')) {
    return res.status(403).json({ success: false, message: 'CORS policy violation' });
  }
  res.status(500).json({ success: false, message: 'Internal server error' });
});

// ==================== SOCKET.IO ====================
const httpServer = http.createServer(server);

const io = socketIo(httpServer, {
  cors: {
    origin: rawOrigins,
    credentials: true,
  }
});

const connectedAdmins = new Map();

io.use((socket, next) => {
  try {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("No token"));
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.adminId = decoded.id;
    next();
  } catch (err) {
    console.log("Socket auth error:", err.message);
    next(new Error("Authentication error"));
  }
});

io.on('connection', (socket) => {
  console.log('Admin connected:', socket.adminId);
  if (socket.adminId) connectedAdmins.set(socket.adminId, socket.id);
  socket.join('admin_room');
  socket.on('disconnect', () => {
    connectedAdmins.delete(socket.adminId);
    console.log('Admin disconnected:', socket.adminId);
  });
});

const sendAdminNotification = (notification) => {
  io.to('admin_room').emit('new_notification', notification);
};

server.set('io', io);
server.set('sendAdminNotification', sendAdminNotification);

// ==================== DATABASE + SERVER START ====================
mongoose.connect(process.env.DATABASE_URL).then(() => {
  console.log("Connected to MongoDB");
  httpServer.listen(process.env.PORT || 5000, () => {
    console.log(`Server running on port ${process.env.PORT || 5000}`);
    console.log('Allowed CORS origins:', rawOrigins);
  });
}).catch((err) => {
  console.log("Error connecting to MongoDB:", err);
  process.exit(1);
});
