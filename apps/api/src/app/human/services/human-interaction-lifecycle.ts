import { BadGatewayException, BadRequestException, HttpException } from '@nestjs/common';
import { type PinoLogger, shortId } from '@novu/application-generic';
import { HumanInteractionEntity, HumanInteractionRepository } from '@novu/dal';
import {
  HUMAN_INTERACTION_DEFAULT_TTL_SECONDS,
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
  subscriberId: string;
  agentId: string;
  integrationIdentifier: string;
  platform: string;
  environmentId: string;
  organizationId: string;
  ttlSeconds?: number;
  requestId?: string;
  conversationId?: string;
  platformThreadId?: string;
}

export interface HumanDeliveryRefs {
  platformMessageId: string;
  platformThreadId: string;
  _conversationId?: string;
}

export function resolveHumanPendingCap(): number {
  const parsed = Number(process.env.HUMAN_PENDING_CAP);

  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_PENDING_CAP;
}

export function resolveHumanTtlSeconds(ttlSeconds?: number): number {
  return Math.min(ttlSeconds ?? HUMAN_INTERACTION_DEFAULT_TTL_SECONDS, HUMAN_INTERACTION_MAX_TTL_SECONDS);
}

export function assertHumanChooseOptions(kind: HumanInteractionKindEnum, options?: string[]): void {
  if (kind === HumanInteractionKindEnum.CHOOSE && (!options || options.length < 2)) {
    throw new BadRequestException('`choose` interactions require at least two options.');
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
    subscriberId: input.subscriberId,
    _agentId: input.agentId,
    integrationIdentifier: input.integrationIdentifier,
    platform: input.platform,
    ...(input.platformThreadId ? { platformThreadId: input.platformThreadId } : {}),
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
    subscriberId: string;
    kind: HumanInteractionKindEnum;
    errorMessage: (pendingCount: number, cap: number) => string;
  }
): Promise<void> {
  if (params.kind === HumanInteractionKindEnum.TELL) {
    return;
  }

  const pendingCount = await repository.countPendingForSubscriber(params.environmentId, params.subscriberId);
  const cap = resolveHumanPendingCap();

  if (pendingCount >= cap) {
    throw new HttpException(params.errorMessage(pendingCount, cap), 429);
  }
}

export async function deliverHumanInteractionOrRollback(
  repository: HumanInteractionRepository,
  logger: PinoLogger,
  interaction: HumanInteractionEntity,
  deliver: () => Promise<HumanDeliveryRefs>,
  options: {
    logMessage: string;
    logContext?: Record<string, unknown>;
    failMessage: (err: unknown) => string;
  }
): Promise<HumanInteractionEntity> {
  let deliveryRefs: HumanDeliveryRefs | null = null;

  try {
    deliveryRefs = await deliver();
    await repository.stampDelivery(interaction._environmentId, interaction._id, deliveryRefs);

    const delivered: HumanInteractionEntity = { ...interaction, ...deliveryRefs };

    if (interaction.kind === HumanInteractionKindEnum.TELL) {
      const settled = await repository.markDeliveredIfPending(interaction._environmentId, interaction._id);

      return settled ?? { ...delivered, status: HumanInteractionStatusEnum.DELIVERED };
    }

    return delivered;
  } catch (err) {
    if (!deliveryRefs) {
      await repository
        .delete({ _id: interaction._id, _environmentId: interaction._environmentId })
        .catch(() => undefined);
    } else {
      await repository.stampDelivery(interaction._environmentId, interaction._id, deliveryRefs).catch(() => undefined);
    }

    logger.warn(
      {
        err,
        interactionIdentifier: interaction.identifier,
        delivered: Boolean(deliveryRefs),
        ...options.logContext,
      },
      options.logMessage
    );

    throw new BadGatewayException(options.failMessage(err));
  }
}
