import * as sanitize from 'sanitize-html';
import { IEmailBlock } from '@novu/shared';

/**
 * Options for the sanitize-html library.
 *
 * @see https://www.npmjs.com/package/sanitize-html#default-options
 */
const sanitizeOptions: sanitize.IOptions = {
  /**
   * Additional tags to allow.
   */
  allowedTags: sanitize.defaults.allowedTags.concat(['style', 'img']),
  allowedAttributes: {
    ...sanitize.defaults.allowedAttributes,
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

export function sanitizeHTML(html: string) {
  if (!html) return html;

  return sanitize(html, sanitizeOptions);
}

export function sanitizeMessageContent(content: string | IEmailBlock[]) {
  if (typeof content === 'string') {
    return sanitizeHTML(content);
  }

  if (Array.isArray(content)) {
    return content.map((i) => {
      return {
        ...i,
        content: sanitizeHTML(i.content),
      };
    });
  }

  return content;
}
