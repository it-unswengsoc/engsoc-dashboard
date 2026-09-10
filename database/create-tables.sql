-- Creates every table fresh. Assumes an empty database — run
-- delete-tables.sql first if any of this already exists (that drops
-- everything below, data included).

-- Create ENUM types
CREATE TYPE user_role AS ENUM ('member', 'executive', 'admin');
CREATE TYPE notification_type AS ENUM ('event', 'alert', 'announcement');
CREATE TYPE event_status AS ENUM ('upcoming', 'ongoing', 'completed', 'cancelled');

-- Users table
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
CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) UNIQUE NOT NULL,
  password_hash VARCHAR(255),
  google_id VARCHAR(255) UNIQUE,
  first_name VARCHAR(100) NOT NULL,
  last_name VARCHAR(100) NOT NULL,
  role user_role DEFAULT 'member',
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login TIMESTAMP
);

-- Events table
CREATE TABLE events (
  id SERIAL PRIMARY KEY,
  title VARCHAR(255) NOT NULL,
  description TEXT,
  event_date TIMESTAMP NOT NULL,
  location VARCHAR(255),
  organizer_id INTEGER NOT NULL,
  status event_status DEFAULT 'upcoming',
  capacity INTEGER,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (organizer_id) REFERENCES users(id) ON DELETE SET NULL
);

-- Notifications table
CREATE TABLE notifications (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  event_id INTEGER,
  type notification_type NOT NULL,
  title VARCHAR(255) NOT NULL,
  message TEXT,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE SET NULL
);

-- Event attendees table
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

-- User roles table (for future role management)
CREATE TABLE user_roles (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL,
  role user_role NOT NULL,
  assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  UNIQUE(user_id, role)
);

-- Create indexes for better query performance
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_google_id ON users(google_id);
CREATE INDEX idx_events_organizer_id ON events(organizer_id);
CREATE INDEX idx_events_status ON events(status);
CREATE INDEX idx_events_date ON events(event_date);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_is_read ON notifications(is_read);
CREATE INDEX idx_event_attendees_user_id ON event_attendees(user_id);
CREATE INDEX idx_event_attendees_event_id ON event_attendees(event_id);

-- Insert sample admin user (password: Admin@123)
INSERT INTO users (email, password_hash, first_name, last_name, role)
VALUES ('admin@engsoc.com', '$2b$10$8wQHJrCu7XJFHeHwvIYDn.5HHv9O3bHpLCkV6A.ZFv3GHf1FxQgE2', 'Admin', 'User', 'admin')
ON CONFLICT (email) DO NOTHING;
