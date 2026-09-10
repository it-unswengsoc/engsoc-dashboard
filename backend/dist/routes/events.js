"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const events_1 = require("../functions/events");
const auth_1 = require("./auth");
const router = (0, express_1.Router)();
/**
 * GET /api/event
 * Retrieves all events.
 */
router.get('/', async (req, res) => {
    try {
        const events = await (0, events_1.getAllEvents)();
        res.status(200).json({
            status: 'success',
            data: events,
        });
    }
    catch (error) {
        console.error('Get events error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * GET /api/event/:eventId
 * Retrieves a specific event by ID.
 */
router.get('/:eventId', async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (isNaN(eventId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid event ID',
            });
        }
        const event = await (0, events_1.getEventById)(eventId);
        if (!event) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found',
            });
        }
        res.status(200).json({
            status: 'success',
            data: event,
        });
    }
    catch (error) {
        console.error('Get event error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * POST /api/event
 * Creates a new event. Requires authentication.
 */
router.post('/', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const user = req.user;
        const { title, description, eventDate, location, capacity } = req.body;
        if (!title || !eventDate) {
            return res.status(400).json({
                status: 'error',
                message: 'Missing required fields: title, eventDate',
            });
        }
        const event = await (0, events_1.createEvent)({
            title,
            description,
            eventDate,
            location,
            organizerId: user.userId,
            capacity,
        });
        if (!event) {
            return res.status(400).json({
                status: 'error',
                message: 'Failed to create event',
            });
        }
        res.status(201).json({
            status: 'success',
            message: 'Event created successfully',
            data: event,
        });
    }
    catch (error) {
        console.error('Create event error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * PUT /api/event/:eventId
 * Edits the details of an event. Requires authentication.
 */
router.put('/:eventId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (isNaN(eventId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid event ID',
            });
        }
        const { title, description, eventDate, location, status, capacity } = req.body;
        const event = await (0, events_1.updateEvent)(eventId, {
            title,
            description,
            eventDate,
            location,
            status,
            capacity,
        });
        if (!event) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Event updated successfully',
            data: event,
        });
    }
    catch (error) {
        console.error('Update event error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
/**
 * DELETE /api/event/:eventId
 * Deletes an event. Requires authentication.
 */
router.delete('/:eventId', auth_1.verifyAuthToken, async (req, res) => {
    try {
        const eventId = parseInt(req.params.eventId);
        if (isNaN(eventId)) {
            return res.status(400).json({
                status: 'error',
                message: 'Invalid event ID',
            });
        }
        const deleted = await (0, events_1.deleteEvent)(eventId);
        if (!deleted) {
            return res.status(404).json({
                status: 'error',
                message: 'Event not found',
            });
        }
        res.status(200).json({
            status: 'success',
            message: 'Event deleted successfully',
        });
    }
    catch (error) {
        console.error('Delete event error:', error);
        res.status(500).json({
            status: 'error',
            message: 'Internal server error',
        });
    }
});
exports.default = router;
//# sourceMappingURL=events.js.map