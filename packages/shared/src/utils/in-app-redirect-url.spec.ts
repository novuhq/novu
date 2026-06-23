import { describe, expect, it } from 'vitest';
import {
  isValidInAppRedirectTarget,
  isValidInAppRedirectUrl,
  sanitizeInAppRedirect,
} from './in-app-redirect-url';

describe('in-app-redirect-url', () => {
  describe('isValidInAppRedirectUrl', () => {
    it('should accept http and https URLs', () => {
      expect(isValidInAppRedirectUrl('https://example.com')).toBe(true);
      expect(isValidInAppRedirectUrl('http://example.com/path')).toBe(true);
    });

    it('should accept relative paths', () => {
      expect(isValidInAppRedirectUrl('/dashboard')).toBe(true);
      expect(isValidInAppRedirectUrl('/path/{{id}}')).toBe(true);
    });

    it('should accept template-variable URLs', () => {
      expect(isValidInAppRedirectUrl('{{url}}')).toBe(true);
      expect(isValidInAppRedirectUrl('https://example.com/{{id}}')).toBe(true);
    });

    it('should reject javascript and other unsafe schemes', () => {
      expect(isValidInAppRedirectUrl('javascript:alert(1)')).toBe(false);
      expect(isValidInAppRedirectUrl('data:text/html,<script>alert(1)</script>')).toBe(false);
      expect(isValidInAppRedirectUrl('vbscript:msgbox(1)')).toBe(false);
    });

    it('should reject mailto links', () => {
      expect(isValidInAppRedirectUrl('mailto:test@example.com')).toBe(false);
    });

    it('should reject protocol-relative URLs', () => {
      expect(isValidInAppRedirectUrl('//evil.com')).toBe(false);
      expect(isValidInAppRedirectUrl('//evil.com/path')).toBe(false);
      expect(isValidInAppRedirectUrl('///evil.com')).toBe(false);
    });
  });

  describe('isValidInAppRedirectTarget', () => {
    it('should accept supported window targets', () => {
      expect(isValidInAppRedirectTarget('_self')).toBe(true);
      expect(isValidInAppRedirectTarget('_blank')).toBe(true);
    });

    it('should reject arbitrary targets', () => {
      expect(isValidInAppRedirectTarget('javascript:')).toBe(false);
      expect(isValidInAppRedirectTarget('_custom')).toBe(false);
    });
  });

  describe('sanitizeInAppRedirect', () => {
    it('should return a redirect when the URL is valid', () => {
      expect(sanitizeInAppRedirect('https://example.com', '_self')).toEqual({
        url: 'https://example.com',
        target: '_self',
      });
    });

    it('should drop invalid URLs and targets', () => {
      expect(sanitizeInAppRedirect('javascript:alert(1)', '_self')).toBeUndefined();
      expect(sanitizeInAppRedirect('https://example.com', 'invalid-target')).toEqual({
        url: 'https://example.com',
      });
    });
  });
});
