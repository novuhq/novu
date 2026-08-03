import { Injectable } from '@nestjs/common';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { WorkflowAgentDispatchDBModel, WorkflowAgentDispatchEntity } from './workflow-agent-dispatch.entity';
import { WorkflowAgentDispatch } from './workflow-agent-dispatch.schema';

export type CreateWorkflowAgentDispatchParams = {
  environmentId: string;
  organizationId: string;
  agentId: string;
  integrationId: string;
  platform: string;
  platformThreadId: string;
  platformMessageId: string;
  notificationId: string;
  jobId: string;
  messageId: string;
  transactionId: string;
  workflowIdentifier: string;
  stepId?: string;
  subscriberId: string;
};

@Injectable()
export class WorkflowAgentDispatchRepository extends BaseRepositoryV2<
  WorkflowAgentDispatchDBModel,
  WorkflowAgentDispatchEntity,
  EnforceEnvOrOrgIds
> {
  constructor() {
    super(WorkflowAgentDispatch, WorkflowAgentDispatchEntity);
  }

  async findByPlatformThread(
    environmentId: string,
    organizationId: string,
    agentId: string,
    integrationId: string,
    platformThreadId: string
  ): Promise<WorkflowAgentDispatchEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        _agentId: agentId,
        _integrationId: integrationId,
        platformThreadId,
      },
      '*'
    );
  }

  /**
   * Upsert a post-send hydration seed keyed by agent + integration + platform thread.
   * Duplicate key from a concurrent/retry write re-reads the existing seed.
   */
  async createSeed(params: CreateWorkflowAgentDispatchParams): Promise<WorkflowAgentDispatchEntity> {
    let seed: WorkflowAgentDispatchEntity | null = null;

    try {
      seed = await this.findOneAndUpdate(
        {
          _environmentId: params.environmentId,
          _organizationId: params.organizationId,
          _agentId: params.agentId,
          _integrationId: params.integrationId,
          platformThreadId: params.platformThreadId,
        },
        {
          $setOnInsert: {
            platform: params.platform,
            platformMessageId: params.platformMessageId,
            _notificationId: params.notificationId,
            _jobId: params.jobId,
            _messageId: params.messageId,
            transactionId: params.transactionId,
            workflowIdentifier: params.workflowIdentifier,
            stepId: params.stepId,
            subscriberId: params.subscriberId,
          },
        },
        { upsert: true, new: true }
      );
    } catch (error) {
      seed = await this.findByPlatformThread(
        params.environmentId,
        params.organizationId,
        params.agentId,
        params.integrationId,
        params.platformThreadId
      );

      if (!seed) {
        throw error;
      }
    }

    if (!seed) {
      throw new Error(
        `Failed to create workflow agent dispatch seed for platformThreadId ${params.platformThreadId}`
      );
    }

    return seed;
  }
}
