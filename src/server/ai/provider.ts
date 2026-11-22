import OpenAI from "openai";

export interface AiProvider {
  validateKey(key: string): Promise<void>;
}

export class ProviderUnavailable extends Error {
  readonly status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

export function createOpenAIClient(key: string) {
  return new OpenAI({
    apiKey: key,
    baseURL: "https://api.openai.com/v1",
    maxRetries: 0,
    timeout: 45_000,
    logLevel: "off",
  });
}

export const openaiProvider: AiProvider = {
  async validateKey(key) {
    try {
      await createOpenAIClient(key).models.list({ timeout: 10_000 });
    } catch (error) {
      if (
        error instanceof OpenAI.APIError &&
        [401, 403].includes(error.status ?? 0)
      ) {
        throw new ProviderUnavailable(
          401,
          "OpenAI отклонил ключ. Проверьте ключ и доступ к списку моделей.",
        );
      }
      throw new ProviderUnavailable(
        503,
        "Не удалось связаться с OpenAI. Попробуйте ещё раз или продолжите без AI.",
      );
    }
  },
};
