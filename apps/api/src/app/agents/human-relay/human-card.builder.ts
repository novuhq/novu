import type { HumanInteractionEntity } from '@novu/dal';
import { HumanInteractionKindEnum, HumanInteractionStatusEnum } from '@novu/shared';
import type { ActionsElement, ButtonElement, CardElement } from 'chat';
import {
  buildHumanApproveActionId,
  buildHumanDenyActionId,
  buildHumanDisambiguationActionId,
  buildHumanOptionActionId,
} from './human-action-id';
import type { ReplyContentDto } from '../shared/dtos/agent-reply-payload.dto';

const DISAMBIGUATION_LABEL_MAX = 60;

function button(id: string, label: string, style: 'default' | 'primary'): ButtonElement {
  return { type: 'button', id, label, style };
}

function attribution(interaction: Pick<HumanInteractionEntity, 'fromLabel'>): string | undefined {
  return interaction.fromLabel ? `Requested by ${interaction.fromLabel}` : undefined;
}

/**
 * The message delivered when an interaction is created. Buttons carry
 * `human:*` action ids; `OutboundGateway` tokenizes them on the way out.
 */
export function buildPendingContent(interaction: HumanInteractionEntity): ReplyContentDto {
  const subtitle = attribution(interaction);

  switch (interaction.kind) {
    case HumanInteractionKindEnum.APPROVE: {
      const card: CardElement = {
        type: 'card',
        title: interaction.prompt,
        ...(subtitle ? { subtitle } : {}),
        children: [
          {
            type: 'actions',
            children: [
              button(buildHumanDenyActionId(interaction.identifier), 'Deny', 'default'),
              button(buildHumanApproveActionId(interaction.identifier), 'Approve', 'primary'),
            ],
          } satisfies ActionsElement,
        ],
      };

      return { card } as ReplyContentDto;
    }

    case HumanInteractionKindEnum.CHOOSE: {
      const card: CardElement = {
        type: 'card',
        title: interaction.prompt,
        ...(subtitle ? { subtitle } : {}),
        children: [
          {
            type: 'actions',
            children: (interaction.options ?? []).map((option) =>
              button(buildHumanOptionActionId(interaction.identifier, option.id), option.label, 'default')
            ),
          } satisfies ActionsElement,
        ],
      };

      return { card } as ReplyContentDto;
    }

    case HumanInteractionKindEnum.ASK: {
      const lines = [`❓ ${interaction.prompt}`];
      if (subtitle) lines.push(`_${subtitle}_`);
      lines.push('_Reply to this message to answer._');

      return { markdown: lines.join('\n\n') } as ReplyContentDto;
    }

    default: {
      const lines = [interaction.prompt];
      if (subtitle) lines.push(`_${subtitle}_`);

      return { markdown: lines.join('\n\n') } as ReplyContentDto;
    }
  }
}

/**
 * The in-place edit applied once an interaction reaches a terminal state —
 * buttons disappear so the human can never click a dead control.
 */
export function buildResolvedContent(interaction: HumanInteractionEntity): ReplyContentDto {
  const statusLine = resolveStatusLine(interaction);
  const lines = [interaction.prompt];
  const subtitle = attribution(interaction);
  if (subtitle) lines.push(`_${subtitle}_`);
  lines.push(statusLine);

  return { markdown: lines.join('\n\n') } as ReplyContentDto;
}

function resolveStatusLine(interaction: HumanInteractionEntity): string {
  const by = interaction.response?.respondedBy ? ` by ${interaction.response.respondedBy}` : '';

  switch (interaction.status) {
    case HumanInteractionStatusEnum.APPROVED:
      return `✅ *Approved*${by}`;
    case HumanInteractionStatusEnum.DENIED:
      return `⛔ *Denied*${by}`;
    case HumanInteractionStatusEnum.ANSWERED: {
      if (interaction.response?.optionId) {
        const label =
          interaction.options?.find((option) => option.id === interaction.response?.optionId)?.label ??
          interaction.response.optionId;

        return `✅ *${label}*${by}`;
      }

      return `✅ *Answered*${by}`;
    }
    case HumanInteractionStatusEnum.CANCELED:
      return '🚫 _Canceled by the requesting agent._';
    default:
      return '⌛ _Expired — no longer actionable._';
  }
}

/**
 * "Which question does this answer?" card shown when a bare reply arrives
 * while several asks are pending.
 */
export function buildDisambiguationCard(pendingAsks: HumanInteractionEntity[]): CardElement {
  return {
    type: 'card',
    title: 'Which question does this answer?',
    subtitle: 'You have several pending questions — pick the one your reply belongs to.',
    children: [
      {
        type: 'actions',
        children: pendingAsks.map((ask) =>
          button(buildHumanDisambiguationActionId(ask.identifier), truncate(ask.prompt, DISAMBIGUATION_LABEL_MAX), 'default')
        ),
      } satisfies ActionsElement,
    ],
  };
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}
