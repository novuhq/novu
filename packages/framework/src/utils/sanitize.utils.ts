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

export const sanitizeHTML = (html: string): string => {
  if (!html) {
    return html;
  }

  return sanitizeTypes(html, sanitizeOptions);
};

export const sanitizeHtmlInObject = <T extends Record<string, unknown>>(object: T): T => {
  return Object.keys(object).reduce((acc, key: keyof T) => {
    const value = object[key];

    if (typeof value === 'string') {
      acc[key] = sanitizeHTML(value) as T[keyof T];
    } else if (Array.isArray(value)) {
      acc[key] = value.map((item) =>
        typeof item === 'string' ? sanitizeHTML(item) : typeof item === 'object' ? sanitizeHtmlInObject(item) : item
      ) as T[keyof T];
    } else if (typeof value === 'object' && value !== null) {
      acc[key] = sanitizeHtmlInObject(value as Record<string, unknown>) as T[keyof T];
    } else {
      acc[key] = value;
    }

    return acc;
  }, {} as T);
};
