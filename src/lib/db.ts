import Database from 'better-sqlite3';
import path from 'path';

const db = new Database('campus.db');
db.pragma('journal_mode = WAL');

// Initialize Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT NOT NULL,
    branch TEXT,
    avatar TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS posts (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    image TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS likes (
    post_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    PRIMARY KEY (post_id, user_id),
    FOREIGN KEY (post_id) REFERENCES posts(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS connections (
    requester_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, accepted
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (requester_id, receiver_id),
    FOREIGN KEY (requester_id) REFERENCES users(id),
    FOREIGN KEY (receiver_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS groups (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    description TEXT,
    type TEXT NOT NULL, -- class, club, branch, department
    created_by TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (created_by) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS group_members (
    group_id TEXT NOT NULL,
    user_id TEXT NOT NULL,
    role TEXT DEFAULT 'member', -- member, admin
    PRIMARY KEY (group_id, user_id),
    FOREIGN KEY (group_id) REFERENCES groups(id),
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS messages (
    id TEXT PRIMARY KEY,
    sender_id TEXT NOT NULL,
    receiver_id TEXT NOT NULL, -- can be user_id or group_id (prefixed)
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (sender_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS timetables (
    id TEXT PRIMARY KEY,
    branch TEXT NOT NULL,
    year TEXT NOT NULL,
    section TEXT NOT NULL,
    day TEXT NOT NULL,
    schedule_json TEXT NOT NULL -- array of { time, subject, faculty_id }
  );

  CREATE TABLE IF NOT EXISTS complaints (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    status TEXT DEFAULT 'open', -- open, in-progress, resolved
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS leave_requests (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    reason TEXT NOT NULL,
    start_date TEXT NOT NULL,
    end_date TEXT NOT NULL,
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS absence_reports (
    id TEXT PRIMARY KEY,
    faculty_id TEXT NOT NULL,
    date TEXT NOT NULL,
    substitute_id TEXT,
    status TEXT DEFAULT 'pending',
    FOREIGN KEY (faculty_id) REFERENCES users(id),
    FOREIGN KEY (substitute_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS activity_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    action_type TEXT NOT NULL,
    details TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  -- Migration: Ensure substitute_id exists if table was created earlier
  -- SQLite doesn't support 'IF NOT EXISTS' for columns easily, so we can try to add it and ignore error or check first.
  -- But since this is a better-sqlite3 db.exec, we can just try to add it.
  -- Better way: check if column exists.
`);

// One-time migrations
try {
  db.exec('ALTER TABLE absence_reports ADD COLUMN substitute_id TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE complaints ADD COLUMN status TEXT DEFAULT "open"');
} catch (e) {}

try {
  db.exec('ALTER TABLE users ADD COLUMN phone TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE users ADD COLUMN year TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE users ADD COLUMN bio TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE posts ADD COLUMN file_url TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE posts ADD COLUMN file_type TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE posts ADD COLUMN updated_at DATETIME');
} catch (e) {}

try {
  db.exec('ALTER TABLE groups ADD COLUMN branch TEXT');
} catch (e) {}

try {
  db.exec('ALTER TABLE posts ADD COLUMN group_id TEXT');
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS invitations (
      token TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      expires_at DATETIME NOT NULL,
      used INTEGER DEFAULT 0,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
} catch (e) {}

try {
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL,
      title TEXT NOT NULL,
      content TEXT NOT NULL,
      data_json TEXT,
      read INTEGER DEFAULT 0,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY(user_id) REFERENCES users(id)
    )
  `);
} catch (e) {}

export default db;
