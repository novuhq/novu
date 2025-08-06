import { EmailBlockTypeEnum, IEmailBlock } from '@novu/shared';
import { expect } from 'chai';

/* cspell:disable next-line */
import { sanitizeHTMLV0 as sanitizeHTML, sanitizeMessageContentV0 } from './sanitizer-v0.service';

describe('HTML Sanitizer', () => {
  it('should sanitize bad html', () => {
    const sanitizedHtml = sanitizeHTML('hello <b>bold</b> <script>alert(123)</script>');
    expect(sanitizedHtml).to.equal('hello <b>bold</b> ');
  });

  it('should sanitized message text content', () => {
    const result = sanitizeMessageContentV0('hello <b>bold</b> <script>alert(123)</script>');
    expect(result).to.equal('hello <b>bold</b> ');
  });

  it('should sanitized message email block content', () => {
    const result = sanitizeMessageContentV0([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: 'hello <b>bold</b> <script>alert(123)</script>',
        url: '',
      },
    ]) as IEmailBlock[];

    expect(result[0].content).to.equal('hello <b>bold</b> ');
  });

  it('should NOT sanitize style tags', () => {
    const result = sanitizeMessageContentV0([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<style>p { color: red; }</style><p>Red Text</p>',
        url: '',
      },
    ]) as IEmailBlock[];

    expect(result[0].content).to.equal('<style>p { color: red; }</style><p>Red Text</p>');
  });

  it('should NOT sanitize style attributes', () => {
    const result = sanitizeMessageContentV0([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<p style="color: red;">Red Text</p>',
        url: '',
      },
    ]) as IEmailBlock[];

    expect(result[0].content).to.equal('<p style="color: red;">Red Text</p>');
  });

  it('should NOT format style attributes', () => {
    const result = sanitizeMessageContentV0([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<p style="color:red;">Red Text</p>',
        url: '',
      },
    ]) as IEmailBlock[];

    expect(result[0].content).to.equal('<p style="color:red;">Red Text</p>');
  });

  it('should NOT sanitize img tags', () => {
    const result = sanitizeMessageContentV0([
      {
        type: EmailBlockTypeEnum.TEXT,
        content: '<img src="https://example.com/image.jpg" alt="Example Image">',
        url: '',
      },
    ]) as IEmailBlock[];

    expect(result[0].content).to.equal('<img src="https://example.com/image.jpg" alt="Example Image" />');
  });
});
