"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const router = (0, express_1.Router)();
// Health check
router.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Backend API is healthy',
    });
});
// Example endpoint
router.get('/example', (req, res) => {
    res.json({
        message: 'This is an example endpoint',
        data: {
            timestamp: new Date().toISOString(),
        },
    });
});
exports.default = router;
//# sourceMappingURL=api.js.map