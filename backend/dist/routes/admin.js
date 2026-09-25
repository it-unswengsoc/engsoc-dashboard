"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("./auth");
const admin_1 = require("../functions/admin");
const router = (0, express_1.Router)();
/**
 * GET /admin/users
 * Lists every user account — admin only (see requireAdmin).
 */
router.get('/users', auth_1.verifyAuthToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const users = await (0, admin_1.listUsers)();
        res.status(200).json({ status: 'success', data: users });
    }
    catch (error) {
        console.error('List users error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load users' });
    }
});
/**
 * PATCH /admin/users/:userId
 * Updates a user's role and/or port(folio). Body: { role?, port? } — port
 * may be explicitly null to clear it back to unassigned. Both are validated
 * against the same enum values Postgres itself enforces on the column, so a
 * bad value 400s here rather than surfacing a raw database error.
 */
router.patch('/users/:userId', auth_1.verifyAuthToken, auth_1.requireAdmin, async (req, res) => {
    try {
        const userId = Number(req.params.userId);
        if (!Number.isInteger(userId)) {
            return res.status(400).json({ status: 'error', message: 'Invalid user id' });
        }
        const { role, port } = req.body;
        if (role !== undefined && !admin_1.USER_ROLES.includes(role)) {
            return res.status(400).json({ status: 'error', message: `role must be one of: ${admin_1.USER_ROLES.join(', ')}` });
        }
        if (port !== undefined && port !== null && !admin_1.USER_PORTFOLIOS.includes(port)) {
            return res.status(400).json({ status: 'error', message: `port must be one of: ${admin_1.USER_PORTFOLIOS.join(', ')}` });
        }
        if (role === undefined && port === undefined) {
            return res.status(400).json({ status: 'error', message: 'Nothing to update — provide role and/or port' });
        }
        const updated = await (0, admin_1.updateUserRoleAndPortfolio)(userId, role, port);
        if (!updated) {
            return res.status(404).json({ status: 'error', message: 'User not found' });
        }
        res.status(200).json({ status: 'success', data: updated });
    }
    catch (error) {
        console.error('Update user error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to update user' });
    }
});
exports.default = router;
//# sourceMappingURL=admin.js.map