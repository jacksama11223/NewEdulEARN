
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';
import { createServer } from 'http';
import { Server } from 'socket.io';

// 1. Config
dotenv.config();
connectDB(); // Connect to MongoDB

const app = express();
const httpServer = createServer(app); // Wrap Express app with HTTP Server
const PORT = process.env.PORT || 5000;

// 2. Setup Socket.IO
const io = new Server(httpServer, {
    cors: {
        origin: "*", // Allow all origins for demo purposes
        methods: ["GET", "POST", "PUT", "DELETE"]
    }
});

// Socket Logic
io.on('connection', (socket) => {
    console.log(`🔌 Client connected: ${socket.id}`);

    // User joins their own personal room (for 1-on-1 chat)
    socket.on('join_user', (userId) => {
        socket.join(userId);
        console.log(`👤 User ${userId} joined personal room`);
    });

    // User joins a group room (for Squad chat)
    socket.on('join_group', (groupId) => {
        socket.join(groupId);
        console.log(`🚀 Joined Squadron room: ${groupId}`);
    });

    socket.on('disconnect', () => {
        console.log('❌ Client disconnected');
    });
});

// 3. Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));

// Attach IO to request so Controllers can emit events
app.use((req, res, next) => {
    req.io = io;
    next();
});

// DEBUG LOGGING MIDDLEWARE
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next();
});

// 4. Routes
app.use('/api', apiRoutes);

// 5. Root
app.get('/', (req, res) => {
    res.send('LMS Backend (MongoDB + Gemini 3.0 + Socket.IO) is running...');
});

// 6. Start (Use httpServer instead of app)
httpServer.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
