CREATE TABLE placements (
 user_id INTEGER PRIMARY KEY REFERENCES users(id),
 step INTEGER NOT NULL DEFAULT -1,
 cursor INTEGER NOT NULL DEFAULT 0,
 opened_at INTEGER NOT NULL DEFAULT 0,
 started_at INTEGER,
 submitted_at INTEGER,
 completed_at INTEGER,
 revision INTEGER NOT NULL DEFAULT 0,
 answers TEXT NOT NULL DEFAULT '{}',
 overtime INTEGER NOT NULL DEFAULT 0,
 writing TEXT,
 speaking TEXT,
 overall REAL
);
--> statement-breakpoint
CREATE TABLE placement_audio (
 user_id INTEGER NOT NULL REFERENCES placements(user_id),
 step INTEGER NOT NULL CHECK(step BETWEEN 4 AND 6),
 data BLOB NOT NULL,
 PRIMARY KEY(user_id,step)
);
--> statement-breakpoint
CREATE TABLE placement_plan (
 user_id INTEGER NOT NULL REFERENCES placements(user_id),
 position INTEGER NOT NULL,
 task_id INTEGER NOT NULL REFERENCES user_tasks(id),
 PRIMARY KEY(user_id,position)
);
