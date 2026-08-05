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
      return child.children
        .map((button) => (button.url ? `[${button.label}](${button.url})` : button.label))
        .join(' · ');
    default: {
      const exhaustiveCheck: never = child;

      return exhaustiveCheck;
    }
  }
}

/**
 * Drop link buttons that still have an empty URL before platform serialization.
 * The chat compiler keeps them so the dashboard preview stays WYSIWYG while authors
 * fill in Actions; Slack/Teams reject (or mis-handle) empty `url` values.
 */
export function omitIncompleteLinkButtons(card: CardElement): CardElement {
  const children: CardElementChild[] = [];

  for (const child of card.children) {
    if (child.type !== 'actions') {
      children.push(child);
      continue;
    }

    const buttons = child.children.filter((button) => Boolean(button.url?.trim()));

    if (buttons.length === 0) {
      continue;
    }

    children.push({ ...child, children: buttons } satisfies CardElementActionsElement);
  }

  return { ...card, children };
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

/**
 * A single composable card-validation rule: it inspects the card and returns any findings (empty
 * when the card is within limits). A provider declares an array of these — one per limit it cares
 * about — instead of a shared switch, so each platform validates the card in its own unique way
 * (Slack per-block, Telegram/WhatsApp whole-message, ...). Compose with {@link runCardValidators}.
 */
export type CardValidator = (card: CardElement) => IChatRenderValidation[];

/**
 * Config shared by every platform-limit rule below. Messages are kept platform-agnostic — the
 * provider label is added by the consumer (the dashboard prefixes the provider name) — so they stay
 * short and never repeat the platform. `level` is the severity a crossed limit carries: `ERROR` when
 * the platform's API rejects the whole payload once a limit is crossed (Slack Block Kit) so delivery
 * fails — the editor blocks save. `WARNING` when the platform silently degrades but still delivers
 * (Teams drops extras, Telegram/WhatsApp truncate) — non-blocking, surfaced in the preview only.
 */
type PlatformRule = {
  level: ChatRenderValidationLevelEnum;
  limit: number;
};

/** Runs a provider's validator array against a card and flattens their findings into one list. */
export function runCardValidators(card: CardElement, validators: CardValidator[]): IChatRenderValidation[] {
  return validators.flatMap((validate) => validate(card));
}

/** Rule: too many top-level blocks for what the platform renders (Slack Block Kit 50, Teams). */
export function maxBlocks({ level, limit }: PlatformRule): CardValidator {
  return (card) =>
    card.children.length > limit
      ? [
          {
            level,
            code: 'BLOCK_LIMIT_EXCEEDED',
            message: `Exceeds the ${limit}-block limit (${card.children.length}).`,
          },
        ]
      : [];
}

/**
 * Rule: a *single* text block longer than the platform's per-block cap — for block-structured
 * providers where each text child maps to its own length-limited field (Slack `section` 3000, Teams
 * `TextBlock`). Flattening providers cap the whole message instead; use {@link maxMessageLength}.
 */
export function maxTextLengthPerBlock({ level, limit }: PlatformRule): CardValidator {
  return (card) =>
    card.children.flatMap((child) =>
      child.type === 'text' && child.content.length > limit
        ? [
            {
              level,
              code: 'TEXT_LENGTH_EXCEEDED',
              message: `A text block exceeds the ${limit}-character limit (${child.content.length}).`,
            },
          ]
        : []
    );
}

/**
 * Rule: the *whole* flattened message longer than the platform's message cap — for providers that
 * collapse the entire card into one message (Telegram 4096 after entities parsing, WhatsApp 1024
 * body). `measure` renders and measures the message the way that platform counts it, so a single
 * over-limit block AND many blocks that only exceed the cap once concatenated are both caught.
 */
export function maxMessageLength({
  level,
  limit,
  measure,
}: PlatformRule & { measure: (card: CardElement) => number }): CardValidator {
  return (card) => {
    const length = measure(card);

    return length > limit
      ? [
          {
            level,
            code: 'MESSAGE_LENGTH_EXCEEDED',
            message: `Message exceeds the ${limit}-character limit (${length}).`,
          },
        ]
      : [];
  };
}

/** Rule: an actions row with more buttons than the platform renders per row (Slack 25, Teams 6). */
export function maxButtonsPerRow({ level, limit }: PlatformRule): CardValidator {
  return (card) =>
    card.children.flatMap((child) =>
      child.type === 'actions' && child.children.length > limit
        ? [
            {
              level,
              code: 'BUTTON_LIMIT_EXCEEDED',
              message: `A button row exceeds the ${limit}-button limit (${child.children.length}).`,
            },
          ]
        : []
    );
}
