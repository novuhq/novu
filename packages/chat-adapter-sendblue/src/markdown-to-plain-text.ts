import {
  isLinkNode,
  isTableNode,
  parseMarkdown,
  stringifyMarkdown,
  tableToAscii,
  toPlainText,
  walkAst,
} from 'chat';

function stripMarkdownDecorators(markdown: string): string {
  return markdown
    .replace(/^```[^\n]*\n([\s\S]*?)^```/gm, '$1')
    .replace(/^#{1,6}\s+/gm, '')
    .replace(/\*\*(.+?)\*\*/g, '$1')
    .replace(/__(.+?)__/g, '$1')
    .replace(/(?<!\w)\*(?!\*)([^*\n]+?)\*(?!\*)/g, '$1')
    .replace(/(?<!\w)_(?!_)([^_\n]+?)_(?!_)/g, '$1')
    .replace(/~~(.+?)~~/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/^>\s?/gm, '')
    .replace(/^\s*[-*+]\s+/gm, '• ')
    .replace(/\\([\\`*_{}[\]()#+\-.!:|])/g, '$1')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

/** Convert markdown to iMessage/SMS plain text: ASCII tables, `label (url)` links, no decorations. */
export function markdownToPlainText(markdown: string): string {
  if (!markdown) {
    return '';
  }

  const ast = parseMarkdown(markdown);
  const transformed = walkAst(structuredClone(ast), (node) => {
    if (isTableNode(node)) {
      return {
        type: 'code',
        value: tableToAscii(node),
        lang: undefined,
      };
    }

    if (isLinkNode(node)) {
      const label = toPlainText({ type: 'root', children: node.children ?? [] }).trim();

      return {
        type: 'text',
        value: label ? `${label} (${node.url})` : node.url,
      };
    }

    return node;
  });

  return stripMarkdownDecorators(stringifyMarkdown(transformed));
}
