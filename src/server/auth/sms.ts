import { parsePhoneNumberFromString } from "libphonenumber-js/max";

export class AuthError extends Error {
  constructor(
    readonly status: number,
    message: string,
    readonly retryAfter?: number,
  ) {
    super(message);
  }
}

export function normalizedPhone(input: string) {
  const value = input.trim();
  const number = parsePhoneNumberFromString(value, { extract: false });
  if (!value.startsWith("+") || !number?.isValid() || number.ext)
    throw new AuthError(400, "Проверьте страну и номер телефона.");
  return number.number;
}

export function maskedPhone(phone: string) {
  const callingCode = parsePhoneNumberFromString(phone)?.countryCallingCode;
  return `+${callingCode ?? ""} ••• ••• ${phone.slice(-4)}`;
}

export interface SmsProvider {
  start(phone: string): Promise<string>;
  approved(ref: string, phone: string, code: string): Promise<boolean>;
}

function config() {
  const service = process.env.TWILIO_VERIFY_SERVICE_SID;
  const apiKey = process.env.TWILIO_API_KEY;
  const identifier = apiKey || process.env.TWILIO_ACCOUNT_SID;
  const secret = apiKey
    ? process.env.TWILIO_API_SECRET
    : process.env.TWILIO_AUTH_TOKEN;
  if (
    !service ||
    !/^VA[0-9a-f]{32}$/i.test(service) ||
    !identifier ||
    !/^(AC|SK)[0-9a-f]{32}$/i.test(identifier) ||
    !secret
  )
    return null;
  return { service, identifier, secret };
}

export const smsConfigured = () => Boolean(config());

/** The live route always constructs this provider. Test adapters enter only by injection in tests. */
export function smsProvider(): SmsProvider {
  const auth = config();
  if (!auth)
    throw new AuthError(
      503,
      "Отправка SMS не настроена. Администратору нужно подключить Twilio Verify.",
    );
  const { service, identifier, secret } = auth;
  async function post(
    resource: "Verifications" | "VerificationCheck",
    form: Record<string, string>,
  ) {
    let response: Response;
    try {
      response = await fetch(
        `https://verify.twilio.com/v2/Services/${service}/${resource}`,
        {
          method: "POST",
          cache: "no-store",
          redirect: "error",
          signal: AbortSignal.timeout(10000),
          headers: {
            Authorization:
              "Basic " +
              Buffer.from(identifier + ":" + secret).toString("base64"),
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams(form),
        },
      );
    } catch {
      throw new AuthError(
        503,
        "Сервис SMS временно недоступен. Попробуйте позже.",
      );
    }
    if (resource === "VerificationCheck" && response.status === 404)
      return null;
    if (response.status === 429)
      throw new AuthError(429, "Слишком много запросов. Попробуйте позже.", 60);
    if (!response.ok)
      throw new AuthError(
        503,
        "Сервис SMS не смог выполнить запрос. Проверьте настройки сервиса или попробуйте позже.",
      );
    return (await response.json().catch(() => null)) as {
      sid?: string;
      status?: string;
      service_sid?: string;
      to?: string;
    } | null;
  }
  return {
    async start(phone) {
      const result = await post("Verifications", { To: phone, Channel: "sms" });
      if (
        result?.status !== "pending" ||
        result.service_sid !== service ||
        result.to !== phone ||
        !/^VE[0-9a-f]{32}$/i.test(result.sid ?? "")
      )
        throw new AuthError(503, "Сервис SMS не подтвердил отправку кода.");
      return result.sid!;
    },
    async approved(ref, phone, code) {
      const result = await post("VerificationCheck", {
        VerificationSid: ref,
        Code: code,
      });
      return (
        result?.status === "approved" &&
        result.sid === ref &&
        result.service_sid === service &&
        result.to === phone
      );
    },
  };
}
