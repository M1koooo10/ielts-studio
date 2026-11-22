CREATE TABLE profile (
  id INTEGER PRIMARY KEY CHECK (id = 1),
  display_name TEXT NOT NULL DEFAULT ''
);
--> statement-breakpoint
CREATE TABLE settings (
  profile_id INTEGER PRIMARY KEY REFERENCES profile(id),
  theme TEXT NOT NULL DEFAULT 'system' CHECK (theme IN ('light','dark','system')),
  ai_language TEXT NOT NULL DEFAULT 'ru' CHECK (ai_language IN ('ru','en')),
  ai_model TEXT NOT NULL DEFAULT 'gpt-4.1-mini',
  voice_enabled INTEGER NOT NULL DEFAULT 0 CHECK (voice_enabled IN (0,1))
);
--> statement-breakpoint
CREATE TABLE study_goals (
  profile_id INTEGER PRIMARY KEY REFERENCES profile(id),
  target_band REAL CHECK (target_band BETWEEN 1 AND 9 AND target_band * 2 = CAST(target_band * 2 AS INTEGER)),
  exam_date TEXT,
  daily_minutes INTEGER NOT NULL DEFAULT 30 CHECK (daily_minutes BETWEEN 5 AND 600)
);
--> statement-breakpoint
CREATE TABLE materials (
  id INTEGER PRIMARY KEY,
  slug TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1 CHECK (version > 0),
  skill TEXT NOT NULL CHECK (skill IN ('reading','listening','writing','speaking','grammar','vocabulary')),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  body TEXT NOT NULL,
  instructions TEXT NOT NULL,
  minutes INTEGER NOT NULL CHECK (minutes > 0),
  status TEXT NOT NULL CHECK (status IN ('draft','ready','archived')),
  UNIQUE(slug, version)
);
--> statement-breakpoint
CREATE TABLE questions (
  id INTEGER PRIMARY KEY,
  material_id INTEGER NOT NULL REFERENCES materials(id),
  position INTEGER NOT NULL CHECK (position > 0),
  kind TEXT NOT NULL,
  prompt TEXT NOT NULL,
  options TEXT NOT NULL DEFAULT '[]' CHECK (json_valid(options)),
  max_words INTEGER CHECK (max_words > 0),
  UNIQUE(material_id, position)
);
--> statement-breakpoint
CREATE TABLE answer_keys (
  question_id INTEGER PRIMARY KEY REFERENCES questions(id),
  accepted TEXT NOT NULL CHECK (json_valid(accepted)),
  explanation TEXT NOT NULL,
  evidence TEXT NOT NULL
);
--> statement-breakpoint
CREATE TABLE attempts (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profile(id),
  material_id INTEGER REFERENCES materials(id),
  title TEXT NOT NULL,
  kind TEXT NOT NULL CHECK (kind IN ('practice','section_exam','full_mock')),
  state TEXT NOT NULL CHECK (state IN ('active','interrupted','submitted','abandoned')),
  started_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  submitted_at INTEGER,
  CHECK ((state = 'submitted') = (submitted_at IS NOT NULL))
);
--> statement-breakpoint
CREATE INDEX attempts_state_updated ON attempts(profile_id,state,updated_at DESC);
--> statement-breakpoint
CREATE TABLE responses (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id),
  question_id INTEGER NOT NULL REFERENCES questions(id),
  answer TEXT NOT NULL,
  snapshot TEXT NOT NULL CHECK (json_valid(snapshot)),
  PRIMARY KEY(attempt_id, question_id)
);
--> statement-breakpoint
CREATE TABLE scores (
  attempt_id INTEGER NOT NULL REFERENCES attempts(id),
  scope TEXT NOT NULL CHECK (scope IN ('reading','listening','writing','speaking','overall')),
  band REAL NOT NULL CHECK (band BETWEEN 0 AND 9 AND band * 2 = CAST(band * 2 AS INTEGER)),
  PRIMARY KEY(attempt_id, scope)
);
--> statement-breakpoint
CREATE TABLE activity_events (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profile(id),
  attempt_id INTEGER REFERENCES attempts(id),
  title TEXT NOT NULL,
  occurred_at INTEGER NOT NULL,
  duration_seconds INTEGER NOT NULL CHECK (duration_seconds >= 0)
);
--> statement-breakpoint
CREATE INDEX activity_profile_time ON activity_events(profile_id,occurred_at DESC);
--> statement-breakpoint
CREATE TABLE study_tasks (
  id INTEGER PRIMARY KEY,
  profile_id INTEGER NOT NULL DEFAULT 1 REFERENCES profile(id),
  title TEXT NOT NULL,
  scheduled_date TEXT NOT NULL,
  completed_at INTEGER
);
--> statement-breakpoint
CREATE INDEX tasks_profile_date ON study_tasks(profile_id,scheduled_date);
--> statement-breakpoint
INSERT INTO profile(id) VALUES (1);
--> statement-breakpoint
INSERT INTO settings(profile_id) VALUES (1);
--> statement-breakpoint
INSERT INTO study_goals(profile_id) VALUES (1);
