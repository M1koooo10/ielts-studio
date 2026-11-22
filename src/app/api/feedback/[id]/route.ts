import { getAuth } from "@/server/auth/current";
import { json, validOrigin } from "@/server/ai/origin";
import { getFeedback, reviewSource } from "@/server/ai/feedback-store";
import { evaluateAttempt, EvaluationIssue } from "@/server/ai/evaluation";
import { oncePending } from "@/server/ai/requests";

export const runtime = "nodejs";
type Params = { params: Promise<{ id: string }> };
export async function GET(_: Request, { params }: Params) {
  const owner = await getAuth();
  if (!owner) return json({ error: "Войдите в аккаунт." }, 401);
  const id = Number((await params).id);
  if (
    !Number.isSafeInteger(id) ||
    id <= 0 ||
    !(await reviewSource(owner.userId, id))
  )
    return json({ error: "Попытка не найдена." }, 404);
  return json(await getFeedback(owner.userId, id));
}
export async function POST(request: Request, { params }: Params) {
  if (!validOrigin(request))
    return json({ error: "Источник запроса не разрешён." }, 403);
  const owner = await getAuth();
  if (!owner) return json({ error: "Войдите в аккаунт." }, 401);
  const id = Number((await params).id);
  if (!Number.isSafeInteger(id) || id <= 0)
    return json({ error: "Попытка не найдена." }, 404);
  try {
    const result = await oncePending("review:" + owner.userId + ":" + id, () =>
      evaluateAttempt(id),
    );
    return result
      ? json(result)
      : json({ error: "Проверка этой попытки уже выполняется." }, 409);
  } catch (e) {
    if (e instanceof EvaluationIssue)
      return json({ error: e.message }, e.status);
    return json(
      {
        error:
          "Не удалось получить оценку. Проверьте соединение, ключ и доступ к выбранной модели.",
      },
      503,
    );
  }
}
