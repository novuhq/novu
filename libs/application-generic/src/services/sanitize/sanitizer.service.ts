import sanitizeTypes, { IOptions } from 'sanitize-html';

/**
 * Options for the sanitize-html library.
 *
 * We are providing a permissive approach by default, with the exception of
 * disabling `script` tags.
 *
 * @see https://www.npmjs.com/package/sanitize-html#default-options
 */
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

/**
 * Normalizes malformed closing tags like </style/> to </style>.
 *
 * Browsers treat </tag/> and </tag/anything> as valid closing tags,
 * but htmlparser2 (used by sanitize-html) does not. This mismatch
 * allows XSS payloads to be hidden inside style tag content:
 *   <style></style/><img src onerror=alert(origin)></style>
 */
function normalizeMalformedClosingTags(html: string): string {
  return html.replace(/<\/([a-zA-Z][a-zA-Z0-9]*)\s*\/[^>]*>/g, '</$1>');
}

const sanitizeOptions: IOptions = {
  /**
   * Additional tags to allow.
   */
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
  /**
   * Transform img tags to strip dangerous event handler attributes (onerror, onload, etc.)
   * while keeping all other attributes permissive for other tags.
   */
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
  /**
   * Additional URL schemes to allow in src, href, and other URL attributes.
   * Including 'cid:' for Content-ID references used in email attachments.
   */
  allowedSchemes: sanitizeTypes.defaults.allowedSchemes.concat(['cid']),
  /**
   * Required to disable console warnings when allowing style tags.
   *
   * We are allowing style tags to support the use of styles in the In-App Editor.
   * This is a known security risk through an XSS attack vector,
   * but we are accepting this risk by dropping support for IE11.
   *
   * @see https://cheatsheetseries.owasp.org/cheatsheets/XSS_Filter_Evasion_Cheat_Sheet.html#remote-style-sheet
   */
  allowVulnerableTags: true,
  /**
   * Required to disable formatting of style attributes. This is useful to retain
   * formatting of style attributes in the In-App Editor.
   */
  parseStyleAttributes: false,
  parser: {
    // Convert the case of attribute names to lowercase.
    lowerCaseAttributeNames: true,
  },
};

export const sanitizeHTML = (html: string): string => {
  if (!html) {
    return html;
  }

  const normalizedHtml = normalizeMalformedClosingTags(html);

  // Sanitize-html removes the DOCTYPE tag, so we need to add it back.
  const doctypeRegex = /^<!DOCTYPE .*?>/;
  const doctypeTags = normalizedHtml.match(doctypeRegex);
  const cleanHtml = sanitizeTypes(normalizedHtml, sanitizeOptions);

  const cleanHtmlWithDocType = doctypeTags ? doctypeTags[0] + cleanHtml : cleanHtml;

  return cleanHtmlWithDocType;
};

export const sanitizeHtmlInObject = <T extends Record<string, unknown>>(object: T): T => {
  return Object.keys(object).reduce((acc, key: keyof T) => {
    const value = object[key];

    if (typeof value === 'string') {
      acc[key] = sanitizeHTML(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      acc[key] = value.map((item) => {
        if (typeof item === 'string') {
          return sanitizeHTML(item);
        } else if (typeof item === 'object') {
          return sanitizeHtmlInObject(item);
        } else {
          return item;
        }
      }) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      acc[key] = sanitizeHtmlInObject(value as Record<string, unknown>) as T[keyof T];
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as T);
};
