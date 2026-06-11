import { describe, expect, it } from 'vitest';
import { resolveProviderToRecipients } from './email-recipients.utils';

describe('resolveProviderToRecipients', () => {
  it('should keep non-empty to recipients', () => {
    const result = resolveProviderToRecipients({
      to: ['recipient@example.com'],
      cc: ['cc@example.com'],
      from: 'sender@example.com',
    });

    expect(result.to).toEqual(['recipient@example.com']);
    expect(result.headers).toEqual({});
  });

  it('should use from as to when to is empty and cc is provided', () => {
    const result = resolveProviderToRecipients({
      to: [],
      cc: ['cc@example.com'],
      from: 'sender@example.com',
    });

    expect(result.to).toEqual(['sender@example.com']);
    expect(result.headers).toEqual({});
  });

  it('should use from as to when to is empty and bcc is provided', () => {
    const result = resolveProviderToRecipients({
      to: [],
      bcc: ['bcc@example.com'],
      from: 'sender@example.com',
    });

    expect(result.to).toEqual(['sender@example.com']);
  });

  it('should keep empty to when no cc or bcc is provided', () => {
    const result = resolveProviderToRecipients({
      to: [],
      from: 'sender@example.com',
    });

    expect(result.to).toEqual([]);
  });

  it('should preserve existing headers', () => {
    const result = resolveProviderToRecipients({
      to: [],
      cc: ['cc@example.com'],
      from: 'sender@example.com',
      headers: { 'X-Custom': 'value' },
    });

    expect(result.headers).toEqual({ 'X-Custom': 'value' });
  });
});
