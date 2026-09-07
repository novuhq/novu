import {
  createWebhookFilterError,
  isRetryableWebhookFilterError,
  isWebhookFilterSsrfBlockedError,
  parseWebhookFilterError,
  shouldPropagateWebhookFilterFailure,
  WEBHOOK_FILTER_ERROR_CODE,
  WEBHOOK_FILTER_REQUEST_FAILED_DATA,
  WEBHOOK_FILTER_SSRF_BLOCKED_DATA,
} from './webhook-filter-errors';

describe('webhook-filter-errors', () => {
  it('detects structured SSRF blocked errors', () => {
    const error = createWebhookFilterError({
      code: WEBHOOK_FILTER_ERROR_CODE.SSRF_BLOCKED,
      message: 'Requests to "127.0.0.1" are not allowed.',
      data: WEBHOOK_FILTER_SSRF_BLOCKED_DATA,
    });

    expect(parseWebhookFilterError(error)).toEqual({
      code: WEBHOOK_FILTER_ERROR_CODE.SSRF_BLOCKED,
      message: 'Requests to "127.0.0.1" are not allowed.',
      data: WEBHOOK_FILTER_SSRF_BLOCKED_DATA,
    });
    expect(isWebhookFilterSsrfBlockedError(error)).toBe(true);
    expect(isRetryableWebhookFilterError(error)).toBe(false);
    expect(shouldPropagateWebhookFilterFailure(error)).toBe(true);
  });

  it('detects structured transient webhook request failures', () => {
    const error = createWebhookFilterError({
      code: WEBHOOK_FILTER_ERROR_CODE.REQUEST_FAILED,
      message: 'timeout',
      data: WEBHOOK_FILTER_REQUEST_FAILED_DATA,
    });

    expect(isRetryableWebhookFilterError(error)).toBe(true);
    expect(isWebhookFilterSsrfBlockedError(error)).toBe(false);
    expect(shouldPropagateWebhookFilterFailure(error)).toBe(true);
  });

  it('supports legacy substring-encoded webhook filter errors', () => {
    const ssrfError = new Error(
      JSON.stringify({
        message: 'Requests to "127.0.0.1" are not allowed.',
        data: WEBHOOK_FILTER_SSRF_BLOCKED_DATA,
      })
    );
    const transientError = new Error(
      JSON.stringify({
        message: 'timeout',
        data: WEBHOOK_FILTER_REQUEST_FAILED_DATA,
      })
    );

    expect(isWebhookFilterSsrfBlockedError(ssrfError)).toBe(true);
    expect(isRetryableWebhookFilterError(transientError)).toBe(true);
  });

  it('returns null for unrelated errors', () => {
    const error = new Error('Notification with id abc not found');

    expect(parseWebhookFilterError(error)).toBeNull();
    expect(shouldPropagateWebhookFilterFailure(error)).toBe(false);
  });
});
