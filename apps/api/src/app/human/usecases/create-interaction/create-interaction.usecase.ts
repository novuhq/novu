import { BadRequestException, ForbiddenException, HttpException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentEntity, AgentRepository, HumanInteractionRepository } from '@novu/dal';
import { normalizeHumanTo } from '@novu/shared';
import type { ReplyContentDto } from '../../../agents/shared/dtos/agent-reply-payload.dto';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { resolveKeylessHumanInteractionCap } from '../../../keyless/keyless-abuse.constants';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import { buildConnectClaimUrl, buildKeylessHumanSignupCard } from '../../../keyless/keyless-signup.helpers';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  assertHumanChooseOptions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverToTargets,
  type HumanDeliveryTarget,
} from '../../services/human-interaction-lifecycle';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateInteractionCommand } from './create-interaction.command';

/** Machine-readable code on the 429 body so `@novu/human` can branch without parsing prose. */
export const KEYLESS_HUMAN_CAP_REACHED_CODE = 'KEYLESS_HUMAN_CAP_REACHED';

/** Machine-readable code used by `@novu/human` to offer browser re-authentication after a claim. */
export const KEYLESS_HUMAN_CLAIMED_CODE = 'KEYLESS_HUMAN_CLAIMED';

export const KEYLESS_HUMAN_CLAIMED_MESSAGE =
  'This demo workspace was claimed into your Novu account. Run `human auth` to continue.';

@Injectable()
export class CreateInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateInteractionCommand): Promise<InteractionResponseDto> {
    assertHumanChooseOptions(command.kind, command.options);

    const isKeyless = isKeylessOrganization(command.organizationId);

    // Once claimed, the relay agent and channels live in the user's own
    // environment; a stale keyless credential must not read as "run setup".
    if (isKeyless && (await this.connectClaimTokenService.isEnvironmentClaimed(command.environmentId))) {
      throw new ForbiddenException({
        statusCode: 403,
        message: KEYLESS_HUMAN_CLAIMED_MESSAGE,
        code: KEYLESS_HUMAN_CLAIMED_CODE,
      });
    }

    const agent = await this.resolveAgent(command);
    const subscriberIds = normalizeHumanTo(command.to);
    if (subscriberIds.length === 0) {
      throw new BadRequestException('`to` must include at least one subscriberId');
    }

    if (isKeyless) {
      await this.assertKeylessHumanCap(command, agent, subscriberIds);
    }

    await assertHumanPendingCap(this.humanInteractionRepository, {
      environmentId: command.environmentId,
      subscriberIds,
      kind: command.kind,
      errorMessage: (pendingCount, cap, subscriberId) =>
        `Human "${subscriberId}" already has ${pendingCount} pending interactions (cap ${cap}). Wait for answers or cancel stale ones with \`human list\`.`,
    });

    const resolved = await this.resolveTargets(command, agent, subscriberIds);

    const interaction = await this.humanInteractionRepository.create(
      buildPendingHumanInteraction({
        kind: command.kind,
        prompt: command.prompt,
        options: command.options,
        from: command.from,
        subscriberIds,
        agentId: agent._id,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        ttlSeconds: command.ttlSeconds,
      })
    );

    const targets: HumanDeliveryTarget[] = resolved.map(({ subscriberId, target }) => ({
      subscriberId,
      integrationIdentifier: target.integrationIdentifier,
      platform: target.platform,
      deliver: () => this.deliveryService.deliver(interaction, target),
    }));

    const delivered = await deliverToTargets(this.humanInteractionRepository, this.logger, interaction, targets, {
      logMessage: 'Human interaction delivery failed for one recipient',
    });

    return toInteractionResponse(delivered.interaction, delivered.failedSubscriberIds);
  }

  private async resolveTargets(command: CreateInteractionCommand, agent: AgentEntity, subscriberIds: string[]) {
    return Promise.all(
      subscriberIds.map(async (subscriberId) => ({
        subscriberId,
        target: await this.deliveryService.resolveChannel({
          environmentId: command.environmentId,
          organizationId: command.organizationId,
          agentId: agent._id,
          subscriberId,
          via: command.via,
        }),
      }))
    );
  }

  /**
   * Keyless demo cap (`KEYLESS_HUMAN_INTERACTION_CAP`, counted across every
   * interaction the environment ever created). Past it, the human gets the
   * sign-up card on the channel the prompt would have used — once per
   * environment, so a retrying agent does not spam them — and the caller gets
   * a 429 carrying the same claim link.
   */
  private async assertKeylessHumanCap(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    subscriberIds: string[]
  ): Promise<void> {
    const cap = resolveKeylessHumanInteractionCap();
    const used = await this.humanInteractionRepository.count({ _environmentId: command.environmentId });

    if (used < cap) {
      return;
    }

    const claimUrl = await this.resolveClaimUrl(command);
    await this.postKeylessSignupCta(command, agent, subscriberIds, claimUrl);

    const message = claimUrl
      ? `You've used the ${cap} free messages of this keyless demo. Sign up for a free Novu account to keep your channels and continue: ${claimUrl}`
      : `You've used the ${cap} free messages of this keyless demo. Sign up for a free Novu account to keep your channels and continue.`;

    throw new HttpException(
      { statusCode: 429, message, code: KEYLESS_HUMAN_CAP_REACHED_CODE, cap, ...(claimUrl ? { claimUrl } : {}) },
      429
    );
  }

  private async resolveClaimUrl(command: CreateInteractionCommand): Promise<string | undefined> {
    try {
      const { token } = await this.connectClaimTokenService.issueOrGetForEnvironment({
        env: command.environmentId,
        org: command.organizationId,
      });

      return buildConnectClaimUrl(token);
    } catch (err) {
      this.logger.warn({ err, environmentId: command.environmentId }, 'Failed to issue keyless claim token');

      return undefined;
    }
  }

  private async postKeylessSignupCta(
    command: CreateInteractionCommand,
    agent: AgentEntity,
    subscriberIds: string[],
    claimUrl: string | undefined
  ): Promise<void> {
    if (!claimUrl) {
      return;
    }

    const ctaKey = `human:${command.environmentId}`;

    try {
      if (await this.connectClaimTokenService.isSignupCtaPosted(ctaKey)) {
        return;
      }

      const content = { card: buildKeylessHumanSignupCard(claimUrl) } as ReplyContentDto;
      let deliveredCount = 0;

      for (const subscriberId of subscriberIds) {
        try {
          const target = await this.deliveryService.resolveChannel({
            environmentId: command.environmentId,
            organizationId: command.organizationId,
            agentId: agent._id,
            subscriberId,
            via: command.via,
          });
          await this.deliveryService.deliverContent(agent._id, target, content);
          deliveredCount += 1;
        } catch (err) {
          this.logger.warn({ err, subscriberId }, 'Failed to deliver keyless signup CTA to one human');
        }
      }

      if (deliveredCount > 0) {
        await this.connectClaimTokenService.tryMarkSignupCtaPosted(ctaKey);
      }
    } catch (err) {
      this.logger.warn({ err, environmentId: command.environmentId }, 'Failed to post keyless signup CTA');
    }
  }

  private async resolveAgent(command: CreateInteractionCommand): Promise<AgentEntity> {
    const identifier = command.agentIdentifier ?? DEFAULT_HUMAN_RELAY_IDENTIFIER;

    const agent = await this.agentRepository.findOne(
      {
        identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!agent) {
      if (identifier === DEFAULT_HUMAN_RELAY_IDENTIFIER) {
        throw new NotFoundException(`Relay agent "${identifier}" was not found. Run \`human setup\` first.`);
      }

      throw new NotFoundException(`Agent "${identifier}" was not found.`);
    }

    return agent;
  }
}
