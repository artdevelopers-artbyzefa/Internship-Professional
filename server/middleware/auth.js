import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const protect = async (req, res, next) => {
    let token;

    // 1. Try to get token from Authorization Header
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    }
    // 2. Fallback to Cookies
    else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        console.log(`[PROTECT] [FAIL] No token found in headers or cookies for ${req.originalUrl}`);
        return res.status(401).json({ message: 'Not authorized: Missing session token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            console.log(`[PROTECT] [FAIL] Token valid but user ${decoded.id} no longer exists.`);
            return res.status(401).json({ message: 'Not authorized: Account no longer exists' });
        }

        req.user = user;
        next();
    } catch (err) {
        console.log(`[PROTECT] [FAIL] Token verification error: ${err.message}`);
        return res.status(401).json({ message: 'Not authorized: Invalid or expired session' });
    }
};

export const authorize = (...roles) => {
    return (req, res, next) => {
        if (!roles.includes(req.user.role)) {
            return res.status(403).json({
                message: `User role ${req.user.role} is not authorized to access this route`
            });
        }
        next();
    };
};

