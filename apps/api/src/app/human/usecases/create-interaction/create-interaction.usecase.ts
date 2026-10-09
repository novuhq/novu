import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InstrumentUsecase, PinoLogger } from '@novu/application-generic';
import { AgentEntity, AgentRepository, HumanInteractionRepository } from '@novu/dal';
import { HumanInteractionStatusEnum, normalizeHumanTo } from '@novu/shared';
import { HumanInteractionActivityRecorder } from '../../../agents/human-relay/human-interaction-activity.recorder';
import { ConnectClaimTokenService } from '../../../connect/services/connect-claim-token.service';
import { isKeylessOrganization } from '../../../keyless/keyless-organization.helpers';
import { type InteractionResponseDto, toInteractionResponse } from '../../dtos/interaction-response.dto';
import { HumanDeliveryService } from '../../services/human-delivery.service';
import {
  assertHumanCardActions,
  assertHumanPendingCap,
  buildPendingHumanInteraction,
  deliverToTargets,
  type HumanDeliveryTarget,
  toStoredContent,
} from '../../services/human-interaction-lifecycle';
import { HumanKeylessCapService, isHumanBrowserLoginAvailable } from '../../services/human-keyless-cap.service';
import { DEFAULT_HUMAN_RELAY_IDENTIFIER } from '../setup-human-relay/setup-human-relay.usecase';
import { CreateInteractionCommand } from './create-interaction.command';

/**
 * Where the Human dashboard runs, setups are claimed there and the CLI continues with `human login`.
 * Elsewhere (self-hosted) they're claimed on the dashboard, and the CLI needs the environment's key.
 */
function keylessHumanClaimedMessage(): string {
  if (isHumanBrowserLoginAvailable()) {
    return 'This setup was moved into your Human account. Run `human login` to keep using it.';
  }

  return 'This demo workspace was claimed into your Novu account. Run `human setup --secret-key <your Development environment key>` (or set NOVU_SECRET_KEY) to continue.';
}

@Injectable()
export class CreateInteraction {
  constructor(
    private readonly humanInteractionRepository: HumanInteractionRepository,
    private readonly agentRepository: AgentRepository,
    private readonly deliveryService: HumanDeliveryService,
    private readonly connectClaimTokenService: ConnectClaimTokenService,
    private readonly logger: PinoLogger,
    private readonly activityRecorder: HumanInteractionActivityRecorder,
    private readonly keylessCap: HumanKeylessCapService
  ) {
    this.logger.setContext(this.constructor.name);
  }

  @InstrumentUsecase()
  async execute(command: CreateInteractionCommand): Promise<InteractionResponseDto> {
    const title = 'title' in command.card ? (command.card.title?.trim() ?? '') : '';
    if (!title) {
      throw new BadRequestException('`card.title` is required.');
    }

    assertHumanCardActions(command.kind, command.card);

    // Once claimed, the relay agent and channels live in the user's own
    // environment; a stale keyless credential must not read as "run setup".
    if (
      isKeylessOrganization(command.organizationId) &&
      (await this.connectClaimTokenService.isEnvironmentClaimed(command.environmentId))
    ) {
      throw new ForbiddenException(keylessHumanClaimedMessage());
    }

    const agent = await this.resolveAgent(command);
    const subscriberIds = normalizeHumanTo(command.to);
    if (subscriberIds.length === 0) {
      throw new BadRequestException('`to` must include at least one subscriberId');
    }

    await this.keylessCap.assertWithinCap({
      environmentId: command.environmentId,
      organizationId: command.organizationId,
      agentId: agent._id,
      subscriberIds,
      via: command.via,
    });

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
        content: toStoredContent(command.kind, { ...command.card, title }),
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

    await this.activityRecorder.recordRequest(delivered.interaction);

    if (delivered.interaction.status === HumanInteractionStatusEnum.DELIVERED) {
      await this.activityRecorder.recordResponse(delivered.interaction);
    }

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
