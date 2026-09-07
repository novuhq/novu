import { describe, expect, it } from 'vitest';
import { getSafePreviewHref } from './card-renderer';

describe('getSafePreviewHref', () => {
  it('allows http and https URLs used by CardLink', () => {
    expect(getSafePreviewHref('https://novu.co/docs')).toBe('https://novu.co/docs');
    expect(getSafePreviewHref('http://example.com')).toBe('http://example.com');
  });

  it('rejects javascript: URIs that would XSS the dashboard chat preview', () => {
    // PoC from the stored DOM XSS report: CardLink({ url: 'javascript:alert(document.domain)' })
    expect(getSafePreviewHref('javascript:alert(document.domain)')).toBeUndefined();
    expect(getSafePreviewHref('JaVaScRiPt:alert(1)')).toBeUndefined();
    expect(getSafePreviewHref('  javascript:alert(1)  ')).toBeUndefined();
  });

  it('rejects other non-http(s) schemes', () => {
    expect(getSafePreviewHref('data:text/html,<script>alert(1)</script>')).toBeUndefined();
    expect(getSafePreviewHref('vbscript:msgbox(1)')).toBeUndefined();
    expect(getSafePreviewHref('mailto:user@example.com')).toBeUndefined();
  });

  it('rejects empty or invalid URLs', () => {
    expect(getSafePreviewHref('')).toBeUndefined();
    expect(getSafePreviewHref('   ')).toBeUndefined();
    expect(getSafePreviewHref('not a url')).toBeUndefined();
    expect(getSafePreviewHref('/relative/path')).toBeUndefined();
  });
});
