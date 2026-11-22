ALTER TABLE users ADD COLUMN needs_initial_ai_key INTEGER NOT NULL DEFAULT 0 CHECK(needs_initial_ai_key IN (0,1));
