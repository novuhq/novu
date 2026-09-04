import type { HumanInteractionEntity } from '@novu/dal';
import {
  HumanInteractionKindEnum,
  type HumanInteractionOption,
  HumanInteractionStatusEnum,
  humanInteractionCardTitle,
  humanInteractionChooseOptions,
  isHumanCardElementContent,
  resolveHumanInteractionCard,
} from '@novu/shared';
import type { ActionsElement, ButtonElement, CardElement, TextElement } from 'chat';
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
      const card = layoutCard(title, attributionSubtitle, [
        ...(resolved.body ? [bodyText(resolved.body)] : []),
        {
          type: 'actions',
          children: [
            button(
              buildHumanDenyActionId(actionKey),
              ('denyLabel' in resolved && resolved.denyLabel) || 'Deny',
              'default'
            ),
            button(
              buildHumanApproveActionId(actionKey),
              ('approveLabel' in resolved && resolved.approveLabel) || 'Approve',
              'primary'
            ),
            ...extraActions.map((action) =>
              button(buildHumanOptionActionId(actionKey, action.id), action.label, 'default')
            ),
          ],
        } satisfies ActionsElement,
      ]);

      return { card } as ReplyContentDto;
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

      return { card } as ReplyContentDto;
    }

    case HumanInteractionKindEnum.ASK: {
      const card = layoutCard(
        title,
        attributionSubtitle,
        [...(resolved.body ? [bodyText(resolved.body)] : []), bodyText('_Reply to this message to answer._')],
        '❓ '
      );

      return { card } as ReplyContentDto;
    }

    // TELL — a plain FYI card, no actions and no reply expected.
    default: {
      const card = layoutCard(title, attributionSubtitle, resolved.body ? [bodyText(resolved.body)] : []);

      return { card } as ReplyContentDto;
    }
  }
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
    return { card: interaction.content.card } as ReplyContentDto;
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
  return {
    type: 'card',
    title: 'Which question does this answer?',
    subtitle: 'You have several pending questions — pick the one your reply belongs to.',
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
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
