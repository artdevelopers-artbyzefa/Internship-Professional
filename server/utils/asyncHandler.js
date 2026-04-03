/**
 * @fileoverview Express Asynchronous Handler Utility.
 * This utility provides a wrapper for asynchronous Express route handlers
 * to ensure that all rejected promises and errors are caught and 
 * passed to the next global error-handling middleware.
 */

/**
 * Wraps an asynchronous function to catch potential errors.
 * This eliminates the need for repetitive try-catch blocks in controller logic.
 * 
 * @param {Function} fn - The asynchronous function (route handler) to wrap.
 * @returns {Function} A standard Express middleware function.
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;

