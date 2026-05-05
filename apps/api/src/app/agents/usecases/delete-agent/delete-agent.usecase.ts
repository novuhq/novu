import { Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService, PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, SubscriberAgentVaultRepository } from '@novu/dal';

import { trackAgentDeleted } from '../../agent-analytics';
import { AnthropicAgentCredentialsService } from '../../services/anthropic-agent-credentials.service';
import { SubscriberAnthropicVaultService } from '../../services/subscriber-anthropic-vault.service';
import { CleanupNovuEmail } from '../cleanup-novu-email/cleanup-novu-email.usecase';
import { DeleteAgentCommand } from './delete-agent.command';

@Injectable()
export class DeleteAgent {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly cleanupNovuEmail: CleanupNovuEmail,
    private readonly analyticsService: AnalyticsService,
    private readonly subscriberVaultRepository: SubscriberAgentVaultRepository,
    private readonly subscriberVaultService: SubscriberAnthropicVaultService,
    private readonly credentialsService: AnthropicAgentCredentialsService,
    private readonly logger: PinoLogger
  ) {}

  async execute(command: DeleteAgentCommand): Promise<void> {
    const agent = await this.agentRepository.findOne(
      {
        identifier: command.identifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.identifier}" was not found.`);
    }

    // Anthropic vault cleanup happens before the DB transaction so a partial archive
    // can't leave us with a deleted Novu agent and orphan vault references.
    await this.cleanupSubscriberVaults({
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
    });

    await this.agentRepository.withTransaction(async (session) => {
      await this.cleanupNovuEmail.cleanupForAgent(agent._id, command.environmentId, command.organizationId, session);

      await this.agentIntegrationRepository.delete(
        {
          _agentId: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );

      await this.agentRepository.delete(
        {
          _id: agent._id,
          _environmentId: command.environmentId,
          _organizationId: command.organizationId,
        },
        { session }
      );
    });

    trackAgentDeleted(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentId: agent._id,
      agentIdentifier: command.identifier,
    });
  }

  private async cleanupSubscriberVaults(params: {
    organizationId: string;
    environmentId: string;
    agentId: string;
  }): Promise<void> {
    const vaults = await this.subscriberVaultRepository.findAllForAgent(params);
    if (vaults.length === 0) {
      return;
    }

    let apiKey: string;
    try {
      apiKey = await this.credentialsService.getApiKey(params.organizationId, params.environmentId);
    } catch (err) {
      // No API key — we still drop our local rows so the agent record is clean. The
      // Anthropic vaults will be orphaned but admins can clean them up via the console.
      this.logger.warn(
        err,
        `[agent:${params.agentId}] No Anthropic API key while deleting agent; dropping ${vaults.length} subscriber vault rows without remote archive`
      );
      await Promise.all(
        vaults.map((vault) =>
          this.subscriberVaultRepository.deleteOne({
            organizationId: params.organizationId,
            environmentId: params.environmentId,
            vaultId: vault._id,
          })
        )
      );

      return;
    }

    await Promise.all(
      vaults.map((vault) =>
        this.subscriberVaultService
          .archiveVault({
            organizationId: params.organizationId,
            environmentId: params.environmentId,
            apiKey,
            vault,
          })
          .catch((err) => {
            this.logger.warn(err, `Failed to archive subscriber vault ${vault._id} during agent delete`);
          })
      )
    );
  }
}
