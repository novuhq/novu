import { Injectable } from '@nestjs/common';
import { PinoLogger } from '@novu/application-generic';
import { AgentIntegrationRepository, DomainRouteRepository, IntegrationRepository } from '@novu/dal';
import { EmailProviderIdEnum } from '@novu/shared';
import { ClientSession } from 'mongoose';

const LOG_CONTEXT = 'CleanupNovuEmail';

@Injectable()
export class CleanupNovuEmail {
  constructor(
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository,
    private readonly domainRouteRepository: DomainRouteRepository,
    private readonly logger: PinoLogger
  ) {}

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
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id',
      { session }
    );

    if (!integration) return;

    await this.domainRouteRepository.removeByDestination(environmentId, organizationId, agentId, { session });

    await this.integrationRepository.delete(
      { _id: integration._id, _environmentId: environmentId, _organizationId: organizationId },
      { session }
    );

    this.logger.info(
      { agentId, integrationId: integration._id },
      'Cleaned up NovuAgent integration and domain routes',
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
        providerId: EmailProviderIdEnum.NovuAgent,
      },
      '_id',
      { session }
    );

    return novuIntegrations.map((i) => i._id);
  }
}
