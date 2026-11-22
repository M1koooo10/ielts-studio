export function normalizeAnswer(value: string): string {
  return value
    .normalize("NFKC")
    .replace(/’/gu, "'")
    .trim()
    .replace(/\s+/gu, " ")
    .toLowerCase();
}

/** Exact answers for the seed's short-answer, T/F/NG and multiple-choice items. */
export function gradeAnswer(
  input: string,
  accepted: readonly string[],
  maxWords?: number,
): boolean {
  const answer = normalizeAnswer(input);
  if (
    !answer ||
    (maxWords !== undefined && answer.split(" ").length > maxWords)
  )
    return false;
  return accepted.some((variant) => normalizeAnswer(variant) === answer);
}
