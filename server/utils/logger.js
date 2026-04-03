/**
 * @fileoverview Centralized Error Logging Utility.
 * This module provides a standard way to log server-side errors into the 
 * database for forensic audit and debugging purposes.
 */

import ErrorLog from '../models/ErrorLog.js';

/**
 * Logs a server-side error into the database.
 * Automatically redacts sensitive fields from request payloads (passwords, tokens, etc.)
 * and classifies common database/authentication errors.
 * 
 * @param {Error} err - The original error object.
 * @param {Object} [req] - The Express request object to extract context from.
 * @param {string} [message] - An optional custom message to store.
 * @returns {Promise<void>}
 */
export const logError = async (err, req = null, message = null) => {
    try {
        const errorData = {
            message: message || err.message || 'Unknown Server Error',
            stack_trace: err.stack,
            route: req?.originalUrl || 'N/A',
            method: req?.method || 'N/A',
            user_id: req?.user?.id || req?.user?._id || null,
            request_body: req?.body ? { ...req.body } : null,
            status_code: err.status || err.statusCode || 500,
            error_type: err.name || 'Server Error',
            status: 'unresolved'
        };

        // Classify standard data integrity or security errors
        if (err.name === 'ValidationError') errorData.error_type = 'Validation';
        else if (err.code === 11000) errorData.error_type = 'DuplicateEntry';
        else if (err.name === 'CastError') errorData.error_type = 'CastError';
        else if (err.name === 'JsonWebTokenError') errorData.error_type = 'Authentication';
        else if (err.name === 'TokenExpiredError') errorData.error_type = 'Authentication';

        // Redact sensitive fields to ensure PII/credential security
        if (errorData.request_body && typeof errorData.request_body === 'object') {
            const sensitiveFields = ['password', 'token', 'newPassword', 'oldPassword', 'secret'];
            sensitiveFields.forEach(field => {
                if (Object.prototype.hasOwnProperty.call(errorData.request_body, field)) {
                    errorData.request_body[field] = '[REDACTED]';
                }
            });
        }
        
        await ErrorLog.create(errorData);
    } catch (loggingError) {
        console.error('[CRITICAL] Error logging to DB failed:', loggingError.message);
        console.error('Original error:', err.message);
    }
};

export default { logError };

