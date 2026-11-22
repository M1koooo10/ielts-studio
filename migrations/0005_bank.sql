CREATE TABLE material_editions (
 material_id INTEGER PRIMARY KEY REFERENCES materials(id),
 digest TEXT NOT NULL, source TEXT NOT NULL, license TEXT NOT NULL,
 stage TEXT NOT NULL CHECK(stage IN ('draft','needs_review','ready','archived')),
 kind TEXT NOT NULL, topic TEXT NOT NULL, difficulty TEXT NOT NULL, cefr TEXT,
 document TEXT NOT NULL CHECK(json_valid(document))
);
--> statement-breakpoint
CREATE TABLE bank_sections (
 id INTEGER PRIMARY KEY, material_id INTEGER NOT NULL REFERENCES materials(id),
 external_id TEXT NOT NULL, position INTEGER NOT NULL, title TEXT NOT NULL, body TEXT NOT NULL,
 image TEXT, audio TEXT, segments TEXT NOT NULL DEFAULT '[]' CHECK(json_valid(segments)),
 UNIQUE(material_id, external_id), UNIQUE(material_id,position)
);
--> statement-breakpoint
CREATE TABLE bank_items (
 question_id INTEGER PRIMARY KEY REFERENCES questions(id), section_id INTEGER NOT NULL REFERENCES bank_sections(id),
 external_id TEXT NOT NULL, audio_at REAL, UNIQUE(section_id,external_id)
);
--> statement-breakpoint
CREATE INDEX bank_selection ON material_editions(stage,kind,topic,difficulty);

