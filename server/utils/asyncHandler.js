/**
 * Express Middleware to handle asynchronous route handlers.
 * Wraps the handler function and catches any errors, passing them to the next() middleware.
 * This eliminates the need for repetitive try-catch blocks in every controller.
 */
export const asyncHandler = (fn) => (req, res, next) => {
    Promise.resolve(fn(req, res, next)).catch(next);
};

export default asyncHandler;
