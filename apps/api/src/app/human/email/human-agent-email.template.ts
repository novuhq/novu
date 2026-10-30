import type { CardNode, EmailLayoutMessage, EmailLayoutResult } from '@novu/chat-adapter-email';
import { HumanInteractionKindEnum } from '@novu/shared';
import {
  agentAtStart,
  agentInSentence,
  agentPicture,
  agentSubline,
  box,
  COLORS,
  divider,
  emailDocument,
  escapeHtml,
  greeting,
  type HumanEmailParties,
  paragraphs,
  primaryButton,
  replyHint,
  secondaryButton,
  stack,
  TABLE,
  TYPE,
} from './human-email-layout';

/** The look of a message that waits for an answer: the label on its box, and the hint for a question. */
const WAITING_KINDS: Partial<Record<HumanInteractionKindEnum, string>> = {
  [HumanInteractionKindEnum.APPROVE]: 'APPROVAL',
  [HumanInteractionKindEnum.CHOOSE]: 'CHOOSE ONE',
  [HumanInteractionKindEnum.ASK]: 'QUESTION',
};

const QUESTION_HINT = 'Reply to this email. I’ll use your words as is, typos included.';

const CARD_PADDING = '32px 40px';
const CARD_GAP = 20;
const BOX_GAP = 14;
const SUBJECT_MAX = 78;

type LayoutCard = CardNode & { humanKind?: HumanInteractionKindEnum };

/** What a card's Markdown becomes: the mail app's own margins and colours would leave it looking like another email. */
const MESSAGE_TAG_STYLES: Record<string, string> = {
  p: `margin:10px 0 0;${TYPE.body}`,
  ul: `margin:10px 0 0;padding:0 0 0 20px;${TYPE.body}`,
  ol: `margin:10px 0 0;padding:0 0 0 20px;${TYPE.body}`,
  li: `margin:0;${TYPE.body}`,
  h1: `margin:16px 0 0;${TYPE.actionTitle}`,
  h2: `margin:16px 0 0;${TYPE.actionTitle}`,
  h3: `margin:16px 0 0;${TYPE.actionTitle}`,
  blockquote: `margin:10px 0 0;padding:0 0 0 12px;border-left:2px solid ${COLORS.border};`,
  pre: `margin:10px 0 0;padding:12px 14px;border-radius:8px;background-color:${COLORS.box};overflow:auto;`,
  a: `color:${COLORS.ink};text-decoration:underline;`,
  strong: `color:${COLORS.ink};font-weight:500;`,
};

function styleMessage(html: string): string {
  const styled = html.replace(
    /<(p|ul|ol|li|h1|h2|h3|blockquote|pre|a|strong)(?![^>]*\sstyle=)(\s|>)/g,
    (_match, tag, next) => `<${tag} style="${MESSAGE_TAG_STYLES[tag]}"${next}`
  );

  // The first block sits right under what comes before it.
  return `<div style="${TYPE.body}">${styled.replace(/margin:1[06]px 0 0;/, 'margin:0;')}</div>`;
}

function senderHeader({ sender }: HumanEmailParties): string {
  return [
    `<table ${TABLE}><tr>`,
    `<td valign="middle" width="40" style="padding-right:12px;">${agentPicture(sender.pictureUrl, 40)}</td>`,
    '<td valign="middle">',
    `<p style="margin:0 0 2px;${TYPE.senderName}">${escapeHtml(agentAtStart(sender))}</p>`,
    `<p style="margin:0;${TYPE.meta}">${escapeHtml(agentSubline(sender))}</p>`,
    '</td></tr></table>',
  ].join('');
}

function footerLine({ sender }: HumanEmailParties): string {
  const operator = sender.operatorName ? ` run by ${sender.operatorName}` : '';

  return `${agentAtStart(sender)} is an AI agent${operator}. Replies go straight to ${agentInSentence(sender)}, who never says “per my last email”.`;
}

function isButton(node: CardNode): boolean {
  return node.type === 'button' || node.type === 'link-button';
}

function labelOf(node: CardNode): string {
  return node.label ?? (typeof node.props?.label === 'string' ? node.props.label : '');
}

function isPrimary(node: CardNode): boolean {
  return (node.style ?? node.props?.style) === 'primary';
}

function buttonsOf(card: CardNode): CardNode[] {
  return (card.children ?? []).flatMap((child) =>
    child.type === 'actions' ? (child.children ?? []).filter(isButton) : []
  );
}

/** Two buttons of equal width, as the design has Approve and Deny. */
function buttonPair(first: CardNode, second: CardNode): string {
  const cell = (node: CardNode, padding: string) => {
    const primary = isPrimary(node);
    const border = primary ? '' : `border:1px solid ${COLORS.border};`;
    const fill = primary ? COLORS.ink : COLORS.card;
    const color = primary ? '#FFFFFF' : COLORS.ink;

    return [
      `<td valign="top" width="50%" style="${padding}">`,
      `<table ${TABLE} width="100%"><tr><td bgcolor="${fill}" style="background-color:${fill};${border}border-radius:8px;">`,
      `<a href="${escapeHtml(node.url ?? '#')}" style="display:block;padding:11px 18px;${TYPE.label}color:${color};text-align:center;text-decoration:none;border-radius:8px;">${escapeHtml(labelOf(node))}</a>`,
      '</td></tr></table>',
      '</td>',
    ].join('');
  };

  return `<table ${TABLE} width="100%"><tr>${cell(first, 'padding-right:4px;')}${cell(second, 'padding-left:4px;')}</tr></table>`;
}

/** A row of the choice box. The whole row is the link: two links, as Outlook has no way to push the arrow right. */
function optionRow(node: CardNode): string {
  const href = escapeHtml(node.url ?? '#');

  return [
    `<table ${TABLE} width="100%"><tr><td bgcolor="${COLORS.card}" style="background-color:${COLORS.card};border:1px solid ${COLORS.border};border-radius:8px;">`,
    `<table ${TABLE} width="100%"><tr>`,
    `<td><a href="${href}" style="display:block;padding:12px 0 12px 14px;${TYPE.option}text-decoration:none;">${escapeHtml(labelOf(node))}</a></td>`,
    `<td width="40" align="right"><a href="${href}" style="display:block;padding:12px 14px 12px 0;${TYPE.option}color:${COLORS.muted};text-decoration:none;">→</a></td>`,
    '</tr></table>',
    '</td></tr></table>',
  ].join('');
}

function approvalButtons(card: CardNode): string[] {
  const [first, second, ...extras] = [...buttonsOf(card)].sort((a, b) => Number(isPrimary(b)) - Number(isPrimary(a)));

  if (!first) {
    return [];
  }

  return [
    second ? buttonPair(first, second) : primaryButton(labelOf(first), first.url ?? '#'),
    ...extras.map(optionRow),
  ];
}

function actionBox(card: LayoutCard, label: string): string {
  const kind = card.humanKind;
  const blocks = [
    `<p style="margin:0;${TYPE.tag}">${label}</p>`,
    `<p style="margin:0;${TYPE.actionTitle}">${escapeHtml(card.title ?? '')}</p>`,
    ...(card.subtitle ? [`<p style="margin:0;${TYPE.meta}">${escapeHtml(card.subtitle)}</p>`] : []),
    ...(kind === HumanInteractionKindEnum.APPROVE ? approvalButtons(card) : []),
    ...(kind === HumanInteractionKindEnum.CHOOSE ? buttonsOf(card).map(optionRow) : []),
    ...(kind === HumanInteractionKindEnum.ASK ? [replyHint(QUESTION_HINT, 8)] : []),
  ];

  return box(stack(blocks, BOX_GAP), '20px');
}

function nodeText(node: CardNode): string {
  return (node.content ?? '').trim();
}

/** The parts of a card around its buttons, in order: its text, pictures and fields. */
function cardBlocks(children: CardNode[], renderMarkdown: (markdown: string) => string): string[] {
  return children.flatMap((node) => {
    switch (node.type) {
      case 'text':
        return nodeText(node) ? [styleMessage(renderMarkdown(nodeText(node)))] : [];
      case 'divider':
        return [divider()];
      case 'image':
        return node.url ? [`<img src="${escapeHtml(node.url)}" alt="" style="display:block;max-width:100%;" />`] : [];
      case 'section':
      case 'fields':
        return cardBlocks(node.children ?? [], renderMarkdown);
      case 'field':
        return [
          `<p style="margin:0;${TYPE.body}"><span style="color:${COLORS.ink};font-weight:500;">${escapeHtml(labelOf(node))}:</span> ${escapeHtml(node.value ?? '')}</p>`,
        ];
      case 'link':
        return [
          `<p style="margin:0;${TYPE.body}"><a href="${escapeHtml(node.url ?? '#')}" style="color:${COLORS.ink};text-decoration:underline;">${escapeHtml(labelOf(node))}</a></p>`,
        ];
      default:
        return [];
    }
  });
}

/** A card that isn't waiting for an answer: it reads top to bottom, with its buttons side by side. */
function plainCardBlocks(card: LayoutCard, renderMarkdown: (markdown: string) => string): string[] {
  const buttons = buttonsOf(card).map((node) => {
    const button = isPrimary(node) ? primaryButton : secondaryButton;

    return button(labelOf(node), node.url ?? '#');
  });

  return [
    ...(card.title ? [`<p style="margin:0;${TYPE.actionTitle}">${escapeHtml(card.title)}</p>`] : []),
    ...(card.subtitle ? [`<p style="margin:0;${TYPE.meta}">${escapeHtml(card.subtitle)}</p>`] : []),
    ...cardBlocks(
      (card.children ?? []).filter((child) => child.type !== 'actions'),
      renderMarkdown
    ),
    ...(buttons.length > 0
      ? [
          `<table ${TABLE}><tr>${buttons
            .map((button, index) => `<td${index > 0 ? ' style="padding-left:8px;"' : ''}>${button}</td>`)
            .join('')}</tr></table>`,
        ]
      : []),
  ];
}

function waitingCardBlocks(
  card: LayoutCard,
  label: string,
  firstName: string | undefined,
  renderMarkdown: (markdown: string) => string
): string[] {
  const hello = `<p style="margin:0;${TYPE.body}">${escapeHtml(greeting(firstName))}</p>`;
  const intro = cardBlocks(
    (card.children ?? []).filter((child) => child.type !== 'actions'),
    renderMarkdown
  );

  // The greeting and the text around it read as one block, with the design's 10px between paragraphs.
  return [stack([hello, ...intro], 10), actionBox(card, label)];
}

function cardAsText(card: LayoutCard, firstName: string | undefined): string[] {
  const waiting = card.humanKind && WAITING_KINDS[card.humanKind];
  const texts = (card.children ?? []).filter((child) => child.type === 'text').map(nodeText);
  const buttons = buttonsOf(card).map((node) => `${labelOf(node)}: ${node.url ?? ''}`);

  return [
    ...(waiting ? [greeting(firstName), ''] : []),
    ...texts.flatMap((text) => [text, '']),
    ...(card.title ? [card.title, ''] : []),
    ...(card.subtitle ? [card.subtitle, ''] : []),
    ...(card.humanKind === HumanInteractionKindEnum.ASK ? [QUESTION_HINT, ''] : []),
    ...(buttons.length > 0 ? [...buttons, ''] : []),
  ];
}

function withoutMarkdown(line: string): string {
  return line
    .replace(/^\s*(#{1,6}\s+|>\s*|[-*+]\s+)/, '')
    .replace(/[*`]/g, '')
    .replace(/(^|\s)_+|_+(\s|$)/g, '$1$2')
    .trim();
}

/** The subject of a new thread: the first line of what the agent wrote. */
function subjectOf(card: LayoutCard | undefined, text: string): string | undefined {
  const lines = card?.title ? [card.title] : text.split('\n').map(withoutMarkdown);
  const firstLine = lines.find(Boolean)?.trim();

  if (!firstLine) {
    return undefined;
  }

  return firstLine.length > SUBJECT_MAX ? `${firstLine.slice(0, SUBJECT_MAX - 1).trimEnd()}…` : firstLine;
}

/**
 * Every email an Agent Inbox agent sends: the agent's picture and name, what it wrote, and the footer. An approval,
 * a choice and a question put their answer in a box of their own and greet the person. Everything else reads as the
 * agent wrote it.
 */
export function buildHumanAgentEmail(params: HumanEmailParties & { message: EmailLayoutMessage }): EmailLayoutResult {
  const { message, recipient } = params;
  const card = message.card as LayoutCard | undefined;
  const label = card?.humanKind && WAITING_KINDS[card.humanKind];
  const footer = footerLine(params);

  const content = (): string[] => {
    if (card) {
      return label
        ? waitingCardBlocks(card, label, recipient.firstName, message.renderMarkdown)
        : plainCardBlocks(card, message.renderMarkdown);
    }

    return [message.html ? styleMessage(message.html) : paragraphs([escapeHtml(message.text)])];
  };

  return {
    subject: subjectOf(card, message.text),
    html: emailDocument({
      card: stack([senderHeader(params), ...content()], CARD_GAP),
      footerLine: footer,
      cardPadding: CARD_PADDING,
    }),
    text: [...(card ? cardAsText(card, recipient.firstName) : [message.text, '']), footer].join('\n'),
  };
}
