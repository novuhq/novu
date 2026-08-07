import {
  CardElement,
  CardElementActionChild,
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

/**
 * Escape delimiters that would truncate or nest incorrectly inside `[label](url)`.
 * Backslash itself is escaped first so a trailing `\` cannot neutralize the next escape.
 */
function escapeMarkdownLinkLabel(label: string): string {
  return label.replace(/\\/g, '\\\\').replace(/]/g, '\\]');
}

function escapeMarkdownLinkUrl(url: string): string {
  return url.replace(/\\/g, '\\\\').replace(/\)/g, '\\)');
}

function toMarkdownLink(label: string, url: string): string {
  return `[${escapeMarkdownLinkLabel(label)}](${escapeMarkdownLinkUrl(url)})`;
}

function toMarkdownImage(alt: string, url: string): string {
  return `![${escapeMarkdownLinkLabel(alt)}](${escapeMarkdownLinkUrl(url)})`;
}

function actionChildToMarkdown(action: CardElementActionChild): string {
  switch (action.type) {
    case 'link-button':
      return action.url ? toMarkdownLink(action.label, action.url) : action.label;
    case 'button':
    case 'select':
    case 'radio_select':
      return action.label;
    default: {
      const exhaustiveCheck: never = action;

      return exhaustiveCheck;
    }
  }
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
      return toMarkdownImage(child.alt ?? '', child.url);
    case 'divider':
      return '---';
    case 'link':
      return child.url ? toMarkdownLink(child.label, child.url) : child.label;
    case 'actions':
      return child.children.map(actionChildToMarkdown).filter(Boolean).join(' · ');
    case 'section':
      return child.children.map(childToMarkdown).filter(Boolean).join('\n\n');
    case 'fields':
      return child.children.map((field) => `**${field.label}:** ${field.value}`).join('\n');
    case 'table':
      return [child.headers.join(' | '), ...child.rows.map((row) => row.join(' | '))].join('\n');
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
 * Interactive button/select/radio_select children are preserved as-is.
 */
export function omitIncompleteLinkButtons(card: CardElement): CardElement {
  return {
    ...card,
    children: card.children.flatMap((child) => omitIncompleteLinkButtonsFromChild(child) ?? []),
  };
}

function omitIncompleteLinkButtonsFromChild(child: CardElementChild): CardElementChild | null {
  if (child.type === 'section') {
    return {
      ...child,
      children: child.children.flatMap((nested) => omitIncompleteLinkButtonsFromChild(nested) ?? []),
    };
  }

  if (child.type !== 'actions') {
    return child;
  }

  const kept = child.children.filter((action) => {
    if (action.type === 'link-button') {
      return Boolean(action.url?.trim());
    }

    return true;
  });

  if (kept.length === 0) {
    return null;
  }

  return { ...child, children: kept } satisfies CardElementActionsElement;
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
 * Walks nested `section` / `fields` / `table` content so code-first cards get full flavor conversion.
 */
export function mapCardText(card: CardElement, render: InlineRenderer): CardElement {
  return {
    ...card,
    ...(card.title !== undefined ? { title: convertText(card.title, render) } : {}),
    ...(card.subtitle !== undefined ? { subtitle: convertText(card.subtitle, render) } : {}),
    children: card.children.map((child) => mapChildText(child, render)),
  };
}

function mapChildText(child: CardElementChild, render: InlineRenderer): CardElementChild {
  switch (child.type) {
    case 'text':
      return { ...child, content: convertText(child.content, render) };
    case 'section':
      return { ...child, children: child.children.map((nested) => mapChildText(nested, render)) };
    case 'fields':
      return {
        ...child,
        children: child.children.map((field) => ({
          ...field,
          label: convertText(field.label, render),
          value: convertText(field.value, render),
        })),
      };
    case 'table':
      return {
        ...child,
        headers: child.headers.map((header) => convertText(header, render)),
        rows: child.rows.map((row) => row.map((cell) => convertText(cell, render))),
      };
    case 'image':
    case 'divider':
    case 'link':
    case 'actions':
      return child;
    default: {
      const exhaustiveCheck: never = child;

      return exhaustiveCheck;
    }
  }
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

/** Flatten nested `section` children so platform block/text limits count the expanded tree. */
function walkCardChildren(children: CardElementChild[]): CardElementChild[] {
  return children.flatMap((child) => (child.type === 'section' ? walkCardChildren(child.children) : [child]));
}

/** Rule: too many blocks for what the platform renders (Slack Block Kit 50, Teams), including nested sections. */
export function maxBlocks({ level, limit }: PlatformRule): CardValidator {
  return (card) => {
    const blockCount = walkCardChildren(card.children).length;

    return blockCount > limit
      ? [
          {
            level,
            code: 'BLOCK_LIMIT_EXCEEDED',
            message: `Exceeds the ${limit}-block limit (${blockCount}).`,
          },
        ]
      : [];
  };
}

/**
 * Rule: a *single* text block longer than the platform's per-block cap — for block-structured
 * providers where each text child maps to its own length-limited field (Slack `section` 3000, Teams
 * `TextBlock`). Flattening providers cap the whole message instead; use {@link maxMessageLength}.
 */
export function maxTextLengthPerBlock({ level, limit }: PlatformRule): CardValidator {
  return (card) =>
    walkCardChildren(card.children).flatMap((child) =>
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
    walkCardChildren(card.children).flatMap((child) =>
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
