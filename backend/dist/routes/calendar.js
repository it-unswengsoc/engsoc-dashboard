"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("./auth");
const auth_2 = require("../functions/auth");
const user_calendar_1 = require("../functions/user-calendar");
const router = (0, express_1.Router)();
/**
 * GET /calendar/events
 * Lists events from every calendar the signed-in member can see in their
 * own Google account — not Postgres. `connected: false` means this account
 * has no stored Google refresh token yet (a password-only account, or a
 * Google account that hasn't signed in since this feature shipped) — the
 * frontend prompts them to sign out and back in with Google in that case.
 *
 * Defaults to a window from one year ago to one year from now; pass
 * ?from=&to= (ISO datetimes) to widen it, e.g. for a member paging further
 * out in the Year view.
 */
router.get('/events', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const refreshToken = await (0, auth_2.getUserGoogleRefreshToken)(user.userId);
        if (!refreshToken) {
            return res.status(200).json({
                status: 'success',
                data: [],
                connected: false,
            });
        }
        const now = new Date();
        const timeMin = typeof req.query.from === 'string'
            ? req.query.from
            : new Date(now.getFullYear() - 1, now.getMonth(), 1).toISOString();
        const timeMax = typeof req.query.to === 'string'
            ? req.query.to
            : new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString();
        const events = await (0, user_calendar_1.getUserCalendarEvents)(refreshToken, timeMin, timeMax);
        res.status(200).json({
            status: 'success',
            data: events,
            connected: true,
        });
    }
    catch (error) {
        console.error('Get user calendar events error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=calendar.js.map