import { integer, real, sqliteTable, sqliteView, text } from "drizzle-orm/sqlite-core";
export const materialLevels = sqliteView("material_levels", {
  materialId: integer("material_id").notNull(),
  cefr: text("cefr").notNull(),
}).existing();
import type { Settings, Skill } from "../../lib/contracts";

export const users = sqliteTable("users", {
  id: integer("id").primaryKey(),
  displayName: text("display_name").notNull(),
  updatedAt: integer("updated_at").notNull(),
});
export const userSettings = sqliteTable("user_settings", {
  userId: integer("user_id")
    .primaryKey()
    .references(() => users.id),
  theme: text("theme").$type<Settings["theme"]>().notNull(),
  aiLanguage: text("ai_language").$type<Settings["aiLanguage"]>().notNull(),
  aiModel: text("ai_model").notNull(),
  voiceEnabled: integer("voice_enabled", { mode: "boolean" }).notNull(),
  targetBand: real("target_band"),
  examDate: text("exam_date"),
  dailyMinutes: integer("daily_minutes").notNull(),
});
export const materials = sqliteTable("materials", {
  id: integer("id").primaryKey(),
  slug: text("slug").notNull(),
  version: integer("version").notNull(),
  skill: text("skill").$type<Skill>().notNull(),
  title: text("title").notNull(),
  description: text("description").notNull(),
  body: text("body").notNull(),
  instructions: text("instructions").notNull(),
  minutes: integer("minutes").notNull(),
  status: text("status").notNull(),
});
export const questions = sqliteTable("questions", {
  id: integer("id").primaryKey(),
  materialId: integer("material_id")
    .notNull()
    .references(() => materials.id),
  position: integer("position").notNull(),
  kind: text("kind").notNull(),
  prompt: text("prompt").notNull(),
  options: text("options", { mode: "json" }).$type<string[]>().notNull(),
  maxWords: integer("max_words"),
});
