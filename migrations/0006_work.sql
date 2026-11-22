CREATE TABLE user_work (
 user_id INTEGER NOT NULL, attempt_id INTEGER PRIMARY KEY, text TEXT NOT NULL DEFAULT '',
 FOREIGN KEY(user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
--> statement-breakpoint
CREATE TABLE user_marks (
 user_id INTEGER NOT NULL, attempt_id INTEGER NOT NULL, question_id INTEGER NOT NULL REFERENCES questions(id),
 correct INTEGER NOT NULL CHECK(correct IN (0,1)), reviewed INTEGER NOT NULL DEFAULT 0,
 PRIMARY KEY(attempt_id,question_id), FOREIGN KEY(user_id,attempt_id) REFERENCES user_attempts(user_id,id)
);
--> statement-breakpoint
CREATE INDEX marks_by_owner ON user_marks(user_id,correct,reviewed);

