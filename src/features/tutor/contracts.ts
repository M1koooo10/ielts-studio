import { z } from "zod";
export const modes = ["coach", "conversation", "examiner", "lesson"] as const;
export type TutorMode = (typeof modes)[number];
export const modeTitles: Record<TutorMode, string> = {
  coach: "Наставник",
  conversation: "Разговор",
  examiner: "Экзаменатор",
  lesson: "Урок и домашнее задание",
};
export type Turn = { id: number; question: string; reply: string };
export type HistoryPage = { turns: Turn[]; hasOlder: boolean };
export const feedbackSchema = z.object({
  estimatedBand: z.number().min(0).max(9).nullable(),
  criteria: z.array(
    z.object({
      name: z.string(),
      band: z.number().min(0).max(9).nullable(),
      comment: z.string(),
    }),
  ),
  strengths: z.array(z.string()),
  recommendations: z.array(z.string()),
  vocabulary: z.array(z.string()),
  corrections: z.array(
    z.object({
      original: z.string(),
      improved: z.string(),
      explanation: z.string(),
    }),
  ),
  grammarTopics: z.array(z.string()),
});
export type Feedback = z.infer<typeof feedbackSchema>;
export type Review = { feedback: Feedback | null; transcript: string | null };
