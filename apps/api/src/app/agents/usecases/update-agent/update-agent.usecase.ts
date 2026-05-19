import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { assertSafeOutboundUrl, resolvePublicAddresses, SsrfBlockedError } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, EnvironmentRepository, IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum, EnvironmentTypeEnum } from '@novu/shared';
import type { ClientSession } from 'mongoose';
import type { AgentResponseDto } from '../../dtos';
import { toAgentResponse } from '../../mappers/agent-response.mapper';
import { UpdateAgentCommand } from './update-agent.command';

@Injectable()
export class UpdateAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: UpdateAgentCommand): Promise<AgentResponseDto> {
    const hasBehaviorFields =
      command.behavior?.acknowledgeOnReceived !== undefined || command.behavior?.reactionOnResolved !== undefined;

    const hasGeneralFields =
      command.name !== undefined ||
      command.description !== undefined ||
      command.active !== undefined ||
      hasBehaviorFields;
    const hasBridgeFields =
      command.bridgeUrl !== undefined || command.devBridgeUrl !== undefined || command.devBridgeActive !== undefined;

    if (!hasGeneralFields && !hasBridgeFields) {
      throw new BadRequestException('At least one field must be provided.');
    }

    const hasReadOnlyFields = command.name !== undefined || command.description !== undefined || hasBehaviorFields;

    if (hasReadOnlyFields) {
      await this.assertNotProduction(
        command.environmentId,
        command.organizationId,
        'Only the active status and bridge URL can be modified in production environments.'
      );
    }

    if (command.devBridgeActive !== undefined || command.devBridgeUrl !== undefined) {
      await this.assertNotProduction(
        command.environmentId,
        command.organizationId,
        'Dev bridge settings cannot be modified in production environments.'
      );
    }

    // The bridge executor `fetch()`s these URLs from inside the API process on every
    // inbound chat event with a Novu HMAC and sensitive payload (subscriber + history).
    // Without an SSRF guard, an authenticated AGENT_WRITE caller can repoint the bridge
    // at internal hosts (loopback, RFC1918, link-local 169.254.169.254, cloud metadata).
    await this.assertSafeBridgeUrl(command.bridgeUrl, 'bridgeUrl');
    await this.assertSafeBridgeUrl(command.devBridgeUrl, 'devBridgeUrl');

    const existing = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!existing) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    const $set: Record<string, string | boolean | null> = {};

    if (command.name !== undefined) {
      $set.name = command.name;
    }

    if (command.description !== undefined) {
      $set.description = command.description;
    }

    if (command.active !== undefined) {
      $set.active = command.active;
    }

    if (hasBehaviorFields) {
      if (command.behavior!.acknowledgeOnReceived !== undefined) {
        $set['behavior.acknowledgeOnReceived'] = command.behavior!.acknowledgeOnReceived;
      }
      if (command.behavior!.reactionOnResolved !== undefined) {
        $set['behavior.reactionOnResolved'] = command.behavior!.reactionOnResolved;
      }
    }

    if (command.bridgeUrl !== undefined) {
      $set.bridgeUrl = command.bridgeUrl;
    }

    if (command.devBridgeUrl !== undefined) {
      $set.devBridgeUrl = command.devBridgeUrl;
    }

    if (command.devBridgeActive !== undefined) {
      $set.devBridgeActive = command.devBridgeActive;
    }

    const nameChanged = command.name !== undefined && command.name !== existing.name;
    const agentQuery = {
      _id: existing._id,
      _environmentId: command.environmentId,
      _organizationId: command.organizationId,
    };

    if (nameChanged) {
      await this.agentRepository.withTransaction(async (session) => {
        if (Object.keys($set).length > 0) {
          await this.agentRepository.update(agentQuery, { $set }, session ? { session } : {});
        }

        await this.syncNovuAgentSenderName(
          existing._id,
          command.environmentId,
          command.organizationId,
          command.name!,
          session
        );
      });
    } else if (Object.keys($set).length > 0) {
      await this.agentRepository.updateOne(agentQuery, { $set });
    }

    const updated = await this.agentRepository.findById(
      {
        _id: existing._id,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      '*'
    );

    if (!updated) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    return toAgentResponse(updated);
  }

  private async assertNotProduction(environmentId: string, organizationId: string, message: string): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      { _id: environmentId, _organizationId: organizationId },
      ['type', 'name']
    );

    if (environment?.type === EnvironmentTypeEnum.PROD) {
      throw new ForbiddenException(message);
    }
  }

  private async syncNovuAgentSenderName(
    agentId: string,
    environmentId: string,
    organizationId: string,
    senderName: string,
    session: ClientSession | null = null
  ): Promise<void> {
    const links = await this.agentIntegrationRepository.find(
      {
        _agentId: agentId,
        _environmentId: environmentId,
        _organizationId: organizationId,
      },
      ['_integrationId'],
      { session }
    );

    const integrationIds = links.map((link) => link._integrationId).filter(Boolean);
    if (integrationIds.length === 0) {
      return;
    }

    await this.integrationRepository.update(
      {
        _id: { $in: integrationIds } as unknown as string,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      { $set: { 'credentials.senderName': senderName } },
      session ? { session } : {}
    );
  }

  private async assertSafeBridgeUrl(url: string | undefined | null, field: string): Promise<void> {
    if (!url) {
      return;
    }

    try {
      const parsed = assertSafeOutboundUrl(url);
      await resolvePublicAddresses(parsed.hostname);
    } catch (err) {
      if (err instanceof SsrfBlockedError) {
        throw new BadRequestException(`${field}: ${err.message}`);
      }
      throw err;
    }
  }
}
