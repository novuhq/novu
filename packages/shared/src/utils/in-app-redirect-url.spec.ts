import { describe, expect, it } from 'vitest';
import {
  isValidInAppRedirectTarget,
  isValidInAppRedirectUrl,
  sanitizeInAppRedirect,
  sanitizeMessageCta,
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

  describe('sanitizeMessageCta', () => {
    it('should keep allowlisted redirect URLs on the notification and its buttons', () => {
      expect(
        sanitizeMessageCta({
          type: 'redirect',
          data: { url: 'https://example.com/inbox', target: '_blank' },
          action: {
            buttons: [
              { type: 'primary', content: 'Open', url: '/dashboard', target: '_self' },
              { type: 'secondary', content: 'Docs', url: 'https://example.com/{{id}}', target: '_blank' },
            ],
          },
        })
      ).toEqual({
        type: 'redirect',
        data: { url: 'https://example.com/inbox', target: '_blank' },
        action: {
          buttons: [
            { type: 'primary', content: 'Open', url: '/dashboard', target: '_self' },
            { type: 'secondary', content: 'Docs', url: 'https://example.com/{{id}}', target: '_blank' },
          ],
        },
      });
    });

    it('should strip unsafe schemes from stored CTA urls without dropping button labels', () => {
      const cta = {
        type: 'redirect',
        data: { url: 'javascript:alert(1)', target: '_self' },
        action: {
          status: 'pending',
          buttons: [
            { type: 'primary', content: 'Primary', url: 'javascript:alert(1)', target: '_blank' },
            { type: 'secondary', content: 'Secondary', url: 'data:text/html,hi', target: '_self' },
          ],
        },
      };

      expect(sanitizeMessageCta(cta)).toEqual({
        type: 'redirect',
        data: {},
        action: {
          status: 'pending',
          buttons: [
            { type: 'primary', content: 'Primary' },
            { type: 'secondary', content: 'Secondary' },
          ],
        },
      });
      expect(cta.data.url).toBe('javascript:alert(1)');
    });

    it('should drop invalid targets and protocol-relative urls', () => {
      expect(
        sanitizeMessageCta({
          data: { url: 'https://example.com', target: 'javascript:' },
          action: {
            buttons: [{ type: 'primary', content: 'Go', url: '//evil.example', target: '_blank' }],
          },
        })
      ).toEqual({
        data: { url: 'https://example.com' },
        action: {
          buttons: [{ type: 'primary', content: 'Go' }],
        },
      });
    });

    it('should return undefined when the CTA is missing', () => {
      expect(sanitizeMessageCta(undefined)).toBeUndefined();
    });
  });
});
