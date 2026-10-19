import { describe, expect, it } from 'vitest';
import { toSafeExternalUrl } from './url';

describe('toSafeExternalUrl', () => {
  it('returns absolute http(s) URLs unchanged', () => {
    expect(toSafeExternalUrl('https://example.com/authorize?autoApprove=true')).toBe(
      'https://example.com/authorize?autoApprove=true'
    );
    expect(toSafeExternalUrl('http://localhost:3000/oauth')).toBe('http://localhost:3000/oauth');
  });

  it('rejects javascript: URLs', () => {
    expect(toSafeExternalUrl('javascript:alert(document.domain)')).toBeUndefined();
    expect(toSafeExternalUrl('JaVaScRiPt:alert(1)')).toBeUndefined();
    expect(toSafeExternalUrl('  \n javascript:alert(1)')).toBeUndefined();
  });

  it('rejects other non-http(s) schemes', () => {
    expect(toSafeExternalUrl('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(toSafeExternalUrl('vbscript:msgbox(1)')).toBeUndefined();
    expect(toSafeExternalUrl('file:///etc/passwd')).toBeUndefined();
  });

  it('rejects relative and malformed URLs', () => {
    expect(toSafeExternalUrl('/oauth/authorize')).toBeUndefined();
    expect(toSafeExternalUrl('not a url')).toBeUndefined();
  });

  it('rejects empty values', () => {
    expect(toSafeExternalUrl('')).toBeUndefined();
    expect(toSafeExternalUrl(null)).toBeUndefined();
    expect(toSafeExternalUrl(undefined)).toBeUndefined();
  });
});
