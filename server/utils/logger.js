import ErrorLog from '../models/ErrorLog.js';

/**
 * Standard utility to log server-side errors into the database.
 * Redacts sensitive fields from request payloads.
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

        // Classify standard mongoose errors or custom errors
        if (err.name === 'ValidationError') errorData.error_type = 'Validation';
        else if (err.code === 11000) errorData.error_type = 'DuplicateEntry';
        else if (err.name === 'CastError') errorData.error_type = 'CastError';
        else if (err.name === 'JsonWebTokenError') errorData.error_type = 'Authentication';
        else if (err.name === 'TokenExpiredError') errorData.error_type = 'Authentication';

        // Sanitize sensitive data from request_body
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
