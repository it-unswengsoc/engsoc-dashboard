"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notFound = exports.errorHandler = void 0;
const errorHandler = (err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        status: 'error',
        message: 'Internal server error',
        ...(process.env.NODE_ENV === 'development' && { error: err.message }),
    });
};
exports.errorHandler = errorHandler;
const notFound = (req, res, next) => {
    res.status(404).json({
        status: 'error',
        message: 'Resource not found',
    });
};
exports.notFound = notFound;
//# sourceMappingURL=errorHandler.js.map