import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import { fileURLToPath } from 'url';
import authRoutes from './routes/auth.js';
import studentRoutes from './routes/student.js';
import officeRoutes from './routes/office.js';
import facultyRoutes from './routes/faculty.js';
import noticesRoutes from './routes/notices.js';
import reportsRoutes from './routes/reports.js';
import analyticsRoutes from './routes/analytics.js';
import phasesRoutes from './routes/phases.js';
import supervisorRoutes from './routes/supervisor.js';
import { getPKTTime } from './utils/time.js';

dotenv.config();

const app = express();
app.set('trust proxy', 1);

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
const allowedOrigins = [
    "http://localhost:5173",
    "https://internship-professional-ie1e.vercel.app"
];

app.use(cors({
    origin: (origin, callback) => {
        callback(null, true);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(morgan('dev')); // Log ALL requests to the terminal

// DB Connection Middleware for Serverless
let cachedDB = null;
const connectDB = async (req, res, next) => {
    if (mongoose.connection.readyState >= 1) {
        return next();
    }

    try {
        console.log('[DB] Connecting to MongoDB...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[DB] Connected successfully.');
        return next();
    } catch (err) {
        console.error('[DB] Connection Error:', err);
        return res.status(500).json({ message: 'Database connection failed' });
    }
};

app.use(connectDB);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/phases', phasesRoutes);
app.use('/api/supervisor', supervisorRoutes);

// Simple Health Check
app.use('/health', (req, res) => res.send('DIMS Server is Running'));
app.get('/', (req, res) => res.json({ message: 'DIMS Backend Running on Vercel' }));

// Diagnostic DB Test Route
app.get('/api/db-test', async (req, res) => {
    try {
        const state = mongoose.connection.readyState;
        const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

        // Try a manual ping if not connected
        if (state !== 1) {
            await mongoose.connect(process.env.MONGODB_URI);
        }

        res.json({
            success: true,
            status: states[mongoose.connection.readyState],
            usingUri: process.env.MONGODB_URI ? 'Yes (hidden for security)' : 'MISSING!'
        });
    } catch (err) {
        res.status(500).json({
            success: false,
            error: err.message,
            stack: err.stack.split('\n')[0]
        });
    }
});

// Export app for Vercel
export default app;

// Local Development
if (process.env.NODE_ENV !== 'production') {
    const PORT = 5000;
    app.listen(PORT, '127.0.0.1', () => {
        console.log(`Backend running on 127.0.0.1:${PORT}`);
    });
}
