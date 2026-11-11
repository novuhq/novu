import type { HumanInteractionEntity } from '@novu/dal';
import {
  HumanInteractionKindEnum,
  type HumanInteractionOption,
  HumanInteractionStatusEnum,
  type HumanOptionInput,
  humanInteractionCardTitle,
  humanInteractionChooseOptions,
  isHumanCardElementContent,
  mintHumanOptions,
  resolveHumanInteractionCard,
} from '@novu/shared';
import type { ActionsElement, ButtonElement, CardElement, TextElement } from 'chat';
import { readHumanContentActions } from '../../human/services/human-interaction-lifecycle';
import type { ReplyContentDto } from '../shared/dtos/agent-reply-payload.dto';
import {
  buildHumanApproveActionId,
  buildHumanDenyActionId,
  buildHumanDisambiguationActionId,
  buildHumanOptionActionId,
} from './human-action-id';

const LISTED_OPTION_LABEL_MAX = 200;

/**
 * Slack `header` / card title max. Crossing it rejects the whole payload
 * (`invalid_blocks`: "must be less than 151 characters" on `blocks/0/text`).
 */
const CARD_TITLE_MAX = 150;

/**
 * Letters, not full labels, on `choose`/disambiguation buttons. Chat platform
 * button UIs (Telegram inline keyboards especially) truncate or wrap long
 * label text badly; the full text is always listed in the message body
 * instead, and the button just needs to be tappable and short.
 */
const OPTION_LETTERS = 'ABCDEFGHIJ';

function optionLetter(index: number): string {
  return OPTION_LETTERS[index] ?? String(index + 1);
}

function button(id: string, label: string, style: 'default' | 'primary'): ButtonElement {
  return { type: 'button', id, label, style };
}

function textChild(content: string): TextElement {
  return { type: 'text', content };
}

/** A card as an Agent Inbox email shows it. `humanKind` picks the look of the message. */
export type HumanEmailCard = CardElement & { humanKind?: HumanInteractionKindEnum };

/**
 * Hands the email layout of an Agent Inbox agent a version of the card made for email: the whole option text on
 * each button, and none of the chat hints. Only that layout reads `layoutCard`, so chat apps and every other
 * agent's email get `card` as it is.
 */
function withLayoutCard(card: CardElement, layoutCard: HumanEmailCard): CardElement {
  return { ...card, layoutCard } as CardElement;
}

function buildEmailCard(
  kind: HumanInteractionKindEnum,
  resolved: { title: string; body?: string },
  subtitle: string | undefined,
  buttons: ButtonElement[] = []
): HumanEmailCard {
  return {
    type: 'card',
    humanKind: kind,
    title: resolved.title,
    ...(subtitle ? { subtitle } : {}),
    children: [
      ...(resolved.body ? [textChild(resolved.body)] : []),
      ...(buttons.length > 0 ? [{ type: 'actions', children: buttons } satisfies ActionsElement] : []),
    ],
  };
}

/**
 * The portable-card renderer joins title/subtitle/body with a single `\n`
 * (no blank line), which reads as one cramped block. A leading `\n` on the
 * first body text child turns that single join newline into a real blank
 * line — use this for whichever text child comes right after title/subtitle.
 */
function bodyText(content: string): TextElement {
  return textChild(`\n${content}`);
}

/** "**A.** <label>\n**B.** <label>\n..." — the full option text, always in the message. */
function buildOptionsListText(labels: string[]): TextElement {
  const lines = labels.map((label, index) => `**${optionLetter(index)}.** ${truncate(label, LISTED_OPTION_LABEL_MAX)}`);

  return bodyText(lines.join('\n'));
}

function attribution(interaction: Pick<HumanInteractionEntity, 'fromLabel'>): string | undefined {
  return interaction.fromLabel ? `Requested by ${interaction.fromLabel}` : undefined;
}

function splitFit(text: string, max: number): { visible: string; overflow: string } {
  if (text.length <= max) {
    return { visible: text, overflow: '' };
  }

  return { visible: `${text.slice(0, max - 1)}…`, overflow: text.slice(max - 1) };
}

/**
 * Slack header / subtitle are each capped at 150 chars. First prompt line is
 * the title; leftover fills subtitle when attribution is absent; remaining
 * lines and any leftover after subtitle go in the body.
 */
function layoutCard(
  prompt: string,
  attributionSubtitle: string | undefined,
  children: CardElement['children'],
  titlePrefix = ''
): CardElement {
  const [firstLine = '', ...restLines] = prompt.split('\n');
  const titleFit = splitFit(`${titlePrefix}${firstLine}`, CARD_TITLE_MAX);
  const bodyParts: string[] = [];

  let subtitle: string | undefined;

  if (attributionSubtitle) {
    const subtitleFit = splitFit(attributionSubtitle, CARD_TITLE_MAX);
    subtitle = subtitleFit.visible;
    if (titleFit.overflow) {
      bodyParts.push(titleFit.overflow);
    }
    if (subtitleFit.overflow) {
      bodyParts.push(subtitleFit.overflow);
    }
  } else if (titleFit.overflow) {
    const subtitleFit = splitFit(titleFit.overflow, CARD_TITLE_MAX);
    subtitle = subtitleFit.visible;
    if (subtitleFit.overflow) {
      bodyParts.push(subtitleFit.overflow);
    }
  }

  const rest = restLines.join('\n');
  if (rest) {
    bodyParts.push(rest);
  }

  const bodyChildren = bodyParts.length > 0 ? [bodyText(bodyParts.join('\n')), ...children] : children;

  return {
    type: 'card',
    title: titleFit.visible,
    ...(subtitle ? { subtitle } : {}),
    children: bodyChildren,
  };
}

/**
 * The message delivered when an interaction is created. Buttons carry
 * `human:*` action ids; `OutboundGateway` tokenizes them on the way out.
 */
export function buildPendingContent(
  interaction: HumanInteractionEntity,
  options?: { actionIdentifier?: string }
): ReplyContentDto {
  const resolved = resolveHumanInteractionCard(interaction);
  const attributionSubtitle = resolved.subtitle ?? attribution(interaction);
  const title = resolved.title;
  const actionKey = options?.actionIdentifier ?? interaction.identifier;

  switch (interaction.kind) {
    case HumanInteractionKindEnum.APPROVE: {
      const extraActions = 'extraActions' in resolved ? (resolved.extraActions ?? []) : [];
      const deny = button(
        buildHumanDenyActionId(actionKey),
        ('denyLabel' in resolved && resolved.denyLabel) || 'Deny',
        'default'
      );
      const approve = button(
        buildHumanApproveActionId(actionKey),
        ('approveLabel' in resolved && resolved.approveLabel) || 'Approve',
        'primary'
      );
      const extras = extraActions.map((action) =>
        button(buildHumanOptionActionId(actionKey, action.id), action.label, 'default')
      );
      const card = layoutCard(title, attributionSubtitle, [
        ...(resolved.body ? [bodyText(resolved.body)] : []),
        { type: 'actions', children: [deny, approve, ...extras] } satisfies ActionsElement,
      ]);

      return {
        card: withLayoutCard(
          card,
          buildEmailCard(interaction.kind, resolved, attributionSubtitle, [approve, deny, ...extras])
        ),
      } as ReplyContentDto;
    }

    case HumanInteractionKindEnum.CHOOSE: {
      const options: HumanInteractionOption[] = humanInteractionChooseOptions(interaction);
      const card = layoutCard(title, attributionSubtitle, [
        ...(resolved.body ? [bodyText(resolved.body)] : []),
        buildOptionsListText(options.map((option) => option.label)),
        {
          type: 'actions',
          children: options.map((option, index) =>
            button(buildHumanOptionActionId(actionKey, option.id), optionLetter(index), 'default')
          ),
        } satisfies ActionsElement,
      ]);
      const fullLabels = options.map((option) =>
        button(buildHumanOptionActionId(actionKey, option.id), option.label, 'default')
      );

      return {
        card: withLayoutCard(card, buildEmailCard(interaction.kind, resolved, attributionSubtitle, fullLabels)),
      } as ReplyContentDto;
    }

    case HumanInteractionKindEnum.ASK: {
      const card = layoutCard(
        title,
        attributionSubtitle,
        [...(resolved.body ? [bodyText(resolved.body)] : []), bodyText('_Reply to this message to answer._')],
        '❓ '
      );

      return {
        card: withLayoutCard(card, buildEmailCard(interaction.kind, resolved, attributionSubtitle)),
      } as ReplyContentDto;
    }

    default:
      return buildTellContent(interaction, attributionSubtitle);
  }
}

/**
 * TELL — plain text, no actions and no reply expected. It becomes a card only when the caller
 * gave it card content (a subtitle, a body or an icon).
 */
function buildTellContent(
  interaction: HumanInteractionEntity,
  attributionSubtitle: string | undefined
): ReplyContentDto {
  const resolved = resolveHumanInteractionCard(interaction);
  const hasCardContent = Boolean(resolved.subtitle || resolved.body || ('icon' in resolved && resolved.icon));

  if (!hasCardContent) {
    return {
      markdown: interaction.fromLabel ? `${resolved.title}\n\n_— ${interaction.fromLabel}_` : resolved.title,
    } as ReplyContentDto;
  }

  const card = layoutCard(resolved.title, attributionSubtitle, resolved.body ? [bodyText(resolved.body)] : []);

  return { card } as ReplyContentDto;
}

/**
 * The pending message delivered for an interaction, honoring both stored
 * content variants: a posted `{ card }` element is sent as-is (author-authored
 * buttons and action ids intact), and chrome is rendered to a kind-specific
 * card with framework-minted `human:*` controls.
 *
 * The single source of truth for both in-thread (conversation) and one-off DM
 * (public / CLI) delivery so the two paths never diverge.
 */
export function buildPendingDeliveryContent(
  interaction: HumanInteractionEntity,
  options?: { actionIdentifier?: string }
): ReplyContentDto {
  if (isHumanCardElementContent(interaction.content)) {
    const { card } = interaction.content;

    return { card: withLayoutCard(card, { ...card, humanKind: interaction.kind }) } as ReplyContentDto;
  }

  return buildPendingContent(interaction, options);
}

/**
 * The in-place edit applied once an interaction reaches a terminal state —
 * action controls disappear so the human can never click a dead button.
 *
 * A posted `card` element is preserved as-is (its rich body stays intact) with
 * only its `actions` blocks stripped and the status line appended. Chrome
 * content is re-rendered with its title/subtitle/body kept — only the action
 * controls drop away — and the status line appended beneath the body.
 */
export function buildResolvedContent(interaction: HumanInteractionEntity): ReplyContentDto {
  const statusLine = resolveStatusLine(interaction);

  if (isHumanCardElementContent(interaction.content)) {
    const original = interaction.content.card;
    const card = {
      ...original,
      children: [...original.children.filter((child) => child.type !== 'actions'), bodyText(statusLine)],
    };

    return { card } as ReplyContentDto;
  }

  const resolved = resolveHumanInteractionCard(interaction);
  const card = layoutCard(resolved.title, resolved.subtitle ?? attribution(interaction), [
    ...(resolved.body ? [bodyText(resolved.body)] : []),
    bodyText(statusLine),
  ]);

  return { card } as ReplyContentDto;
}

/**
 * What a person who answered on a channel that can't edit a sent card (WhatsApp) is told instead: the outcome of
 * their tap, in a line of its own. `null` for what they didn't answer themselves (expired, canceled) and for an ask,
 * whose text answer is acknowledged where it is taken.
 */
export function buildOutcomeReply(interaction: HumanInteractionEntity): string | null {
  if (interaction.kind !== HumanInteractionKindEnum.APPROVE && interaction.kind !== HumanInteractionKindEnum.CHOOSE) {
    return null;
  }

  const optionId = interaction.response?.optionId;
  // Labels from either stored shape: chrome options and extras, or a posted card's buttons.
  const { options, extraActions } = readHumanContentActions(interaction.content);
  // Plain-string choices get their ids as they were minted when the card was built (`opt_1`, …).
  const labelOf = (choices: HumanOptionInput[], id: string) =>
    mintHumanOptions(choices).find((choice) => choice.id === id)?.label ?? id;

  switch (interaction.status) {
    case HumanInteractionStatusEnum.APPROVED: {
      // An extra action ("Snooze") answers the approve too: it says which one was picked.
      const extra = optionId && optionId !== 'approve' ? labelOf(extraActions, optionId) : undefined;

      return extra ? `✅ ${extra} — passed along.` : '✅ Approved — passed along.';
    }
    case HumanInteractionStatusEnum.DENIED:
      return '⛔ Denied — passed along.';
    case HumanInteractionStatusEnum.ANSWERED: {
      const label = optionId ? labelOf(options, optionId) : undefined;

      return label ? `✅ Picked ${label} — passed along.` : '✅ Got it — passed along.';
    }
    default:
      return null;
  }
}

function resolveStatusLine(interaction: HumanInteractionEntity): string {
  const by = interaction.response?.respondedBy ? ` by ${interaction.response.respondedBy}` : '';
  const resolved = resolveHumanInteractionCard(interaction);

  switch (interaction.status) {
    case HumanInteractionStatusEnum.APPROVED: {
      const optionId = interaction.response?.optionId;
      if (optionId && optionId !== 'approve') {
        const extras = 'extraActions' in resolved ? (resolved.extraActions ?? []) : [];
        const label = extras.find((action) => action.id === optionId)?.label ?? optionId;

        return `✅ **${label}**${by}`;
      }

      return `✅ **Approved**${by}`;
    }
    case HumanInteractionStatusEnum.DENIED:
      return `⛔ **Denied**${by}`;
    case HumanInteractionStatusEnum.ANSWERED: {
      if (interaction.response?.optionId) {
        const options = humanInteractionChooseOptions(interaction);
        const label =
          options.find((option) => option.id === interaction.response?.optionId)?.label ??
          interaction.response.optionId;

        return `✅ **${label}**${by}`;
      }

      return `✅ **Answered**${by}`;
    }
    case HumanInteractionStatusEnum.CANCELED:
      return '🚫 _Canceled by the requesting agent._';
    default:
      return '⌛ _Expired — no longer actionable._';
  }
}

/**
 * "Which question does this answer?" card shown when a bare reply arrives
 * while several asks are pending. Same letter-button convention as `choose`.
 */
export function buildDisambiguationCard(pendingAsks: HumanInteractionEntity[], answerId: string): CardElement {
  const title = 'Which question does this answer?';
  const subtitle = 'You have several pending questions — pick the one your reply belongs to.';
  const card: CardElement = {
    type: 'card',
    title,
    subtitle,
    children: [
      buildOptionsListText(pendingAsks.map((ask) => humanInteractionCardTitle(ask))),
      {
        type: 'actions',
        children: pendingAsks.map((ask, index) =>
          button(buildHumanDisambiguationActionId(ask.identifier, answerId), optionLetter(index), 'default')
        ),
      } satisfies ActionsElement,
    ],
  };
  const fullLabels = pendingAsks.map((ask) =>
    button(buildHumanDisambiguationActionId(ask.identifier, answerId), humanInteractionCardTitle(ask), 'default')
  );

  return withLayoutCard(card, buildEmailCard(HumanInteractionKindEnum.CHOOSE, { title }, subtitle, fullLabels));
}

/**
 * The same question as {@link buildDisambiguationCard}, as text, for WhatsApp with more questions waiting than it
 * has buttons: they answer by swiping to reply on the question they mean, which matches by the quoted message.
 */
export function buildSwipeReplyPrompt(
  inThisChat: HumanInteractionEntity[],
  elsewhere: HumanInteractionEntity[] = []
): string {
  const titles = (asks: HumanInteractionEntity[]) =>
    asks.map((ask, index) => `${optionLetter(index)}. ${humanInteractionCardTitle(ask)}`);
  const lines = ['*Which question does this answer?*'];

  if (inThisChat.length > 0) {
    lines.push(
      `You have ${inThisChat.length} questions waiting here:`,
      ...titles(inThisChat),
      'Swipe right on the question you mean and reply to it there.'
    );
  }

  if (elsewhere.length > 0) {
    const where = [...new Set(elsewhere.flatMap((ask) => (ask.deliveries ?? []).map((d) => channelLabel(d.platform))))];
    lines.push(
      `${inThisChat.length > 0 ? 'Others were' : 'They were'} sent on ${where.join(' or ') || 'another app'}: answer them there.`,
      ...elsewhere.map((ask) => `• ${humanInteractionCardTitle(ask)}`)
    );
  }

  return lines.join('\n');
}

function channelLabel(platform: string): string {
  return { telegram: 'Telegram', slack: 'Slack', email: 'email', whatsapp: 'WhatsApp' }[platform] ?? platform;
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
