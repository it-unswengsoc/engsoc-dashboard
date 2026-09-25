"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("./auth");
const users_1 = require("../functions/users");
const router = (0, express_1.Router)();
/**
 * GET /users
 * The member directory — any signed-in user, not just admins (contrast
 * with GET /admin/users). Backs the task assignee picker and @mention
 * resolution on the frontend.
 */
router.get('/', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const users = await (0, users_1.listDirectoryUsers)();
        res.status(200).json({ status: 'success', data: users });
    }
    catch (error) {
        console.error('List directory users error:', error);
        res.status(500).json({ status: 'error', message: 'Failed to load users' });
    }
});
exports.default = router;
//# sourceMappingURL=users.js.map