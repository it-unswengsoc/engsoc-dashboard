"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// dotenv is dev-only. Vercel injects real env vars straight into
// process.env in production — there's no .env file in the deployed bundle,
// so dotenv.config() would be a no-op there even if it worked. It didn't:
// Vercel's function bundler for this service has failed to trace this
// package's require() under two different import styles now
// (`dotenv/config`, then a plain `import dotenv from 'dotenv'`), dropping
// it from the deployed bundle and crashing every route on
// "Cannot find module". Rather than chase a third import style, this stops
// production depending on the package being present in the bundle at all —
// skipped outright on Vercel (VERCEL is always set there), and loaded via a
// dynamic require (invisible to static bundler analysis) everywhere else,
// so local `.env` loading keeps working against the real node_modules.
if (!process.env.VERCEL) {
    try {
        // eslint-disable-next-line @typescript-eslint/no-var-requires
        require('dotenv').config();
    }
    catch {
        // not installed locally — fine, env vars can be set another way
    }
}
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const helmet_1 = __importDefault(require("helmet"));
const morgan_1 = __importDefault(require("morgan"));
const api_1 = __importDefault(require("./routes/api"));
const auth_1 = __importDefault(require("./routes/auth"));
const events_1 = __importDefault(require("./routes/events"));
const notifications_1 = __importDefault(require("./routes/notifications"));
const drive_1 = __importDefault(require("./routes/drive"));
const app = (0, express_1.default)();
const PORT = process.env.PORT || 3000;
// Middleware
app.use((0, helmet_1.default)());
app.use((0, cors_1.default)({
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    credentials: true,
}));
app.use((0, morgan_1.default)('dev'));
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Routes
app.use('/api/auth', auth_1.default);
app.use('/api/event', events_1.default);
app.use('/api/notification', notifications_1.default);
app.use('/api/drive', drive_1.default);
app.use('/api', api_1.default);
// Health check endpoint
app.get('/health', (req, res) => {
    res.status(200).json({
        status: 'success',
        message: 'Server is running',
        timestamp: new Date().toISOString(),
    });
});
// Root endpoint
app.get('/', (req, res) => {
    res.json({
        message: 'EngSoc Dashboard API',
        version: '1.0.0',
    });
});
// 404 handler
app.use((req, res) => {
    res.status(404).json({
        status: 'error',
        message: 'Route not found',
    });
});
// Start server
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map