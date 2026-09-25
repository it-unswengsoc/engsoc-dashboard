-- Creates every table fresh. Assumes an empty database — run
-- delete-tables.sql first if any of this already exists (that drops
-- everything below, data included).

-- ============================================================
-- ENUM TYPES
-- ============================================================
CREATE TYPE user_role AS ENUM ('member', 'director', 'executive', 'admin');
CREATE TYPE notification_type AS ENUM ('event', 'alert', 'announcement', 'task', 'request');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');
CREATE TYPE event_type AS ENUM ('internal', 'external');
CREATE TYPE port_type AS ENUM ('cabinet', 'careers', 'IT', 'publication', 'marketing', 'socials', 'sponsorships', 'programs', 'outreach', 'HR');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE request_status AS ENUM ('pending', 'in_progress', 'approved', 'rejected', 'completed');

-- ============================================================
-- USERS
-- password_hash is nullable and google_id was added for Google-only accounts
-- (Sign in with Google never sets a local password). A user row has one or
-- both: password_hash for local login, google_id for Google login — an
-- existing local account gets google_id linked onto it if the emails match.
--
-- To pick this up on a database that already has the old users table
-- without losing its data, migrate in place instead of resetting:
--   ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;
--   ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
--   CREATE INDEX idx_users_google_id ON users(google_id);
-- ============================================================
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role DEFAULT 'member',
  port port_type,
  -- Captured on every Google sign-in (see findOrCreateGoogleUser) — lets the
  -- backend read this member's own Google Calendar on their behalf later,
  -- without them needing to be present in a browser. Null for password-only
  -- accounts, or a Google account that hasn't signed in since this was added.
  google_refresh_token TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- ============================================================
-- EVENTS
-- All of EngSoc is implicitly "invited" to every event — there is no
-- separate invite list. Who's actually coming is tracked the Facebook-event
-- way: a row appears in event_attendees the moment a user clicks "Going".
-- organizer_id is nullable so ON DELETE SET NULL below is actually valid
-- (it was NOT NULL in the original, which is incompatible with SET NULL).
-- ============================================================
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  image_url VARCHAR(500),
  event_type event_type NOT NULL DEFAULT 'internal',
  start_date TIMESTAMP NOT NULL,
  end_date TIMESTAMP,
  location VARCHAR(255),
  organizer_id INTEGER,
  status event_status DEFAULT 'upcoming',
  capacity INTEGER,
  -- Set once this event has been mirrored to the shared EngSoc Google
  -- Calendar (see backend/src/functions/calendar-sync.ts). Null means the
  -- mirror hasn't happened yet (sync failed, or predates this feature).
  google_calendar_event_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL,
  CHECK (end_date IS NULL OR end_date >= start_date)
);

-- ============================================================
-- EVENT ATTENDEES (a.k.a. RSVPs)
-- A row = this user clicked "Going". checked_in / checked_in_at track
-- whether they actually showed up on the day, separate from the RSVP.
-- ============================================================
CREATE TABLE event_attendees (
  id SERIAL PRIMARY KEY,
  event_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  checked_in BOOLEAN DEFAULT false,
  registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  checked_in_at TIMESTAMP,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(event_id, user_id)
);

-- ============================================================
-- TASKS
-- Hierarchy rule (member can't assign to director/exec, director can't
-- assign to exec, anyone can self-assign) is NOT enforced here — that's
-- business logic for the backend to check before insert, same as the rest
-- of your app's validation.
-- ============================================================
CREATE TABLE tasks (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  assigned_by INTEGER,
  assigned_to INTEGER NOT NULL,
  event_id INTEGER,
  status task_status DEFAULT 'pending',
  due_date TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP,
  FOREIGN KEY (assigned_by) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (assigned_to) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- ============================================================
-- REQUESTS
-- Generic form-based request, routed to whichever port (subteam) needs to
-- action it. request_type distinguishes the form used (e.g. 'mass_email'),
-- and form_data holds that form's answers so new request types don't need
-- schema changes — just a new request_type value and a new form on the
-- frontend. handled_by is filled in once someone from the target port
-- picks it up.
-- ============================================================
CREATE TABLE requests (
  id SERIAL PRIMARY KEY,
  requester_id INTEGER,
  target_port port_type NOT NULL,
  request_type VARCHAR(100) NOT NULL,
  title VARCHAR(255) NOT NULL,
  form_data JSONB,
  status request_status DEFAULT 'pending',
  handled_by INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  resolved_at TIMESTAMP,
  FOREIGN KEY (requester_id) REFERENCES users(id) ON DELETE SET NULL,
  FOREIGN KEY (handled_by) REFERENCES users(id) ON DELETE SET NULL
);

-- Example row for the "IT request to do a mass email" case:
-- INSERT INTO requests (requester_id, target_port, request_type, title, form_data)
-- VALUES (
--   3, 'IT', 'mass_email', 'Send sponsorship deadline reminder',
--   '{"subject": "Reminder: sponsorship packages due Friday",
--     "body": "...",
--     "audience": "all_members"}'::jsonb
-- );

-- ============================================================
-- NOTIFICATIONS
-- Polymorphic-ish: exactly one of event_id / task_id / request_id is
-- expected to be set, matching the notification's type — 'alert' points at
-- none of them. Left unenforced by a CHECK constraint; up to the backend.
-- ============================================================
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_id INTEGER,
  task_id INTEGER,
  request_id INTEGER,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL,
  FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE SET NULL,
  FOREIGN KEY (request_id) REFERENCES requests(id) ON DELETE SET NULL
);

-- ============================================================
-- ANNOUNCEMENTS
-- authorName/authorRole are not stored here; join to users (first_name,
-- last_name, role) via author_id at query time so they stay in sync with
-- the user's profile. like_count/comment_count are denormalized counters —
-- the backend is responsible for incrementing/decrementing them when rows
-- are added to/removed from announcement_likes / announcement_comments.
--
-- image_url is TEXT, not a short VARCHAR: there's no separate file-upload
-- pipeline in this app, so the frontend reads the picked (and cropped)
-- image as a base64 data URI (client-side, via FileReader + a <canvas>
-- crop step) and sends that straight through as image_url —
-- routes/announcements.ts caps it at a few MB so this table doesn't grow
-- unbounded per row.
--
-- To pick this up on a database that already has the old announcements
-- table without losing its data, migrate in place instead of resetting:
--   ALTER TABLE announcements ALTER COLUMN image_url TYPE TEXT;
-- ============================================================
CREATE TABLE announcements (
  id SERIAL PRIMARY KEY,
  author_id INTEGER,
  content TEXT NOT NULL,
  image_url TEXT,
  like_count INTEGER DEFAULT 0,
  comment_count INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- ANNOUNCEMENT LIKES
-- Existence of a row = that user likes that announcement.
-- isLikedByMe is derived by checking this table for the authenticated
-- user's id.
-- ============================================================
CREATE TABLE announcement_likes (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL,
  user_id INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(announcement_id, user_id)
);

-- ============================================================
-- ANNOUNCEMENT COMMENTS
-- Flat comment list under an announcement. author_id is nullable with
-- ON DELETE SET NULL (rather than CASCADE) so a comment thread survives
-- if the commenter's account is later removed — matches the same
-- author_id pattern used on announcements itself.
-- ============================================================
CREATE TABLE announcement_comments (
  id SERIAL PRIMARY KEY,
  announcement_id INTEGER NOT NULL,
  author_id INTEGER,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (announcement_id) REFERENCES announcements(id) ON DELETE CASCADE,
  FOREIGN KEY (author_id) REFERENCES users(id) ON DELETE SET NULL
);

-- ============================================================
-- USER ROLES (kept from original, for future role-management /
-- multi-role support — a user's primary role still lives on users.role)
-- ============================================================
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role user_role NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);

CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_start_date ON events(start_date);
CREATE INDEX idx_events_type ON events(event_type);

CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);

CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_assigned_by ON tasks(assigned_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_event_id ON tasks(event_id);

CREATE INDEX idx_requests_requester_id ON requests(requester_id);
CREATE INDEX idx_requests_target_port ON requests(target_port);
CREATE INDEX idx_requests_status ON requests(status);
CREATE INDEX idx_requests_handled_by ON requests(handled_by);

CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);

CREATE INDEX idx_announcement_comments_announcement_id ON announcement_comments(announcement_id);
CREATE INDEX idx_announcement_comments_author_id ON announcement_comments(author_id);

-- ============================================================
-- SAMPLE ADMIN USER (password: Admin@123)
-- ============================================================
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('admin@engsoc.com', '$2b$10$8wQHJrCu7XJFHeHwvIYDn.5HHv9O3bHpLCkV6A.ZFv3GHf1FxQgE2', 'Admin', 'User', 'admin')
ON CONFLICT (email) DO NOTHING;