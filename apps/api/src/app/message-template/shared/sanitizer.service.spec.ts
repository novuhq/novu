import { expect } from 'chai';
import { sanitizeHTML, sanitizeMessageContent } from './sanitizer.service';

describe('HTML Sanitizer', function () {
  it('should sanitize bad html', function () {
    const sanitizedHtml = sanitizeHTML('hello <b>bold</b> <script>alert(123)</script>');
    expect(sanitizedHtml).to.equal('hello <b>bold</b> ');
  });

  it('should sanitized message text content', function () {
    const result = sanitizeMessageContent('hello <b>bold</b> <script>alert(123)</script>');
    expect(result).to.equal('hello <b>bold</b> ');
  });

  it('should sanitized message email block content', function () {
    const result = sanitizeMessageContent([
      {
        type: 'text',
        content: 'hello <b>bold</b> <script>alert(123)</script>',
        url: '',
      },
    ]);
    expect(result[0].content).to.equal('hello <b>bold</b> ');
  });
});
