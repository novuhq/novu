import { Injectable } from '@nestjs/common';
import { NotificationTemplateRepository, NotificationTemplateEntity } from '@novu/dal';
import { WorkflowStatusEnum } from '@novu/shared';
import { SYNCABLE_WORKFLOW_ORIGINS } from '../../../../../workflows-v2/usecases/sync-to-environment/sync-to-environment.usecase';

@Injectable()
export class WorkflowRepositoryService {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async fetchSyncableWorkflows(environmentId: string, organizationId: string): Promise<NotificationTemplateEntity[]> {
    return await this.notificationTemplateRepository.find({
      _environmentId: environmentId,
      _organizationId: organizationId,
      origin: { $in: SYNCABLE_WORKFLOW_ORIGINS },
      status: { $ne: WorkflowStatusEnum.ERROR },
    });
  }

  getWorkflowIdentifier(workflow: NotificationTemplateEntity): string {
    return workflow.triggers?.[0]?.identifier as string;
  }

  createWorkflowMap(workflows: NotificationTemplateEntity[]): Map<string, NotificationTemplateEntity> {
    return new Map(workflows.map((workflow) => [this.getWorkflowIdentifier(workflow), workflow]));
  }
}
