import { describe, expect, it } from 'vitest';
import { NovuApiError } from './api/client';
import { isKeylessLimitError } from './keyless-limit-error';

describe('isKeylessLimitError', () => {
  it('detects the daily agent generation limit message', () => {
    const err = new NovuApiError(
      'Daily agent generation limit reached for this demo. Sign up for a free Novu account or try again tomorrow.',
      429,
      'POST https://api.novu.co/v1/agents/generate',
      {}
    );

    expect(isKeylessLimitError(err)).toBe(true);
  });

  it('detects the daily keyless environment creation limit message', () => {
    const err = new Error(
      'Failed to start a keyless session (429): Daily keyless demo limit reached. Sign up for a free Novu account or try again tomorrow.'
    );

    expect(isKeylessLimitError(err)).toBe(true);
  });

  it('ignores unrelated API errors', () => {
    const err = new NovuApiError('Unauthorized', 401, 'POST https://api.novu.co/v1/agents/generate', {});

    expect(isKeylessLimitError(err)).toBe(false);
  });
});
