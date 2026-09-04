import { BadGatewayException, BadRequestException, HttpException } from '@nestjs/common';
import { type PinoLogger, shortId } from '@novu/application-generic';
import { HumanInteractionDelivery, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import {
  type CardChrome,
  HUMAN_INTERACTION_DEFAULT_TTL_SECONDS,
  HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS,
  HUMAN_INTERACTION_MAX_EXTRA_ACTIONS,
  HUMAN_INTERACTION_MAX_TTL_SECONDS,
  HUMAN_INTERACTION_RESERVED_OPTION_IDS,
  type HumanInteractionApproveCard,
  type HumanInteractionChooseCard,
  type HumanInteractionContent,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
  type HumanOptionInput,
  isHumanCardElement,
  isHumanCardElementContent,
  isHumanChromeContent,
  mintHumanOptions,
} from '@novu/shared';
import { parseHumanActionId } from '../../agents/human-relay/human-action-id';

const DEFAULT_PENDING_CAP = 25;

export interface PendingHumanInteractionInput {
  kind: HumanInteractionKindEnum;
  content: HumanInteractionContent;
  from?: string;
  subscriberIds: string[];
  agentId: string;
  environmentId: string;
  organizationId: string;
  ttlSeconds?: number;
  requestId?: string;
  conversationId?: string;
}

export interface HumanDeliveryRefs {
  platformMessageId: string;
  platformThreadId: string;
  _conversationId?: string;
}

export interface HumanDeliveryTarget {
  subscriberId: string;
  integrationIdentifier: string;
  platform: string;
  deliver: () => Promise<HumanDeliveryRefs>;
}

export function resolveHumanPendingCap(): number {
  const parsed = Number(process.env.HUMAN_PENDING_CAP);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PENDING_CAP;
}

export function resolveHumanTtlSeconds(ttlSeconds?: number): number {
  return Math.min(ttlSeconds ?? HUMAN_INTERACTION_DEFAULT_TTL_SECONDS, HUMAN_INTERACTION_MAX_TTL_SECONDS);
}

export function assertHumanChooseOptions(kind: HumanInteractionKindEnum, options?: HumanOptionInput[]): void {
  if (kind !== HumanInteractionKindEnum.CHOOSE) {
    return;
  }

  if (!options || options.length < 2) {
    throw new BadRequestException('`choose` interactions require at least two options.');
  }

  if (options.length > HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS) {
    throw new BadRequestException(
      `\`choose\` interactions support at most ${HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS} options.`
    );
  }
}

export function assertHumanApproveExtraActions(
  kind: HumanInteractionKindEnum,
  extraActions?: HumanOptionInput[]
): void {
  if (kind !== HumanInteractionKindEnum.APPROVE || !extraActions?.length) {
    return;
  }

  if (extraActions.length > HUMAN_INTERACTION_MAX_EXTRA_ACTIONS) {
    throw new BadRequestException(
      `\`approve\` extraActions support at most ${HUMAN_INTERACTION_MAX_EXTRA_ACTIONS} buttons.`
    );
  }

  const minted = mintHumanOptions(extraActions);
  for (const action of minted) {
    if (!action.id.trim() || !action.label.trim()) {
      throw new BadRequestException('`extraActions` ids and labels must be non-empty.');
    }

    if ((HUMAN_INTERACTION_RESERVED_OPTION_IDS as readonly string[]).includes(action.id)) {
      throw new BadRequestException('`extraActions` ids cannot be `approve` or `deny`.');
    }
  }
}

function collectCardActionButtons(node: unknown, into: Array<{ id: string; label: string }> = []) {
  if (Array.isArray(node)) {
    for (const item of node) {
      collectCardActionButtons(item, into);
    }

    return into;
  }

  if (!node || typeof node !== 'object') {
    return into;
  }

  const record = node as Record<string, unknown>;
  const type = record.type;
  const id = record.id;
  if ((type === 'button' || type === 'link-button') && typeof id === 'string' && id.trim()) {
    into.push({ id, label: typeof record.label === 'string' ? record.label : '' });
  }

  if ('children' in record) {
    collectCardActionButtons(record.children, into);
  }

  return into;
}

function optionFromCardButton(button: { id: string; label: string }): HumanOptionInput | null {
  const parsed = parseHumanActionId(button.id);
  if (parsed?.type === 'approve' || parsed?.type === 'deny' || parsed?.type === 'disambiguation-pick') {
    return null;
  }

  if (parsed?.type === 'option') {
    return { id: parsed.optionId, label: button.label };
  }

  if ((HUMAN_INTERACTION_RESERVED_OPTION_IDS as readonly string[]).includes(button.id)) {
    return null;
  }

  return { id: button.id, label: button.label };
}

type HumanInteractionChromeInput = {
  title?: string;
  icon?: string;
  subtitle?: string;
  body?: string;
  approveLabel?: string;
  denyLabel?: string;
  extraActions?: HumanOptionInput[];
  options?: HumanOptionInput[];
};

type HumanPostedCardInput = {
  type: 'card';
  children?: unknown[];
};

function actionsFromCardElement(card: { children?: unknown[] }): {
  options: HumanOptionInput[];
  extraActions: HumanOptionInput[];
} {
  const options: HumanOptionInput[] = [];
  const extraActions: HumanOptionInput[] = [];

  for (const button of collectCardActionButtons(card.children)) {
    const option = optionFromCardButton(button);
    if (!option) {
      continue;
    }

    options.push(option);
    extraActions.push(option);
  }

  return { options, extraActions };
}

function readHumanCardActions(card: HumanInteractionChromeInput | HumanPostedCardInput): {
  options?: HumanOptionInput[];
  extraActions?: HumanOptionInput[];
} {
  const fieldOptions = 'options' in card && Array.isArray(card.options) ? card.options : undefined;
  const fieldExtraActions = 'extraActions' in card && Array.isArray(card.extraActions) ? card.extraActions : undefined;
  if (!isHumanCardElement(card)) {
    return { options: fieldOptions, extraActions: fieldExtraActions };
  }

  const fromButtons = actionsFromCardElement(card);

  return {
    options: fieldOptions ?? fromButtons.options,
    extraActions: fieldExtraActions ?? fromButtons.extraActions,
  };
}

/** Choose options / approve extras on chrome fields or posted-card action buttons. */
export function assertHumanCardActions(
  kind: HumanInteractionKindEnum,
  card: HumanInteractionChromeInput | HumanPostedCardInput
): void {
  const { options, extraActions } = readHumanCardActions(card);
  assertHumanChooseOptions(kind, options);
  assertHumanApproveExtraActions(kind, extraActions);
}

function humanOptionId(option: HumanOptionInput): string {
  return typeof option === 'string' ? option : option.id;
}

/** Choose options / approve extras already persisted on `content`. */
export function readHumanContentActions(content: HumanInteractionContent | undefined): {
  options: HumanOptionInput[];
  extraActions: HumanOptionInput[];
} {
  if (isHumanChromeContent(content)) {
    const chrome = content.cardChrome;

    return {
      options: 'options' in chrome && chrome.options ? chrome.options : [],
      extraActions: 'extraActions' in chrome && chrome.extraActions ? chrome.extraActions : [],
    };
  }

  if (isHumanCardElementContent(content)) {
    return actionsFromCardElement(content.card);
  }

  return { options: [], extraActions: [] };
}

export function isKnownHumanContentOption(
  kind: HumanInteractionKindEnum,
  content: HumanInteractionContent | undefined,
  optionId: string
): boolean {
  const actions = readHumanContentActions(content);
  const listed = kind === HumanInteractionKindEnum.APPROVE ? actions.extraActions : actions.options;

  return listed.some((option) => humanOptionId(option) === optionId);
}

function buildHumanInteractionCard(kind: HumanInteractionKindEnum, card: HumanInteractionChromeInput): CardChrome {
  const title = card.title?.trim() ?? '';
  const chrome = {
    title,
    ...(card.icon ? { icon: card.icon } : {}),
    ...(card.subtitle ? { subtitle: card.subtitle } : {}),
    ...(card.body ? { body: card.body } : {}),
  };

  if (kind === HumanInteractionKindEnum.CHOOSE) {
    const chooseCard: HumanInteractionChooseCard = {
      ...chrome,
      options: mintHumanOptions(card.options ?? []),
    };

    return chooseCard;
  }

  if (kind === HumanInteractionKindEnum.APPROVE) {
    const extraActions = card.extraActions?.length ? mintHumanOptions(card.extraActions) : undefined;
    const approveCard: HumanInteractionApproveCard = {
      ...chrome,
      ...(card.approveLabel ? { approveLabel: card.approveLabel } : {}),
      ...(card.denyLabel ? { denyLabel: card.denyLabel } : {}),
      ...(extraActions ? { extraActions } : {}),
    };

    return approveCard;
  }

  return chrome;
}

export function toStoredContent(
  kind: HumanInteractionKindEnum,
  card: HumanInteractionChromeInput | { type: 'card'; title?: string; children?: unknown[] }
): HumanInteractionContent {
  if (isHumanCardElement(card)) {
    return { card };
  }

  return { cardChrome: buildHumanInteractionCard(kind, card) };
}

export function buildPendingHumanInteraction(input: PendingHumanInteractionInput) {
  const ttlSeconds = resolveHumanTtlSeconds(input.ttlSeconds);

  return {
    identifier: `hi_${shortId(12)}`,
    kind: input.kind,
    status: HumanInteractionStatusEnum.PENDING,
    content: input.content,
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.from ? { fromLabel: input.from } : {}),
    subscriberIds: input.subscriberIds,
    _agentId: input.agentId,
    ...(input.conversationId ? { _conversationId: input.conversationId } : {}),
    expiresAt: new Date(Date.now() + ttlSeconds * 1000).toISOString(),
    _environmentId: input.environmentId,
    _organizationId: input.organizationId,
  };
}

export async function assertHumanPendingCap(
  repository: HumanInteractionRepository,
  params: {
    environmentId: string;
    subscriberIds: string[];
    kind: HumanInteractionKindEnum;
    errorMessage: (pendingCount: number, cap: number, subscriberId: string) => string;
  }
): Promise<void> {
  if (params.kind === HumanInteractionKindEnum.TELL) {
    return;
  }

  const cap = resolveHumanPendingCap();
  const counts = await Promise.all(
    params.subscriberIds.map(async (subscriberId) => ({
      subscriberId,
      pendingCount: await repository.countPendingForSubscriber(params.environmentId, subscriberId),
    }))
  );

  for (const { subscriberId, pendingCount } of counts) {
    if (pendingCount >= cap) {
      throw new HttpException(params.errorMessage(pendingCount, cap, subscriberId), 429);
    }
  }
}

/**
 * Deliver to every target, stamp `deliveries[]` (and denormalized top-level
 * ids from the first success), and roll the row back only when nobody received
 * the card. Partial fan-out failures stay on the row; the caller surfaces them.
 * Recipients whose DM failed are dropped from the settlement allow-list so they
 * cannot settle, appear in `human list`, or consume pending quota.
 *
 * In-thread `ctx.*` posts one card and uses `to` only as an allow-list — that
 * path has no failed recipients, so the listed ids are left intact.
 *
 * Sends stay serial to avoid bursting a single chat provider.
 */
export async function deliverToTargets(
  repository: HumanInteractionRepository,
  logger: PinoLogger,
  interaction: HumanInteractionEntity,
  targets: HumanDeliveryTarget[],
  options: {
    logMessage: string;
    logContext?: Record<string, unknown>;
  }
): Promise<{ interaction: HumanInteractionEntity; failedSubscriberIds: string[] }> {
  const deliveries: HumanInteractionDelivery[] = [];
  const failedSubscriberIds: string[] = [];
  let lastError: unknown;
  let conversationId: string | undefined;

  for (const target of targets) {
    try {
      const refs = await target.deliver();
      deliveries.push({
        subscriberId: target.subscriberId,
        integrationIdentifier: target.integrationIdentifier,
        platform: target.platform,
        platformMessageId: refs.platformMessageId,
        platformThreadId: refs.platformThreadId,
      });
      if (!conversationId && refs._conversationId) {
        conversationId = refs._conversationId;
      }
    } catch (err) {
      lastError = err;
      failedSubscriberIds.push(target.subscriberId);
      logger.warn(
        {
          err,
          interactionIdentifier: interaction.identifier,
          subscriberId: target.subscriberId,
          platform: target.platform,
          ...options.logContext,
        },
        options.logMessage
      );
    }
  }

  if (deliveries.length === 0) {
    await repository
      .delete({ _id: interaction._id, _environmentId: interaction._environmentId })
      .catch(() => undefined);

    throw new BadGatewayException(
      `Failed to deliver to ${failedSubscriberIds.join(', ') || 'any recipient'}: ${
        lastError instanceof Error ? lastError.message : 'no recipient received the interaction'
      }`
    );
  }

  const recipientPatch =
    failedSubscriberIds.length > 0
      ? {
          subscriberIds: deliveries.map((delivery) => delivery.subscriberId),
        }
      : {};

  await repository.stampDelivery(interaction._environmentId, interaction._id, {
    deliveries,
    ...(conversationId ? { _conversationId: conversationId } : {}),
    ...recipientPatch,
  });

  const delivered: HumanInteractionEntity = {
    ...interaction,
    deliveries,
    ...(conversationId ? { _conversationId: conversationId } : {}),
    ...recipientPatch,
  };

  if (interaction.kind === HumanInteractionKindEnum.TELL) {
    const settled = await repository.markDeliveredIfPending(interaction._environmentId, interaction._id);

    return {
      interaction: settled
        ? { ...settled, deliveries }
        : { ...delivered, status: HumanInteractionStatusEnum.DELIVERED },
      failedSubscriberIds,
    };
  }

  return { interaction: delivered, failedSubscriberIds };
}
