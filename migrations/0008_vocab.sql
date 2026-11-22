CREATE TABLE vocabulary_entries (
  id TEXT PRIMARY KEY, word TEXT NOT NULL, definition TEXT NOT NULL, translation TEXT NOT NULL,
  example TEXT NOT NULL, collocation TEXT NOT NULL, topic TEXT NOT NULL, cefr TEXT,
  source TEXT NOT NULL, licence TEXT NOT NULL, UNIQUE(word,definition)
);
--> statement-breakpoint
CREATE TABLE vocabulary_imports (digest TEXT PRIMARY KEY, imported_at INTEGER NOT NULL);
--> statement-breakpoint
CREATE TABLE vocabulary_progress (
  user_id INTEGER NOT NULL REFERENCES users(id), entry_id TEXT NOT NULL REFERENCES vocabulary_entries(id),
  due_at INTEGER NOT NULL, interval_days REAL NOT NULL DEFAULT 0, reviews INTEGER NOT NULL DEFAULT 0,
  PRIMARY KEY(user_id, entry_id)
);
--> statement-breakpoint
CREATE INDEX vocabulary_due ON vocabulary_progress(user_id,due_at);
--> statement-breakpoint
CREATE TABLE vocabulary_reviews (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), entry_id TEXT NOT NULL REFERENCES vocabulary_entries(id),
  rating TEXT NOT NULL CHECK(rating IN ('again','hard','good','easy')), reviewed_at INTEGER NOT NULL, next_due_at INTEGER NOT NULL
);
--> statement-breakpoint
CREATE TABLE arcade_sessions (
  id INTEGER PRIMARY KEY, user_id INTEGER NOT NULL REFERENCES users(id), game TEXT NOT NULL,
  rounds TEXT NOT NULL CHECK(json_valid(rounds)), answers TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(answers)),
  started_at INTEGER NOT NULL, completed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX arcade_history ON arcade_sessions(user_id,id DESC);

