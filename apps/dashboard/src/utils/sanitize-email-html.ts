import sanitizeTypes, { IOptions } from 'sanitize-html';

const SAFE_IMG_ATTRIBUTES = [
  'src',
  'alt',
  'width',
  'height',
  'loading',
  'srcset',
  'sizes',
  'crossorigin',
  'usemap',
  'ismap',
  'class',
  'id',
  'style',
  'title',
  'dir',
  'lang',
];

function isEventHandlerAttribute(name: string): boolean {
  return name.toLowerCase().startsWith('on');
}

function normalizeMalformedClosingTags(html: string): string {
  return html.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*\/[^>]*>/g, '</$1>');
}

const sanitizeOptions: IOptions = {
  allowedTags: sanitizeTypes.defaults.allowedTags.concat([
    'style',
    'img',
    'html',
    'head',
    'body',
    'link',
    'meta',
    'title',
  ]),
  allowedAttributes: false,
  transformTags: {
    '*': (tagName, attribs) => {
      const safeAttribs: Record<string, string> = {};

      for (const [key, value] of Object.entries(attribs)) {
        if (!isEventHandlerAttribute(key)) {
          safeAttribs[key] = value;
        }
      }

      return {
        tagName,
        attribs: safeAttribs,
      };
    },
    img: (tagName, attribs) => {
      const safeAttribs: Record<string, string> = {};

      for (const [key, value] of Object.entries(attribs)) {
        if (SAFE_IMG_ATTRIBUTES.includes(key.toLowerCase())) {
          safeAttribs[key] = value;
        }
      }

      return {
        tagName,
        attribs: safeAttribs,
      };
    },
  },
  allowedSchemes: sanitizeTypes.defaults.allowedSchemes.concat(['cid']),
  allowVulnerableTags: true,
  parseStyleAttributes: false,
  parser: {
    lowerCaseAttributeNames: true,
  },
};

export function sanitizeEmailHtml(html: string): string {
  if (!html) {
    return html;
  }

  const normalizedHtml = normalizeMalformedClosingTags(html);
  const doctypeRegex = /^<!DOCTYPE .*?>/;
  const doctypeTags = normalizedHtml.match(doctypeRegex);
  const cleanHtml = sanitizeTypes(normalizedHtml, sanitizeOptions);

  return doctypeTags ? doctypeTags[0] + cleanHtml : cleanHtml;
}
