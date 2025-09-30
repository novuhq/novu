import { Injectable } from '@nestjs/common';
import { NotificationTemplateEntity } from '@novu/dal';
import { IBaseRepositoryService } from '../base/interfaces/base-repository.interface';
import { WorkflowRepositoryService } from '../operations/workflow-repository.service';

@Injectable()
export class WorkflowRepositoryAdapter implements IBaseRepositoryService<NotificationTemplateEntity> {
  constructor(private readonly workflowRepositoryService: WorkflowRepositoryService) {}

  async fetchSyncableResources(environmentId: string, organizationId: string): Promise<NotificationTemplateEntity[]> {
    return this.workflowRepositoryService.fetchSyncableWorkflows(environmentId, organizationId);
  }

  createResourceMap(resources: NotificationTemplateEntity[]): Map<string, NotificationTemplateEntity> {
    return this.workflowRepositoryService.createWorkflowMap(resources);
  }

  getResourceIdentifier(resource: NotificationTemplateEntity): string {
    return this.workflowRepositoryService.getWorkflowIdentifier(resource);
  }
}
