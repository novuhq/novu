import { CompileEmailTemplate } from './compile-email-template.usecase';

const PREHEADER_BLOCK =
  /\{\{#if preheader\}\}\s*<div style="display: none;[^"]*">\s*\{\{preheader\}\}[^<]*<\/div>\s*\{\{\/if\}\}/;

function splitAtPreheader(html: string) {
  const match = html.match(PREHEADER_BLOCK);

  if (!match || match.index === undefined) {
    return null;
  }

  return { before: html.slice(0, match.index), after: html.slice(match.index + match[0].length) };
}

describe('CompileEmailTemplate.addPreheader', () => {
  it('returns an empty string unchanged', () => {
    expect(CompileEmailTemplate.addPreheader('')).toBe('');
  });

  it.each([
    ['<html><body><div>Hello World</div></body></html>', '<html><body>', '<div>Hello World</div></body></html>'],
    [
      '<html><body attribute="value"><div>Hello World</div></body></html>',
      '<html><body attribute="value">',
      '<div>Hello World</div></body></html>',
    ],
    [
      '<div> </div> \n <html><body attribute="value"><div>Hello World</div></body></html>',
      '<div> </div> \n <html><body attribute="value">',
      '<div>Hello World</div></body></html>',
    ],
  ])('inserts a hidden preheader right after the opening body tag of %j', (html, before, after) => {
    expect(splitAtPreheader(CompileEmailTemplate.addPreheader(html))).toEqual({ before, after });
  });

  it('adds the preheader only after the first body tag', () => {
    const result = CompileEmailTemplate.addPreheader('<html><body><div>Hello World</div> <body></body></html>');

    expect(splitAtPreheader(result)).toEqual({
      before: '<html><body>',
      after: '<div>Hello World</div> <body></body></html>',
    });
    expect(result.match(/\{\{preheader\}\}/g)).toHaveLength(1);
  });
});
