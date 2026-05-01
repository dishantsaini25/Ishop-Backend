require('dotenv').config();
const express = require('express');
const cookieParser = require('cookie-parser');
const mongoose = require('mongoose');
const cors = require('cors');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const notificationRouter = require('./routers/notification.router');

const server = express();
server.use(express.json());
server.use(express.static("public"));
server.use(cookieParser());
server.use(cors({ origin: "http://localhost:3000", credentials: true }));

// Routes
server.use('/category', require('./routers/category.router'));
server.use('/brands', require('./routers/brand.router'));
server.use('/colors', require('./routers/color.router'));
server.use('/products', require('./routers/product.router'));
server.use("/user", require("./routers/user.router.js"));
server.use("/cart", require("./routers/cart.router.js"));
server.use("/order", require("./routers/order.router.js"));
server.use("/admin", require("./routers/admin.router.js"));
server.use('/api', notificationRouter);
const httpServer = http.createServer(server);

const io = socketIo(httpServer, {
    cors: {
        origin: "*",
        credentials: true
    }
});

const connectedAdmins = new Map();
io.use((socket, next) => {
    try {
        const token = socket.handshake.auth?.token;

        if (!token) {
            return next(new Error("No token"));
        }

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
    
    if (socket.adminId) {
        connectedAdmins.set(socket.adminId, socket.id);
    }
    
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

mongoose.connect(process.env.DATABASE_URL).then(
    () => {
        console.log("Connected to MongoDB");
        httpServer.listen(process.env.PORT || 5000, () => {
            console.log('Server is running on port 5000');
            console.log('Socket.io is ready for real-time notifications');
        });
    }
).catch((err) => {
    console.log("Error connecting to MongoDB", err);
});