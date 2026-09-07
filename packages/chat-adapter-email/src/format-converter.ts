import type { Content, Root } from 'chat';
import { toHtml } from 'hast-util-to-html';
import { toHast } from 'mdast-util-to-hast';

/**
 * Converts mdast AST to HTML for email bodies
 * using the standard mdast → hast → html pipeline.
 */
export class EmailFormatConverter {
  fromAst(ast: Root): string {
    const hast = toHast(ast);
    if (!hast) return '';

    return toHtml(hast);
  }

  toAst(text: string): Root {
    if (!text || text.trim() === '') {
      return { type: 'root', children: [] };
    }

    const paragraphs = text.split(/\n\n+/);
    const children: Content[] = paragraphs
      .filter((p) => p.trim() !== '')
      .map((p) => ({
        type: 'paragraph' as const,
        children: [{ type: 'text' as const, value: p.trim() }],
      }));

    return { type: 'root', children };
  }
}
