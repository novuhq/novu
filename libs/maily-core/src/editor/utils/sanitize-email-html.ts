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

const URL_SCHEME_ATTRIBUTES = new Set([
  'href',
  'src',
  'action',
  'formaction',
  'poster',
  'background',
  'cite',
  'longdesc',
  'data',
  'dynsrc',
  'lowsrc',
]);

const ALLOWED_URL_SCHEMES = new Set(
  sanitizeTypes.defaults.allowedSchemes.concat(['cid']).map((scheme) => scheme.toLowerCase())
);

function hasAllowedUrlScheme(value: string): boolean {
  const trimmed = value.trim();

  if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('/') || trimmed.startsWith('?')) {
    return true;
  }

  const schemeMatch = /^([a-zA-Z][a-zA-Z0-9+.-]*):/.exec(trimmed);

  if (!schemeMatch) {
    return true;
  }

  return ALLOWED_URL_SCHEMES.has(schemeMatch[1].toLowerCase());
}

function sanitizeAttribute(key: string, value: string): string | undefined {
  if (isEventHandlerAttribute(key)) {
    return undefined;
  }

  const lowerKey = key.toLowerCase();

  if (URL_SCHEME_ATTRIBUTES.has(lowerKey) || lowerKey.includes(':href') || lowerKey.includes(':src')) {
    return hasAllowedUrlScheme(value) ? value : undefined;
  }

  return value;
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
  // allowedSchemes still applies to URL attributes even when allowedAttributes is false.
  transformTags: {
    '*': (tagName, attribs) => {
      const safeAttribs: Record<string, string> = {};

      for (const [key, value] of Object.entries(attribs)) {
        const sanitizedValue = sanitizeAttribute(key, value);

        if (sanitizedValue !== undefined) {
          safeAttribs[key] = sanitizedValue;
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
        if (!SAFE_IMG_ATTRIBUTES.includes(key.toLowerCase())) {
          continue;
        }

        const sanitizedValue = sanitizeAttribute(key, value);

        if (sanitizedValue !== undefined) {
          safeAttribs[key] = sanitizedValue;
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
