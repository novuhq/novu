import { BadGatewayException, BadRequestException, HttpException } from '@nestjs/common';
import { type PinoLogger, shortId } from '@novu/application-generic';
import { HumanInteractionDelivery, HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import {
  HUMAN_INTERACTION_DEFAULT_TTL_SECONDS,
  HUMAN_INTERACTION_MAX_CHOOSE_OPTIONS,
  HUMAN_INTERACTION_MAX_TTL_SECONDS,
  HumanInteractionKindEnum,
  HumanInteractionStatusEnum,
} from '@novu/shared';

const DEFAULT_PENDING_CAP = 25;

export interface PendingHumanInteractionInput {
  kind: HumanInteractionKindEnum;
  prompt: string;
  options?: string[];
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

export function assertHumanChooseOptions(kind: HumanInteractionKindEnum, options?: string[]): void {
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

export function buildPendingHumanInteraction(input: PendingHumanInteractionInput) {
  const ttlSeconds = resolveHumanTtlSeconds(input.ttlSeconds);

  return {
    identifier: `hi_${shortId(12)}`,
    kind: input.kind,
    status: HumanInteractionStatusEnum.PENDING,
    prompt: input.prompt,
    ...(input.requestId ? { requestId: input.requestId } : {}),
    ...(input.kind === HumanInteractionKindEnum.CHOOSE && input.options
      ? { options: input.options.map((label, index) => ({ id: `opt_${index + 1}`, label })) }
      : {}),
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
