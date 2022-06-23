import * as sanitize from 'sanitize-html';
import { IEmailBlock } from '@novu/shared';

export function sanitizeHTML(html: string) {
  if (!html) return html;

  return sanitize(html);
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
