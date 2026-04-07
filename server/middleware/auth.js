import jwt from 'jsonwebtoken';
import User from '../models/User.js';

/**
 * Middleware to protect routes by verifying JWT tokens from Authorization header or cookies.
 * Attaches the authenticated user object to req.user.
 */
export const protect = async (req, res, next) => {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
        token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies.token) {
        token = req.cookies.token;
    }

    if (!token) {
        return res.status(401).json({ message: 'Not authorized: Missing session token' });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        const user = await User.findById(decoded.id);

        if (!user) {
            return res.status(401).json({ message: 'Not authorized: Account no longer exists' });
        }

        req.user = user;
        next();
    } catch (err) {
        return res.status(401).json({ message: 'Not authorized: Invalid or expired session' });
    }
};

/**
 * Middleware to authorize specific user roles for a route.
 * @param {...string} roles - The roles allowed to access the route.
 */
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
