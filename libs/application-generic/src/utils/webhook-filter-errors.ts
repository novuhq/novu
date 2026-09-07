export const WEBHOOK_FILTER_ERROR_CODE = {
  SSRF_BLOCKED: 'WEBHOOK_FILTER_SSRF_BLOCKED',
  REQUEST_FAILED: 'WEBHOOK_FILTER_REQUEST_FAILED',
} as const;

export const WEBHOOK_FILTER_SSRF_BLOCKED_DATA = 'Webhook URL blocked by SSRF protection.';
export const WEBHOOK_FILTER_REQUEST_FAILED_DATA = 'Exception while performing webhook request.';

export type WebhookFilterErrorPayload = {
  code: (typeof WEBHOOK_FILTER_ERROR_CODE)[keyof typeof WEBHOOK_FILTER_ERROR_CODE];
  message: string;
  data: string;
};

export function createWebhookFilterError(payload: WebhookFilterErrorPayload): Error {
  return new Error(JSON.stringify(payload));
}

export function parseWebhookFilterError(error: unknown): WebhookFilterErrorPayload | null {
  const message = error instanceof Error ? error.message : String(error);

  try {
    const parsed = JSON.parse(message) as Partial<WebhookFilterErrorPayload>;

    if (
      parsed &&
      typeof parsed.code === 'string' &&
      typeof parsed.message === 'string' &&
      typeof parsed.data === 'string'
    ) {
      return parsed as WebhookFilterErrorPayload;
    }
  } catch {
    // Fall through to legacy substring matching below.
  }

  if (message.includes(WEBHOOK_FILTER_REQUEST_FAILED_DATA)) {
    return {
      code: WEBHOOK_FILTER_ERROR_CODE.REQUEST_FAILED,
      message,
      data: WEBHOOK_FILTER_REQUEST_FAILED_DATA,
    };
  }

  if (message.includes(WEBHOOK_FILTER_SSRF_BLOCKED_DATA)) {
    return {
      code: WEBHOOK_FILTER_ERROR_CODE.SSRF_BLOCKED,
      message,
      data: WEBHOOK_FILTER_SSRF_BLOCKED_DATA,
    };
  }

  return null;
}

export function isWebhookFilterSsrfBlockedError(error: unknown): boolean {
  return parseWebhookFilterError(error)?.code === WEBHOOK_FILTER_ERROR_CODE.SSRF_BLOCKED;
}

export function isRetryableWebhookFilterError(error: unknown): boolean {
  return parseWebhookFilterError(error)?.code === WEBHOOK_FILTER_ERROR_CODE.REQUEST_FAILED;
}

export function shouldPropagateWebhookFilterFailure(error: unknown): boolean {
  return parseWebhookFilterError(error) !== null;
}
