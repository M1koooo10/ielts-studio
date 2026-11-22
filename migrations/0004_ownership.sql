CREATE TABLE user_settings (
  user_id INTEGER PRIMARY KEY REFERENCES users(id),
  target_band REAL CHECK (target_band BETWEEN 1 AND 9 AND target_band * 2 = CAST(target_band * 2 AS INTEGER)),
  exam_date TEXT,
  daily_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_minutes BETWEEN 5 AND 600),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  ai_language TEXT NOT NULL DEFAULT 'ru' CHECK (ai_language IN ('ru','en')),
  ai_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
  voice_enabled INTEGER NOT NULL DEFAULT 0 CHECK (voice_enabled IN (0,1))
);
--> statement-breakpoint
CREATE TRIGGER initialize_user_preferences AFTER INSERT ON users
BEGIN INSERT INTO user_settings(user_id) VALUES (NEW.id); END;
--> statement-breakpoint
INSERT INTO user_settings(user_id) SELECT id FROM users;
--> statement-breakpoint
CREATE TABLE user_attempts (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  material_id INTEGER REFERENCES materials(id),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('practice','section_exam','full_mock')),
  state TEXT NOT NULL CHECK (state IN ('active','interrupted','submitted','abandoned')),
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  submitted_at INTEGER,
  legacy_id INTEGER UNIQUE REFERENCES attempts(id),
  CHECK ((state = 'submitted') = (submitted_at IS NOT NULL)),
  UNIQUE (user_id,id)
);
--> statement-breakpoint
CREATE INDEX user_attempts_state ON user_attempts(user_id,state,updated_at DESC);
--> statement-breakpoint
CREATE TABLE user_responses (
  user_id INTEGER NOT NULL,
  attempt_id INTEGER NOT NULL,
  question_id INTEGER NOT NULL REFERENCES questions(id),
  answer TEXT NOT NULL,
  snapshot TEXT NOT NULL CHECK (json_valid(snapshot)),
  PRIMARY KEY (attempt_id,question_id),
  FOREIGN KEY (user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
--> statement-breakpoint
CREATE TABLE user_scores (
  user_id INTEGER NOT NULL,
  attempt_id INTEGER NOT NULL,
  scope TEXT NOT NULL CHECK (scope IN ('reading','listening','writing','speaking','overall')),
  band REAL NOT NULL CHECK (band BETWEEN 0 AND 9 AND band * 2 = CAST(band * 2 AS INTEGER)),
  PRIMARY KEY (attempt_id,scope),
  FOREIGN KEY (user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
--> statement-breakpoint
CREATE TABLE user_activity (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  attempt_id INTEGER,
  title TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0),
  FOREIGN KEY (user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
--> statement-breakpoint
CREATE INDEX user_activity_time ON user_activity(user_id,occurred_at DESC);
--> statement-breakpoint
CREATE TABLE user_tasks (
  id INTEGER PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id),
  title TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  completed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX user_tasks_by_day ON user_tasks(user_id,scheduled_date);
--> statement-breakpoint
CREATE TABLE user_recordings (
  user_id INTEGER NOT NULL,
  attempt_id INTEGER PRIMARY KEY,
  mime TEXT NOT NULL,
  audio BLOB NOT NULL,
  FOREIGN KEY (user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
--> statement-breakpoint
CREATE TABLE legacy_claims (
  profile_id INTEGER PRIMARY KEY REFERENCES profile(id),
  user_id INTEGER NOT NULL REFERENCES users(id),
  imported_at INTEGER NOT NULL
);

