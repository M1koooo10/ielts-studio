CREATE TABLE user_assessments (
  user_id INTEGER NOT NULL REFERENCES users(id),
  round INTEGER NOT NULL,
  taken_on TEXT NOT NULL,
  level TEXT NOT NULL,
  score INTEGER NOT NULL,
  total INTEGER NOT NULL,
  focus TEXT NOT NULL,
  PRIMARY KEY (user_id, round)
);
