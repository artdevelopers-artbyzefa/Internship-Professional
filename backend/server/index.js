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

export const app = express();

// Middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(cookieParser());
app.use(morgan('dev')); // Log ALL requests to the terminal

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
app.get('/', (req, res) => res.json({ message: 'DIMS Backend Running on Render' }));

// Database Connection & Server Start
const PORT = process.env.PORT || 10000;

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log('MongoDB Connected to DIMS Database');
        app.listen(PORT, "0.0.0.0", () => {
            console.log(`\n[${getPKTTime()}] DIMS Server effectively running on port ${PORT}`);
            console.log(`[${getPKTTime()}] Binding Address: 0.0.0.0`);
        });
    })
    .catch(err => {
        console.error('MongoDB Connection Error:', err);
        process.exit(1);
    });

export default app;
