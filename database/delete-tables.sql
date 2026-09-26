-- Drops everything created by engsoc_schema.sql, data included.
-- Safe to run even if some/all of these don't exist yet (IF EXISTS).
-- CASCADE takes care of foreign-key dependency order, so these can be
-- dropped in any sequence.

DROP TABLE IF EXISTS announcement_comments CASCADE;
DROP TABLE IF EXISTS announcement_likes CASCADE;
DROP TABLE IF EXISTS announcements CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS requests CASCADE;
DROP TABLE IF EXISTS task_assignees CASCADE;
DROP TABLE IF EXISTS tasks CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS request_status;
DROP TYPE IF EXISTS task_status;
DROP TYPE IF EXISTS port_type;
DROP TYPE IF EXISTS event_type;
DROP TYPE IF EXISTS event_status;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS user_role;