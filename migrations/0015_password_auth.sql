ALTER TABLE users ADD COLUMN password_hash TEXT;
--> statement-breakpoint
CREATE TABLE password_attempts (phone TEXT NOT NULL, at INTEGER NOT NULL);
--> statement-breakpoint
CREATE INDEX password_attempts_time ON password_attempts(at);
--> statement-breakpoint
CREATE INDEX password_attempts_phone ON password_attempts(phone,at);
