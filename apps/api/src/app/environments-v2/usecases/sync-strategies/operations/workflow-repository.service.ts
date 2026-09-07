import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity, NotificationTemplateRepository } from '@novu/dal';

@Injectable()
export class WorkflowRepositoryService {
  constructor(private notificationTemplateRepository: NotificationTemplateRepository) {}

  async fetchSyncableWorkflows(environmentId: string, organizationId: string): Promise<NotificationTemplateEntity[]> {
    return await this.notificationTemplateRepository.findPublishable(environmentId, organizationId);
  }

  getWorkflowIdentifier(workflow: NotificationTemplateEntity): string {
    return workflow.triggers?.[0]?.identifier as string;
  }

  createWorkflowMap(workflows: NotificationTemplateEntity[]): Map<string, NotificationTemplateEntity> {
    return new Map(workflows.map((workflow) => [this.getWorkflowIdentifier(workflow), workflow]));
  }
}
