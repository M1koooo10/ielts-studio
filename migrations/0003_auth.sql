CREATE TABLE users (
  id INTEGER PRIMARY KEY,
  phone_number TEXT NOT NULL UNIQUE CHECK (length(phone_number) BETWEEN 3 AND 16 AND substr(phone_number,1,1)='+'),
  phone_verified_at INTEGER NOT NULL,
  display_name TEXT NOT NULL DEFAULT '' CHECK (length(display_name) <= 60),
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE auth_sessions (
  id TEXT PRIMARY KEY NOT NULL CHECK (length(id)=64),
  user_id INTEGER NOT NULL REFERENCES users(id),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  revoked_at INTEGER,
  CHECK (expires_at > created_at)
);
--> statement-breakpoint
CREATE INDEX auth_session_expiry ON auth_sessions(expires_at);
--> statement-breakpoint
CREATE TABLE otp_challenges (
  id TEXT PRIMARY KEY NOT NULL,
  phone_number TEXT NOT NULL,
  provider_ref TEXT,
  consent_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  checks INTEGER NOT NULL DEFAULT 0,
  closed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX otp_phone_requests ON otp_challenges(phone_number, created_at);
--> statement-breakpoint
CREATE INDEX otp_recent_requests ON otp_challenges(created_at);

