import { z } from "zod";

export const settingsSchema = z.strictObject({
  displayName: z.string().trim().max(60),
  targetBand: z.number().min(1).max(9).multipleOf(0.5).nullable(),
  examDate: z.iso.date().nullable(),
  dailyMinutes: z.number().int().min(5).max(600),
  theme: z.enum(["system", "light", "dark"]),
  aiLanguage: z.enum(["ru", "en"]),
  aiModel: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-zA-Z0-9._:-]+$/),
  voiceEnabled: z.boolean(),
});

export const settingsPatchSchema = settingsSchema.extend({displayName:z.string().trim().min(1).max(60)}).partial();
export type Settings = z.infer<typeof settingsSchema>;
export type SettingsPatch = z.infer<typeof settingsPatchSchema>;
export const examSkills = [
  "reading",
  "listening",
  "writing",
  "speaking",
] as const;
export type ExamSkill = (typeof examSkills)[number];
export type Skill = ExamSkill | "grammar" | "vocabulary";

export interface Material {
  cefr: string;
  slug: string;
  title: string;
  skill: Skill;
  description: string;
  body: string;
  instructions: string;
  minutes: number;
  questions: { prompt: string; kind: string; options: string[] }[];
}

export interface Dashboard {
  skillBands: Record<ExamSkill, number | null>;
  latestMockBand: number | null;
  studyMinutes: number;
  streak: number;
  activity: { date: string; minutes: number }[];
  recent: { id: number; title: string; date: string; minutes: number }[];
  dueTasks: { id: number; title: string; done: boolean }[];
  resume: { id: number; title: string } | null;
}
