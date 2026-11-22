CREATE TABLE tutor_turns (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id),
  request_id TEXT NOT NULL, mode TEXT NOT NULL CHECK (mode IN ('coach','conversation','examiner','lesson')),
  question TEXT NOT NULL, reply TEXT NOT NULL, created_at INTEGER NOT NULL,
  UNIQUE(user_id, request_id)
);
--> statement-breakpoint
CREATE INDEX tutor_turns_history ON tutor_turns(user_id,mode,id DESC);
--> statement-breakpoint
CREATE TABLE user_ai_reviews (
  user_id INTEGER NOT NULL, attempt_id INTEGER PRIMARY KEY,
  transcript TEXT, feedback TEXT CHECK (feedback IS NULL OR json_valid(feedback)),
  reviewed_at INTEGER NOT NULL,
  FOREIGN KEY (user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
