import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { AnalyticsService } from '@novu/application-generic';
import { AgentIntegrationRepository, AgentRepository, EnvironmentRepository } from '@novu/dal';
import { EnvironmentTypeEnum } from '@novu/shared';
import { NovuEmailCleanupService } from '../../../email/novu-email/cleanup-novu-email/cleanup-novu-email.service';
import { trackAgentIntegrationRemoved } from '../../../shared/analytics/agent-analytics';
import { RemoveAgentIntegrationCommand } from './remove-agent-integration.command';

@Injectable()
export class RemoveAgentIntegration {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly environmentRepository: EnvironmentRepository,
    private readonly cleanupNovuEmail: NovuEmailCleanupService,
    private readonly analyticsService: AnalyticsService
  ) {}

  async execute(command: RemoveAgentIntegrationCommand): Promise<void> {
    await this.assertNotProductionEnvironment(command.environmentId, command.organizationId);

    const agent = await this.agentRepository.findOne(
      {
        identifier: command.agentIdentifier,
        _environmentId: command.environmentId,
        _organizationId: command.organizationId,
      },
      ['_id']
    );

    if (!agent) {
      throw new NotFoundException(`Agent with identifier "${command.agentIdentifier}" was not found.`);
    }

    await this.agentIntegrationRepository.withTransaction(async (session) => {
      // Soft delete: the tombstoned link lets the inbound-webhook heal distinguish
      // a deliberate disconnect from a never-linked orphan, so platform webhooks
      // that still target this integration cannot resurrect the channel.
      const disconnected = await this.agentIntegrationRepository.softDisconnect({
        agentIntegrationId: command.agentIntegrationId,
        agentId: agent._id,
        environmentId: command.environmentId,
        organizationId: command.organizationId,
        session,
      });

      if (!disconnected) {
        throw new NotFoundException(
          `Agent-integration link "${command.agentIntegrationId}" was not found for this agent.`
        );
      }

      await this.cleanupNovuEmail.cleanupForIntegration(
        agent._id,
        disconnected._integrationId,
        command.environmentId,
        command.organizationId,
        session
      );
    });

    trackAgentIntegrationRemoved(this.analyticsService, {
      userId: command.userId,
      organizationId: command.organizationId,
      environmentId: command.environmentId,
      agentIdentifier: command.agentIdentifier,
      agentIntegrationId: command.agentIntegrationId,
    });
  }

  private async assertNotProductionEnvironment(environmentId: string, organizationId: string): Promise<void> {
    const environment = await this.environmentRepository.findOne(
      { _id: environmentId, _organizationId: organizationId },
      ['type', 'name']
    );

    if (environment?.type === EnvironmentTypeEnum.PROD) {
      throw new ForbiddenException('Agent integrations cannot be removed in production environments.');
    }
  }
}
