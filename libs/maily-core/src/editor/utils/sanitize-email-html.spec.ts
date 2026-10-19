import { describe, expect, it } from 'vitest';
import { sanitizeEmailHtml } from './sanitize-email-html';

describe('sanitizeEmailHtml', () => {
  it('strips javascript: href payloads used in stored email preview XSS', () => {
    const maliciousHtml = '<a href="javascript:alert(document.domain)">Click here to preview</a>';
    const sanitized = sanitizeEmailHtml(maliciousHtml);

    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('alert');
    expect(sanitized).toContain('Click here to preview');
  });

  it('strips mixed-case javascript: and vbscript: URL schemes', () => {
    expect(sanitizeEmailHtml('<a href="JaVaScRiPt:alert(1)">x</a>')).not.toContain('javascript:');
    expect(sanitizeEmailHtml('<a href="vbscript:alert(1)">x</a>')).not.toContain('vbscript:');
  });

  it('strips javascript: from img src attributes', () => {
    const sanitized = sanitizeEmailHtml('<img src="javascript:alert(1)">');

    expect(sanitized).not.toContain('javascript:');
    expect(sanitized).not.toContain('alert');
  });

  it('preserves safe absolute and relative links', () => {
    expect(sanitizeEmailHtml('<a href="https://example.com">safe</a>')).toContain('href="https://example.com"');
    expect(sanitizeEmailHtml('<a href="/relative/path">safe</a>')).toContain('href="/relative/path"');
    expect(sanitizeEmailHtml('<a href="mailto:test@example.com">safe</a>')).toContain('href="mailto:test@example.com"');
  });
});
