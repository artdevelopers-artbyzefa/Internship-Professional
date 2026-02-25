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
import { getPKTTime } from './utils/time.js';

dotenv.config();

const app = express();

// Middleware
app.use(express.json());
app.use(cors({
    origin: process.env.FRONTEND_URL,
    credentials: true
}));
app.use(cookieParser());
app.use(morgan('dev')); // Log ALL requests to the terminal

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Database Connection
mongoose.connect(process.env.MONGODB_URI)
    .then(() => console.log('MongoDB Connected to DIMS Database'))
    .catch(err => console.error('MongoDB Connection Error:', err));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/student', studentRoutes);
app.use('/api/office', officeRoutes);
app.use('/api/faculty', facultyRoutes);
app.use('/api/notices', noticesRoutes);

// Simple Health Check
app.use('/health', (req, res) => res.send('DIMS Server is Running'));

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`\n[${getPKTTime()}] DIMS Server effectively running on port ${PORT}`);
    console.log(`[${getPKTTime()}] Database: Connected to MongoDB`);
});
