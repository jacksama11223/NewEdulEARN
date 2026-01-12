
import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDB from './config/db.js';
import apiRoutes from './routes/api.js';

// 1. Config
dotenv.config();
connectDB(); // Connect to MongoDB

const app = express();
const PORT = process.env.PORT || 5000;

// 2. Middleware
app.use(cors()); // Allow Frontend to access
app.use(express.json({ limit: '50mb' })); // Allow large payloads (PDF/Images)

// 3. Routes
app.use('/api', apiRoutes);

// 4. Root
app.get('/', (req, res) => {
    res.send('LMS Backend (MongoDB + Gemini 3.0) is running...');
});

// 5. Start
app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
});
