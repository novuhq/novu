import { Injectable, NotFoundException } from '@nestjs/common';
import { AgentIntegrationRepository, AgentRepository, IntegrationRepository } from '@novu/dal';

import { SyncAgentToEnvironmentCommand } from './sync-agent-to-environment.command';

@Injectable()
export class SyncAgentToEnvironment {
  constructor(
    private readonly agentRepository: AgentRepository,
    private readonly agentIntegrationRepository: AgentIntegrationRepository,
    private readonly integrationRepository: IntegrationRepository
  ) {}

  async execute(command: SyncAgentToEnvironmentCommand): Promise<void> {
    const { agentIdentifier, environmentId: sourceEnvironmentId, targetEnvironmentId, organizationId } = command;

    if (sourceEnvironmentId === targetEnvironmentId) {
      throw new Error('Source and target environments cannot be the same');
    }

    const sourceAgent = await this.agentRepository.findOne(
      { identifier: agentIdentifier, _environmentId: sourceEnvironmentId, _organizationId: organizationId },
      '*'
    );

    if (!sourceAgent) {
      throw new NotFoundException(`Source agent "${agentIdentifier}" not found in environment ${sourceEnvironmentId}`);
    }

    const sourceLinks = await this.agentIntegrationRepository.find(
      { _agentId: sourceAgent._id, _environmentId: sourceEnvironmentId, _organizationId: organizationId },
      '*'
    );

    const sourceIntegrationIds = sourceLinks.map((l) => l._integrationId);
    const sourceIntegrations =
      sourceIntegrationIds.length > 0
        ? await this.integrationRepository.find({
            _id: { $in: sourceIntegrationIds },
            _environmentId: sourceEnvironmentId,
            _organizationId: organizationId,
          })
        : [];
    const sourceIntegrationMap = new Map(sourceIntegrations.map((i) => [i._id, i]));

    let targetAgent = await this.agentRepository.findOne(
      { identifier: agentIdentifier, _environmentId: targetEnvironmentId, _organizationId: organizationId },
      '*'
    );

    if (!targetAgent) {
      targetAgent = await this.agentRepository.create({
        name: sourceAgent.name,
        identifier: sourceAgent.identifier,
        description: sourceAgent.description,
        behavior: sourceAgent.behavior,
        active: false,
        _environmentId: targetEnvironmentId,
        _organizationId: organizationId,
      });
    } else {
      await this.agentRepository.update(
        { _id: targetAgent._id, _environmentId: targetEnvironmentId, _organizationId: organizationId },
        { $set: { name: sourceAgent.name, description: sourceAgent.description, behavior: sourceAgent.behavior } }
      );
    }

    const existingTargetLinks = await this.agentIntegrationRepository.find(
      { _agentId: targetAgent._id, _environmentId: targetEnvironmentId, _organizationId: organizationId },
      '*'
    );

    const existingTargetIntegrationIds = existingTargetLinks.map((l) => l._integrationId);
    const existingTargetIntegrations =
      existingTargetIntegrationIds.length > 0
        ? await this.integrationRepository.find({
            _id: { $in: existingTargetIntegrationIds },
            _environmentId: targetEnvironmentId,
            _organizationId: organizationId,
          })
        : [];

    const parentIdToTargetLink = new Map<string, (typeof existingTargetLinks)[0]>();
    for (const targetIntegration of existingTargetIntegrations) {
      if (targetIntegration._parentId) {
        const link = existingTargetLinks.find((l) => l._integrationId === targetIntegration._id);
        if (link) {
          parentIdToTargetLink.set(targetIntegration._parentId, link);
        }
      }
    }

    const processedSourceIntegrationIds = new Set<string>();

    for (const sourceLink of sourceLinks) {
      const sourceIntegration = sourceIntegrationMap.get(sourceLink._integrationId);
      if (!sourceIntegration) continue;

      processedSourceIntegrationIds.add(sourceIntegration._id);

      if (parentIdToTargetLink.has(sourceIntegration._id)) {
        continue;
      }

      // Reuse an existing stub if another agent already created one for this source integration
      let stubIntegration = await this.integrationRepository.findOne({
        _parentId: sourceIntegration._id,
        _environmentId: targetEnvironmentId,
        _organizationId: organizationId,
      });

      if (!stubIntegration) {
        stubIntegration = await this.integrationRepository.create({
          providerId: sourceIntegration.providerId,
          channel: sourceIntegration.channel,
          name: sourceIntegration.name,
          identifier: sourceIntegration.identifier,
          credentials: {},
          active: true,
          primary: false,
          priority: 0,
          _parentId: sourceIntegration._id,
          _environmentId: targetEnvironmentId,
          _organizationId: organizationId,
        });
      }

      await this.agentIntegrationRepository.create({
        _agentId: targetAgent._id,
        _integrationId: stubIntegration._id,
        connectedAt: null,
        _environmentId: targetEnvironmentId,
        _organizationId: organizationId,
      });
    }

    for (const [sourceIntegrationId, link] of parentIdToTargetLink.entries()) {
      if (!processedSourceIntegrationIds.has(sourceIntegrationId)) {
        await this.agentIntegrationRepository.delete({
          _id: link._id,
          _environmentId: targetEnvironmentId,
          _organizationId: organizationId,
        });

        // Only delete the stub integration if no other agent links still reference it
        const remainingLinks = await this.agentIntegrationRepository.find(
          { _integrationId: link._integrationId, _environmentId: targetEnvironmentId, _organizationId: organizationId },
          ['_id']
        );

        if (remainingLinks.length === 0) {
          await this.integrationRepository.delete({
            _id: link._integrationId,
            _organizationId: organizationId,
          });
        }
      }
    }
  }
}
