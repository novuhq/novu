import { expect } from 'chai';
import { EmailBlockTypeEnum } from '@novu/shared';

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
        type: EmailBlockTypeEnum.TEXT,
        content: 'hello <b>bold</b> <script>alert(123)</script>',
        url: '',
      },
    ]);
    expect(result[0].content).to.equal('hello <b>bold</b> ');
  });

  it('should NOT sanitize style tags', function () {
    const result = sanitizeMessageContent([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<style>p { color: red; }</style><p>Red Text</p>',
        url: '',
      },
    ]);

    expect(result[0].content).to.equal('<style>p { color: red; }</style><p>Red Text</p>');
  });

  it('should NOT sanitize style attributes', function () {
    const result = sanitizeMessageContent([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<p style="color: red;">Red Text</p>',
        url: '',
      },
    ]);

    expect(result[0].content).to.equal('<p style="color: red;">Red Text</p>');
  });

  it('should NOT format style attributes', function () {
    const result = sanitizeMessageContent([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<p style="color:red;">Red Text</p>',
        url: '',
      },
    ]);

    expect(result[0].content).to.equal('<p style="color:red;">Red Text</p>');
  });

  it('should NOT sanitize img tags', function () {
    const result = sanitizeMessageContent([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<img src="https://example.com/image.jpg" alt="Example Image">',
        url: '',
      },
    ]);

    expect(result[0].content).to.equal('<img src="https://example.com/image.jpg" alt="Example Image" />');
  });
});
