import { IEmailBlock } from '@novu/shared';
import sanitizeTypes, { IOptions } from 'sanitize-html';

/**
 * Options for the sanitize-html library.
 *
 * @see https://www.npmjs.com/package/sanitize-html#default-options
 */
const sanitizeOptions: IOptions = {
  /**
   * Additional tags to allow.
   */
  allowedTags: sanitizeTypes.defaults.allowedTags.concat(['style', 'img']),
  allowedAttributes: {
    ...sanitizeTypes.defaults.allowedAttributes,
    /**
     * Additional attributes to allow on all tags.
     */
    '*': ['style'],
    img: ['src', 'srcset', 'alt', 'title', 'width', 'height', 'loading'],
  },
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
};

/**
 * @deprecated Use sanitizeHTML from sanitizer.service.ts instead
 */
// cspell:disable-next-line
export function sanitizeHTMLV0(html: string) {
  if (!html) return html;

  return sanitizeTypes(html, sanitizeOptions);
}

/**
 * @deprecated Use sanitizeHtmlInObject from sanitizer.service.ts instead
 */
export const sanitizeHtmlInObjectV0 = <T extends Record<string, unknown>>(object: T): T => {
  return Object.keys(object).reduce((acc, key: keyof T) => {
    const value = object[key];

    if (typeof value === 'string') {
      // cspell:disable-next-line
      acc[key] = sanitizeHTMLV0(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      // cspell:disable-next-line
      acc[key] = value.map((item) => {
        if (typeof item === 'string') {
          // cspell:disable-next-line
          return sanitizeHTMLV0(item);
        } else if (typeof item === 'object') {
          return sanitizeHtmlInObjectV0(item);
        } else {
          return item;
        }
      }) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      acc[key] = sanitizeHtmlInObjectV0(value as Record<string, unknown>) as T[keyof T];
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as T);
};

/**
 * @deprecated Use sanitizer.service.ts instead
 */
export function sanitizeMessageContentV0(content: string | IEmailBlock[]) {
  if (typeof content === 'string') {
    // cspell:disable-next-line
    return sanitizeHTMLV0(content);
  }

  if (Array.isArray(content)) {
    return content.map((i) => {
      return {
        ...i,
        // cspell:disable-next-line
        content: sanitizeHTMLV0(i.content),
      };
    });
  }

  return content;
}
