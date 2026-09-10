-- Drops everything create-tables.sql creates, data included, so that file
-- can be re-run cleanly during development.
--
-- DESTRUCTIVE: this deletes all rows in every table below. Never run it
-- against a database holding data you care about — take a backup first if
-- you're unsure.

DROP TABLE IF EXISTS user_roles CASCADE;
DROP TABLE IF EXISTS event_attendees CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS events CASCADE;
DROP TABLE IF EXISTS users CASCADE;

DROP TYPE IF EXISTS event_status;
DROP TYPE IF EXISTS notification_type;
DROP TYPE IF EXISTS user_role;
