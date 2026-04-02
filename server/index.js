import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import cookieParser from 'cookie-parser';
import compression from 'compression';
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
import evaluationRoutes from './routes/evaluation.js';
import notificationRoutes from './routes/notifications.js';
import { getPKTTime } from './utils/time.js';
import { seedPhases } from './routes/phases.js';

dotenv.config();

const initDB = async () => {
    try {
        console.log('[DB] Attempting connection...');
        await mongoose.connect(process.env.MONGODB_URI);
        console.log('[DB] Connected successfully at startup.');
        await seedPhases();
    } catch (err) {
        console.error('[DB] Startup Connection Error:', err);
    }
};

initDB();

// Auto-reconnect if MongoDB drops mid-session (common on free Atlas tier)
mongoose.connection.on('disconnected', () => {
    console.warn('[DB] Disconnected. Attempting auto-reconnect in 3s...');
    setTimeout(() => {
        mongoose.connect(process.env.MONGODB_URI).catch(e =>
            console.error('[DB] Auto-reconnect failed:', e.message)
        );
    }, 3000);
});
mongoose.connection.on('error', (err) => {
    console.error('[DB] Connection error:', err.message);
});

const app = express();
app.set('trust proxy', 1);

app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ limit: '2mb', extended: true }));
const allowedOrigins = [
    "http://localhost:5173",
    "https://internship-professional-ie1e.vercel.app"
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || origin.startsWith('http')) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'Accept']
}));
app.use(cookieParser());
app.use(morgan('dev'));
app.use(compression());

const connectDB = async (req, res, next) => {
    if (mongoose.connection.readyState >= 1) return next();

    try {
        const options = {
            maxPoolSize: 10,
            serverSelectionTimeoutMS: 5000,
            socketTimeoutMS: 45000,
        };
        await mongoose.connect(process.env.MONGODB_URI, options);
        return next();
    } catch (err) {
        return res.status(500).json({ message: 'Cloud database connection timeout. Please try again.' });
    }
};

app.use(connectDB);

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/notices', noticesRoutes);
app.use('/api/reports', reportsRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/phases', phasesRoutes);
app.use('/api/supervisor', supervisorRoutes);
app.use('/api/evaluation', evaluationRoutes);
app.use('/api/notifications', notificationRoutes);

app.use('/health', (req, res) => res.send('DIMS Server is Running'));
app.get('/favicon.ico', (req, res) => res.status(204).end());
app.get('/', (req, res) => res.json({ message: 'DIMS Backend Running on Vercel' }));

app.get('/api/db-test', async (req, res) => {
    try {
        const state = mongoose.connection.readyState;
        const states = { 0: 'disconnected', 1: 'connected', 2: 'connecting', 3: 'disconnecting' };

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

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception server kept alive:', err.message);
    console.error(err.stack);
});
process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Promise Rejection server kept alive:');
    console.error('Promise:', promise);
    console.error('Reason:', reason?.stack || reason);
});

app.use((req, res) => {
    res.status(404).json({
        success: false,
        status: 404,
        message: `Route not found: ${req.method} ${req.originalUrl}`
    });
});

app.use((err, req, res, next) => {
    if (res.headersSent) return next(err);

    console.error(`[ERROR] ${req.method} ${req.originalUrl}`, {
        message: err.message,
        code: err.code,
        user: req.user?.id || 'unauthenticated'
    });

    if (err.name === 'ValidationError') {
        const fields = Object.keys(err.errors).join(', ');
        return res.status(400).json({ success: false, status: 400, message: `Validation failed for: ${fields}` });
    }

    if (err.code === 11000) {
        const field = Object.keys(err.keyValue || {})[0] || 'field';
        return res.status(409).json({ success: false, status: 409, message: `Duplicate entry: ${field} already exists.` });
    }

    if (err.name === 'CastError') {
        return res.status(400).json({ success: false, status: 400, message: `Invalid ID format for field: ${err.path}` });
    }
    if (err.name === 'JsonWebTokenError') {
        return res.status(401).json({ success: false, status: 401, message: 'Invalid token. Please log in again.' });
    }
    if (err.name === 'TokenExpiredError') {
        return res.status(401).json({ success: false, status: 401, message: 'Session expired. Please log in again.' });
    }

    const status = err.status || err.statusCode || 500;
    res.status(status).json({
        success: false,
        status,
        message: status >= 500 ? 'Internal server error. Our team has been notified.' : (err.message || 'An error occurred.')
    });
});

const PORT = process.env.PORT || 5000;
if (process.env.NODE_ENV !== 'production') {
    app.listen(PORT, () => console.log(`Server: http://localhost:${PORT}`));
}

export default app;
