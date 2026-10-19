import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, DomainRouteRepository, IntegrationRepository } from '@novu/dal';
import { AGENT_INBOX_PROVIDER_IDS } from '@novu/shared';
import { ClientSession } from 'mongoose';

const LOG_CONTEXT = 'NovuEmailCleanupService';

@Injectable()
export class NovuEmailCleanupService {
  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext(this.constructor.name);
  }

  /**
   * Removes all NovuAgent email resources tied to an agent:
   * domain routes pointing to the agent, and any NovuAgent Integration documents.
   * Must be called within a transaction session.
   */
  async cleanupForAgent(
    agentId: string,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<void> {
    await this.domainRouteRepository.removeByDestination(environmentId, organizationId, agentId, { session });

    const novuIntegrationIds = await this.findNovuEmailIntegrationIds(agentId, environmentId, organizationId, session);

    for (const integrationId of novuIntegrationIds) {
      await this.integrationRepository.delete(
        { _id: integrationId, _environmentId: environmentId, _organizationId: organizationId },
        { session }
      );
      this.logger.info({ agentId, integrationId }, 'Deleted orphaned NovuAgent integration', LOG_CONTEXT);
    }
  }

  /**
   * Removes NovuAgent resources for a specific integration being unlinked.
   * Cleans domain routes and deletes the integration if it's a NovuAgent type.
   */
  async cleanupForIntegration(
    agentId: string,
    integrationId: string,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<void> {
    const integration = await this.integrationRepository.findOne(
      {
        _id: integrationId,
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: { $in: [...AGENT_INBOX_PROVIDER_IDS] },
      },
      '_id',
      { session }
    );

    if (!integration) return;

    // Custom routes are addressed to the agent, and either inbox can serve them.
    // Drop them only when this unlink removes the last one.
    const stillLinked = (
      await this.findNovuEmailIntegrationIds(agentId, environmentId, organizationId, session)
    ).filter((id) => String(id) !== String(integration._id));

    if (stillLinked.length === 0) {
      await this.domainRouteRepository.removeByDestination(environmentId, organizationId, agentId, { session });
    }

    await this.integrationRepository.delete(
      { _id: integration._id, _environmentId: environmentId, _organizationId: organizationId },
      { session }
    );

    this.logger.info(
      { agentId, integrationId: integration._id, removedRoutes: stillLinked.length === 0 },
      'Cleaned up agent inbox integration',
      LOG_CONTEXT
    );
  }

  private async findNovuEmailIntegrationIds(
    agentId: string,
    environmentId: string,
    organizationId: string,
    session: ClientSession | null
  ): Promise<string[]> {
    const links = await this.agentIntegrationRepository.find(
      { _agentId: agentId, _environmentId: environmentId, _organizationId: organizationId },
      ['_integrationId'],
      { session }
    );

    const integrationIds = links.map((l) => l._integrationId).filter(Boolean);
    if (integrationIds.length === 0) return [];

    const novuIntegrations = await this.integrationRepository.find(
      {
        _id: { $in: integrationIds },
        _environmentId: environmentId,
        _organizationId: organizationId,
        providerId: { $in: [...AGENT_INBOX_PROVIDER_IDS] },
      },
      '_id',
      { session }
    );

    return novuIntegrations.map((i) => i._id);
  }
}
