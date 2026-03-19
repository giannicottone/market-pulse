import { appConfig } from "@/lib/config";

type RequestOptions = RequestInit & {
  timeoutMs?: number;
};

export async function fetchWithRetry(
  input: string,
  init: RequestOptions = {},
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= appConfig.retryAttempts; attempt += 1) {
    const controller = new AbortController();
    const timeoutId = setTimeout(
      () => controller.abort(),
      init.timeoutMs ?? appConfig.requestTimeoutMs,
    );

    try {
      const response = await fetch(input, {
        ...init,
        signal: controller.signal,
        cache: "no-store",
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      return response;
    } catch (error) {
      clearTimeout(timeoutId);
      lastError = error;

      if (attempt === appConfig.retryAttempts) {
        break;
      }
    }
  }

  throw lastError instanceof Error ? lastError : new Error("Request failed");
}
