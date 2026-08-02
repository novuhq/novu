import { Injectable } from '@nestjs/common';
import { WorkflowAgentDispatchDestination, WorkflowAgentDispatchStatusEnum } from '@novu/shared';
import { EnforceEnvOrOrgIds } from '../../types';
import { BaseRepositoryV2 } from '../base-repository-v2';
import { WorkflowAgentDispatchDBModel, WorkflowAgentDispatchEntity } from './workflow-agent-dispatch.entity';
import { WorkflowAgentDispatch } from './workflow-agent-dispatch.schema';

export type ReserveWorkflowAgentDispatchParams = {
  environmentId: string;
  organizationId: string;
  agentId: string;
  integrationId: string;
  idempotencyKey: string;
  platform: string;
  notificationId: string;
  jobId: string;
  messageId: string;
  transactionId: string;
  workflowIdentifier: string;
  stepId?: string;
  subscriberId: string;
  destination: WorkflowAgentDispatchDestination;
  workspaceId?: string;
  content: string;
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

  async findByIdempotencyKey(
    environmentId: string,
    organizationId: string,
    idempotencyKey: string
  ): Promise<WorkflowAgentDispatchEntity | null> {
    return this.findOne(
      {
        _environmentId: environmentId,
        _organizationId: organizationId,
        idempotencyKey,
      },
      '*'
    );
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

  async reservePending(params: ReserveWorkflowAgentDispatchParams): Promise<WorkflowAgentDispatchEntity> {
    const existing = await this.findByIdempotencyKey(
      params.environmentId,
      params.organizationId,
      params.idempotencyKey
    );

    if (existing) {
      return existing;
    }

    try {
      return await this.create({
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
        _agentId: params.agentId,
        _integrationId: params.integrationId,
        idempotencyKey: params.idempotencyKey,
        status: WorkflowAgentDispatchStatusEnum.PENDING,
        platform: params.platform,
        _notificationId: params.notificationId,
        _jobId: params.jobId,
        _messageId: params.messageId,
        transactionId: params.transactionId,
        workflowIdentifier: params.workflowIdentifier,
        stepId: params.stepId,
        subscriberId: params.subscriberId,
        destination: params.destination,
        workspaceId: params.workspaceId,
        content: params.content,
      });
    } catch (error) {
      const raced = await this.findByIdempotencyKey(params.environmentId, params.organizationId, params.idempotencyKey);

      if (raced) {
        return raced;
      }

      throw error;
    }
  }

  async markSent(params: {
    environmentId: string;
    organizationId: string;
    dispatchId: string;
    platformThreadId: string;
    platformMessageId: string;
  }): Promise<void> {
    await this.update(
      {
        _id: params.dispatchId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      {
        $set: {
          status: WorkflowAgentDispatchStatusEnum.SENT,
          platformThreadId: params.platformThreadId,
          platformMessageId: params.platformMessageId,
        },
        $unset: { content: 1 },
      }
    );
  }

  async markFailed(params: { environmentId: string; organizationId: string; dispatchId: string }): Promise<void> {
    await this.update(
      {
        _id: params.dispatchId,
        _environmentId: params.environmentId,
        _organizationId: params.organizationId,
      },
      {
        $set: {
          status: WorkflowAgentDispatchStatusEnum.FAILED,
        },
      }
    );
  }
}
