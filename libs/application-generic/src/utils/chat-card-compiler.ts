import { JSONContent as MailyJSONContent } from '@novu/maily-render';
import {
  ChatCard,
  ChatCardActionsElement,
  ChatCardChild,
  ChatCardLinkButtonElement,
  ChatCardTextElement,
} from '@novu/shared';

/**
 * Compiles a (already liquid-resolved and transformed) Maily doc produced by the chat
 * block editor into the cross-platform ChatCard consumed by chat providers.
 *
 * The doc reuses Maily node types (`button`, `image`, `horizontalRule`) so the shared
 * liquid pipeline (wrapMailyInLiquid, transformMailyContent) applies unchanged;
 * showIf/repeat nodes are expected to be eliminated before compiling.
 */
export function compileMailyToChatCard(doc: MailyJSONContent): ChatCard {
  const children: ChatCardChild[] = [];
  appendBlockNodes(doc.content ?? [], children);

  return { type: 'card', children };
}

function appendBlockNodes(nodes: MailyJSONContent[], children: ChatCardChild[]): void {
  for (const node of nodes) {
    switch (node.type) {
      case 'paragraph': {
        const content = inlineToMarkdown(node.content ?? []);
        if (content.trim().length > 0) {
          children.push({ type: 'text', content });
        }
        break;
      }
      case 'heading': {
        const content = inlineToMarkdown(node.content ?? []);
        if (content.trim().length > 0) {
          children.push({ type: 'text', content: `**${content}**`, style: 'bold' });
        }
        break;
      }
      case 'bulletList':
      case 'orderedList': {
        const content = listToMarkdown(node, 0);
        if (content.trim().length > 0) {
          children.push({ type: 'text', content });
        }
        break;
      }
      case 'blockquote': {
        const inner: ChatCardChild[] = [];
        appendBlockNodes(node.content ?? [], inner);
        const quoted = inner
          .filter(isTextElement)
          .map((child) =>
            child.content
              .split('\n')
              .map((line) => `> ${line}`)
              .join('\n')
          )
          .join('\n');
        if (quoted.trim().length > 0) {
          children.push({ type: 'text', content: quoted });
        }
        break;
      }
      case 'codeBlock': {
        const code = (node.content ?? []).map((child) => child.text ?? '').join('');
        children.push({ type: 'text', content: `\`\`\`\n${code}\n\`\`\`` });
        break;
      }
      case 'button': {
        const button: ChatCardLinkButtonElement = {
          type: 'link-button',
          label: String(node.attrs?.text ?? ''),
          url: String(node.attrs?.url ?? ''),
        };
        const previous = children[children.length - 1];
        // Consecutive buttons collapse into a single actions row
        if (previous && isActionsElement(previous)) {
          previous.children.push(button);
        } else {
          children.push({ type: 'actions', children: [button] });
        }
        break;
      }
      case 'image':
      case 'inlineImage': {
        const url = String(node.attrs?.src ?? '');
        if (url) {
          children.push({ type: 'image', url, ...(node.attrs?.alt ? { alt: String(node.attrs.alt) } : {}) });
        }
        break;
      }
      case 'horizontalRule': {
        children.push({ type: 'divider' });
        break;
      }
      case 'text': {
        const content = inlineToMarkdown([node]);
        if (content.trim().length > 0) {
          children.push({ type: 'text', content });
        }
        break;
      }
      default: {
        // Unknown wrapper nodes (e.g. leftover sections): flatten their children
        if (node.content?.length) {
          appendBlockNodes(node.content, children);
        }
      }
    }
  }
}

function listToMarkdown(list: MailyJSONContent, depth: number): string {
  const ordered = list.type === 'orderedList';
  const indent = '  '.repeat(depth);
  const lines: string[] = [];

  (list.content ?? []).forEach((item, index) => {
    const marker = ordered ? `${index + 1}.` : '-';
    const itemLines: string[] = [];

    for (const child of item.content ?? []) {
      if (child.type === 'bulletList' || child.type === 'orderedList') {
        itemLines.push(listToMarkdown(child, depth + 1));
      } else {
        const text = inlineToMarkdown(child.content ?? []);
        if (text.trim().length > 0) {
          itemLines.push(`${indent}${marker} ${text}`);
        }
      }
    }

    lines.push(...itemLines);
  });

  return lines.join('\n');
}

function inlineToMarkdown(nodes: MailyJSONContent[]): string {
  return nodes
    .map((node) => {
      if (node.type === 'hardBreak') {
        return '\n';
      }

      let text = node.text ?? '';
      if (!node.marks?.length) {
        return text;
      }

      let linkHref: string | undefined;
      for (const mark of node.marks) {
        switch (mark.type) {
          case 'code':
            text = `\`${text}\``;
            break;
          case 'bold':
            text = `**${text}**`;
            break;
          case 'italic':
            text = `*${text}*`;
            break;
          case 'strike':
            text = `~~${text}~~`;
            break;
          case 'link':
            linkHref = typeof mark.attrs?.href === 'string' ? mark.attrs.href : undefined;
            break;
          default:
            break;
        }
      }

      return linkHref ? `[${text}](${linkHref})` : text;
    })
    .join('');
}

/**
 * Derives the plain-text/markdown `body` fallback delivered to providers without
 * native card rendering (and stored as the message content).
 */
export function chatCardToMarkdownFallback(card: ChatCard): string {
  const lines: string[] = [];

  if (card.title) {
    lines.push(`**${card.title}**`);
  }

  if (card.subtitle) {
    lines.push(card.subtitle);
  }

  if (card.imageUrl) {
    lines.push(`![](${card.imageUrl})`);
  }

  for (const child of card.children) {
    switch (child.type) {
      case 'text':
        lines.push(child.content);
        break;
      case 'image':
        lines.push(`![${child.alt ?? ''}](${child.url})`);
        break;
      case 'divider':
        lines.push('---');
        break;
      case 'actions':
        for (const button of child.children) {
          lines.push(`${button.label}: ${button.url}`);
        }
        break;
      default:
        break;
    }
  }

  return lines.join('\n\n');
}

function isTextElement(child: ChatCardChild): child is ChatCardTextElement {
  return child.type === 'text';
}

function isActionsElement(child: ChatCardChild): child is ChatCardActionsElement {
  return child.type === 'actions';
}
