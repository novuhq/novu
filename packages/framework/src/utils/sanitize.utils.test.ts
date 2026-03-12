import { describe, expect, it } from 'vitest';
import { sanitizeHtmlInObject } from './sanitize.utils';

const scriptBody = `<script>alert('Hello there')</script>`;

describe('sanitize util', () => {
  it('should remove script tags from an object', () => {
    const myTestObject = {
      property: scriptBody,
      numberItem: 0,
      nullItem: null,
      emptyObjectItem: {},
      booleanItem: true,
      listOfStrings: [scriptBody, scriptBody],
      moreProperties: {
        property: scriptBody,
        listOfStrings: [scriptBody, scriptBody],
      },
      listOfObjects: [{ property: scriptBody }, { property: scriptBody }],
    };

    const result = sanitizeHtmlInObject(myTestObject);

    expect(result).toStrictEqual({
      property: '',
      numberItem: 0,
      nullItem: null,
      emptyObjectItem: {},
      booleanItem: true,
      listOfStrings: ['', ''],
      moreProperties: { property: '', listOfStrings: ['', ''] },
      listOfObjects: [{ property: '' }, { property: '' }],
    });
  });

  it('should convert camelCased attributes to lowercase', () => {
    const myTestObject = {
      input:
        '<table align="center" width="100%" border="0" cellPadding="0" cellSpacing="0" role="presentation"><tr><td>Hello</td></tr></table>',
    };

    const result = sanitizeHtmlInObject(myTestObject);

    expect(result).toStrictEqual({
      input:
        '<table align="center" width="100%" border="0" cellpadding="0" cellspacing="0" role="presentation"><tr><td>Hello</td></tr></table>',
    });
  });

  type TestCase = {
    tag: string;
    input: string;
    expected: string;
  };

  const keepTagTestCases: TestCase[] = [
    {
      tag: 'body',
      input: '<body>Hello</body>',
      expected: '<body>Hello</body>',
    },
    {
      tag: 'div',
      input: '<div>Hello</div>',
      expected: '<div>Hello</div>',
    },
    {
      tag: 'table',
      input: '<table><tr><td>Hello</td></tr></table>',
      expected: '<table><tr><td>Hello</td></tr></table>',
    },
    {
      tag: 'a',
      input: '<a href="https://example.com">Hello</a>',
      expected: '<a href="https://example.com">Hello</a>',
    },
    {
      tag: 'img',
      input: '<img src="https://example.com/image.jpg" alt="Hello" />',
      expected: '<img src="https://example.com/image.jpg" alt="Hello" />',
    },
    {
      tag: 'p',
      input: '<p>Hello</p>',
      expected: '<p>Hello</p>',
    },
    {
      tag: 'span',
      input: '<span>Hello</span>',
      expected: '<span>Hello</span>',
    },
    {
      tag: 'DOCTYPE',
      input:
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
      expected:
        '<!DOCTYPE html PUBLIC "-//W3C//DTD XHTML 1.0 Transitional//EN" "http://www.w3.org/TR/xhtml1/DTD/xhtml1-transitional.dtd">',
    },
    {
      tag: 'title',
      input: '<title>Hello</title>',
      expected: '<title>Hello</title>',
    },
    {
      tag: 'meta',
      input: '<meta name="description" content="Hello" />',
      expected: '<meta name="description" content="Hello" />',
    },
    {
      tag: 'link',
      input: '<link rel="stylesheet" href="https://example.com/style.css" />',
      expected: '<link rel="stylesheet" href="https://example.com/style.css" />',
    },
    {
      tag: 'style',
      input: '<style>body { background-color: red; }</style>',
      expected: '<style>body { background-color: red; }</style>',
    },
    {
      tag: 'br',
      input: '<br />',
      expected: '<br />',
    },
    {
      tag: 'hr',
      input: '<hr />',
      expected: '<hr />',
    },
  ];

  keepTagTestCases.forEach(({ tag, input, expected }) => {
    it(`should not remove <${tag}> tags`, () => {
      const myTestObject = { input };
      const result = sanitizeHtmlInObject(myTestObject);
      expect(result).toStrictEqual({ input: expected });
    });
  });

  it('should strip oncontentvisibilityautostatechange attribute', () => {
    const myTestObject = {
      input:
        '<a oncontentvisibilityautostatechange="alert(window.origin)" style="display:block;content-visibility:auto">click</a>',
    };
    const result = sanitizeHtmlInObject(myTestObject);

    expect(result.input).not.toContain('oncontentvisibilityautostatechange');
    expect(result.input).not.toContain('alert');
    expect(result.input).toContain('<a');
    expect(result.input).toContain('style="display:block;content-visibility:auto"');
  });

  it('should strip any attribute starting with "on" as event handlers', () => {
    const myTestObject = {
      input: '<div onfutureevent="alert(1)" data-value="safe">Content</div>',
    };
    const result = sanitizeHtmlInObject(myTestObject);

    expect(result.input).not.toContain('onfutureevent');
    expect(result.input).not.toContain('alert');
    expect(result.input).toContain('data-value="safe"');
    expect(result.input).toContain('Content');
  });

  it('should strip onclick from non-img tags', () => {
    const myTestObject = {
      input: '<a href="https://example.com" onclick="alert(1)">Link</a>',
    };
    const result = sanitizeHtmlInObject(myTestObject);

    expect(result.input).not.toContain('onclick');
    expect(result.input).toContain('href="https://example.com"');
    expect(result.input).toContain('Link');
  });

  const removeTagTestCases: TestCase[] = [
    {
      tag: 'script',
      input: scriptBody,
      expected: '',
    },
    {
      tag: 'button',
      input: '<button>Click me</button>',
      expected: 'Click me',
    },
    {
      tag: 'iframe',
      input: '<iframe src="https://example.com"></iframe>',
      expected: '',
    },
  ];

  removeTagTestCases.forEach(({ tag, input, expected }) => {
    it(`should remove <${tag}> tags`, () => {
      const myTestObject = { input };
      const result = sanitizeHtmlInObject(myTestObject);
      expect(result).toStrictEqual({ input: expected });
    });
  });

  it('should prevent XSS via malformed style closing tag </style/>', () => {
    const myTestObject = {
      input: '<style></style/><img src onerror=alert(origin)></style>',
    };
    const result = sanitizeHtmlInObject(myTestObject);

    expect(result.input).not.toContain('onerror');
    expect(result.input).not.toContain('alert');
  });

  it('should preserve legitimate style tags after normalization', () => {
    const myTestObject = {
      input: '<style>body { color: red; }</style>',
    };
    const result = sanitizeHtmlInObject(myTestObject);

    expect(result.input).toContain('<style>');
    expect(result.input).toContain('body { color: red; }');
    expect(result.input).toContain('</style>');
  });
});
