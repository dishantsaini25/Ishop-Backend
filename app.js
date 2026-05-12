require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const helmet = require('helmet');
const notificationRouter = require('./routers/notification.router');

const server = express();

// ==================== SECURITY MIDDLEWARE ====================

server.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" },
  contentSecurityPolicy: false,
}));

// Rate limiting disabled
// const apiLimiter = ...
// const authLimiter = ...

// Rate limiting removed
// server.use('/user/login', authLimiter);
// server.use('/user/register', authLimiter);
// server.use('/admin/login', authLimiter);
// server.use(apiLimiter);

// ==================== CORS ====================

// Build allowed origins list — strip trailing slashes for reliable matching
const rawOrigins = [
  "http://localhost:3000",
  "http://localhost:3001",
  process.env.FRONTEND_URL,
].filter(Boolean).map(o => o.replace(/\/$/, ''));

console.log('Allowed CORS origins:', rawOrigins);

// Simple CORS configuration that works
server.use((req, res, next) => {
  const origin = req.headers.origin;
  
  // Allow requests with no origin (like mobile apps, curl, Postman, SSR)
  if (!origin) {
    res.header('Access-Control-Allow-Credentials', 'true');
    return next();
  }
  
  const normalizedOrigin = origin.replace(/\/$/, '');
  
  // Check if origin is allowed
  if (rawOrigins.includes(normalizedOrigin)) {
    res.header('Access-Control-Allow-Origin', origin);
    res.header('Access-Control-Allow-Credentials', 'true');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    res.header('Access-Control-Allow-Headers', 'Content-Type, Authorization, Cookie');
    res.header('Access-Control-Expose-Headers', 'Set-Cookie');
    
    console.log(`✓ CORS: Origin allowed: ${origin}`);
    
    // Handle preflight
    if (req.method === 'OPTIONS') {
      console.log(`✓ CORS: Preflight request handled for ${req.path}`);
      return res.status(204).end();
    }
  } else {
    console.warn(`✗ CORS: Origin blocked: ${origin}`);
  }
  
  next();
});

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
server.use('/deals', require('./routers/deal.router'));

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
    
  });
}).catch((err) => {
  console.log("Error connecting to MongoDB:", err);
  process.exit(1);
});
