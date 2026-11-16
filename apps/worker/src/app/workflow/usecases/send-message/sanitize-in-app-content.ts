import { sanitizeHTML } from '@novu/application-generic';

/**
 * Strips executable HTML (event handlers, scripts, javascript: URLs) from compiled legacy (v1)
 * in-app content. V2 workflows are already sanitized by the in-app output renderer.
 *
 * Handlebars escapes `{{variables}}`, so a `<` can only come from the template itself or an
 * unescaped `{{{variable}}}`. Plain-text content is returned untouched, which skips the parser
 * on the common path and avoids re-encoding characters like `&` that the Inbox renders as text.
 */
export function sanitizeInAppContent(content: string): string {
  if (!content || !content.includes('<')) {
    return content;
  }

  return sanitizeHTML(content);
}
