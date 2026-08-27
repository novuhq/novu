import { forwardRef, Inject, Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentRepository, primaryHumanInteractionDelivery, type HumanInteractionEntity } from '@novu/dal';
import { HumanInteractionStatusEnum, parseNovuHumanRequestId } from '@novu/shared';
import { AgentPlatformEnum } from '../../shared/enums/agent-platform.enum';
import { ManagedAgentService } from '../managed-agent.service';

@Injectable()
export class ResumeManagedHuman {
  constructor(
    private readonly agentRepository: AgentRepository,
    @Inject(forwardRef(() => ManagedAgentService))
    private readonly managedAgentService: ManagedAgentService,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  async execute(interaction: HumanInteractionEntity): Promise<void> {
    const correlation = parseNovuHumanRequestId(interaction.requestId);
    if (!correlation || !interaction._conversationId) {
      return;
    }

    const agent = await this.agentRepository.findOne(
      {
        _id: interaction._agentId,
        _environmentId: interaction._environmentId,
        _organizationId: interaction._organizationId,
      },
      ['identifier']
    );

    if (!agent?.identifier) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier, agentId: interaction._agentId },
        'Skipping managed HITL resume — agent not found'
      );

      return;
    }

    const delivery = primaryHumanInteractionDelivery(interaction);
    if (!delivery) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier },
        'Skipping managed HITL resume — no delivery'
      );

      return;
    }

    const platform = toAgentPlatform(delivery.platform);
    if (!platform) {
      this.logger.warn(
        { interactionIdentifier: interaction.identifier, platform: delivery.platform },
        'Skipping managed HITL resume — unknown platform'
      );

      return;
    }

    try {
      await this.managedAgentService.sendToolResult({
        conversationId: interaction._conversationId,
        environmentId: interaction._environmentId,
        organizationId: interaction._organizationId,
        agentIdentifier: agent.identifier,
        integrationIdentifier: delivery.integrationIdentifier,
        subscriberId: delivery.subscriberId,
        toolUseId: correlation.toolUseId,
        content: JSON.stringify(buildManagedHumanToolResult(interaction)),
        platform,
        platformThreadId: delivery.platformThreadId,
      });
    } catch (err) {
      this.logger.warn(
        {
          err: err instanceof Error ? err.message : String(err),
          interactionIdentifier: interaction.identifier,
          toolUseId: correlation.toolUseId,
        },
        'Failed to resume managed session after HITL settlement'
      );
    }
  }
}

export function buildManagedHumanToolResult(interaction: HumanInteractionEntity): Record<string, unknown> {
  const status = interaction.status;
  const approved = status === HumanInteractionStatusEnum.APPROVED;
  const expired = status === HumanInteractionStatusEnum.EXPIRED;
  const rejected =
    status === HumanInteractionStatusEnum.DENIED || status === HumanInteractionStatusEnum.CANCELED || expired;

  return {
    ok: !rejected,
    kind: interaction.kind,
    status,
    ...(interaction.response?.text !== undefined ? { text: interaction.response.text } : {}),
    ...(interaction.response?.optionId !== undefined ? { optionId: interaction.response.optionId } : {}),
    ...(status === HumanInteractionStatusEnum.APPROVED || status === HumanInteractionStatusEnum.DENIED
      ? { approved }
      : {}),
    expired,
    instruction: rejected
      ? 'The human did not approve this action. Do not run the rejected side effect. Choose another path or stop.'
      : 'The human answered. Continue from this verdict.',
  };
}

function toAgentPlatform(platform: string): AgentPlatformEnum | null {
  return (Object.values(AgentPlatformEnum) as string[]).includes(platform) ? (platform as AgentPlatformEnum) : null;
}
