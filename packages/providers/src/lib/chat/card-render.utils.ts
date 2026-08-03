import {
  CardElement,
  CardElementActionsElement,
  CardElementChild,
  ChatRenderValidationLevelEnum,
  IChatRenderValidation,
} from '@novu/stateless';

/**
 * Standard-markdown fallback for chat providers without a native card serializer
 * (Discord, Rocket.Chat, Mattermost, ...). Rich providers (Slack, Teams) use their
 * own platform-flavored serializers (see each provider folder's `card-render.utils`).
 */
export function cardToFallbackMarkdown(card: CardElement): string {
  const sections: string[] = [];

  if (card.title) {
    sections.push(`**${card.title}**`);
  }

  if (card.subtitle) {
    sections.push(card.subtitle);
  }

  if (card.imageUrl) {
    sections.push(`![](${card.imageUrl})`);
  }

  for (const child of card.children) {
    const rendered = childToMarkdown(child);

    if (rendered) {
      sections.push(rendered);
    }
  }

  return sections.join('\n\n');
}

function childToMarkdown(child: CardElementChild): string {
  switch (child.type) {
    case 'text':
      if (child.style === 'bold') {
        return `**${child.content}**`;
      }

      if (child.style === 'muted') {
        return `_${child.content}_`;
      }

      return child.content;
    case 'image':
      return `![${child.alt ?? ''}](${child.url})`;
    case 'divider':
      return '---';
    case 'actions':
      return child.children.map((button) => `[${button.label}](${button.url})`).join(' · ');
    default: {
      const exhaustiveCheck: never = child;

      return exhaustiveCheck;
    }
  }
}

/**
 * `CardElement` text carries a provider-agnostic markdown subset (the flavor emitted by the
 * chat Maily compiler's `applyMarks`: `**bold**`, `_italic_`, `~~strike~~`, `` `code` ``,
 * `[label](url)`). Each chat platform speaks a different flavor, so we parse that subset once into
 * a tiny inline AST here and each provider re-serializes it in its own `card-render.utils`
 * (Slack mrkdwn, Teams markdown, WhatsApp, Telegram HTML). Parsing (instead of chained regexes)
 * keeps nested marks and links correct.
 */
export type InlineNode =
  | { type: 'text'; value: string }
  | { type: 'code'; value: string }
  | { type: 'link'; url: string; children: InlineNode[] }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'strike'; children: InlineNode[] };

/** Renders a parsed inline AST into a provider-specific string flavor. */
export type InlineRenderer = (nodes: InlineNode[]) => string;

const CODE_SPAN = /^`([^`]+)`/;
const LINK = /^\[([^\]]*)\]\(([^)]*)\)/;
const BOLD = /^\*\*([\s\S]+?)\*\*/;
const STRIKE = /^~~([\s\S]+?)~~/;
const ITALIC = /^_([\s\S]+?)_/;

function parseInlineMarkdown(input: string): InlineNode[] {
  const nodes: InlineNode[] = [];
  let buffer = '';
  let index = 0;

  const flush = () => {
    if (buffer) {
      nodes.push({ type: 'text', value: buffer });
      buffer = '';
    }
  };

  while (index < input.length) {
    const rest = input.slice(index);

    const code = CODE_SPAN.exec(rest);
    if (code) {
      flush();
      nodes.push({ type: 'code', value: code[1] });
      index += code[0].length;
      continue;
    }

    const link = LINK.exec(rest);
    if (link) {
      flush();
      nodes.push({ type: 'link', url: link[2], children: parseInlineMarkdown(link[1]) });
      index += link[0].length;
      continue;
    }

    const bold = BOLD.exec(rest);
    if (bold) {
      flush();
      nodes.push({ type: 'bold', children: parseInlineMarkdown(bold[1]) });
      index += bold[0].length;
      continue;
    }

    const strike = STRIKE.exec(rest);
    if (strike) {
      flush();
      nodes.push({ type: 'strike', children: parseInlineMarkdown(strike[1]) });
      index += strike[0].length;
      continue;
    }

    const italic = ITALIC.exec(rest);
    if (italic) {
      flush();
      nodes.push({ type: 'italic', children: parseInlineMarkdown(italic[1]) });
      index += italic[0].length;
      continue;
    }

    buffer += input[index];
    index += 1;
  }

  flush();

  return nodes;
}

/** Parse a markdown-subset string and re-serialize it into a provider flavor. */
export function convertText(content: string, render: InlineRenderer): string {
  return render(parseInlineMarkdown(content));
}

/**
 * Returns a copy of the card with every text field (children, title, subtitle) re-serialized into a
 * provider flavor. Used to feed the Slack/Teams native serializers content they render correctly.
 */
export function mapCardText(card: CardElement, render: InlineRenderer): CardElement {
  return {
    ...card,
    ...(card.title !== undefined ? { title: convertText(card.title, render) } : {}),
    ...(card.subtitle !== undefined ? { subtitle: convertText(card.subtitle, render) } : {}),
    children: card.children.map((child) =>
      child.type === 'text' ? { ...child, content: convertText(child.content, render) } : child
    ),
  };
}

/** Escapes the HTML entities Telegram's HTML parse mode (and other HTML sinks) require. */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

/** Like {@link escapeHtml} but also escapes the double quote for use inside an attribute value. */
export function escapeHtmlAttribute(value: string): string {
  return escapeHtml(value).replace(/"/g, '&quot;');
}

export type CardPlatformLimits = {
  platform: string;
  /** Max top-level children before the platform starts rejecting/dropping blocks. */
  maxBlocks: number;
  /** Max characters in a single text block. */
  maxTextLength: number;
  /** Max buttons in a single actions row. */
  maxButtonsPerRow: number;
};

/** Shared deterministic platform-limit check; providers supply their own {@link CardPlatformLimits}. */
export function validateCard(card: CardElement, limits: CardPlatformLimits): IChatRenderValidation[] {
  const warnings: IChatRenderValidation[] = [];

  if (card.children.length > limits.maxBlocks) {
    warnings.push({
      level: ChatRenderValidationLevelEnum.WARNING,
      code: 'BLOCK_LIMIT_EXCEEDED',
      message: `${limits.platform} renders at most ${limits.maxBlocks} blocks; the card has ${card.children.length}.`,
    });
  }

  for (const child of card.children) {
    if (child.type === 'text' && child.content.length > limits.maxTextLength) {
      warnings.push({
        level: ChatRenderValidationLevelEnum.WARNING,
        code: 'TEXT_LENGTH_EXCEEDED',
        message: `${limits.platform} truncates text blocks longer than ${limits.maxTextLength} characters.`,
      });
    }

    if (child.type === 'actions') {
      const actions = child as CardElementActionsElement;

      if (actions.children.length > limits.maxButtonsPerRow) {
        warnings.push({
          level: ChatRenderValidationLevelEnum.WARNING,
          code: 'BUTTON_LIMIT_EXCEEDED',
          message: `${limits.platform} renders at most ${limits.maxButtonsPerRow} buttons per row; the row has ${actions.children.length}.`,
        });
      }
    }
  }

  return warnings;
}
