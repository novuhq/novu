import {
  NotificationGroupRepository,
  NotificationTemplateRepository,
  TenantRepository,
  WorkflowOverrideRepository,
} from '@novu/dal';
import { ICreateWorkflowOverrideRequestDto } from '@novu/shared';

export class WorkflowOverrideService {
  constructor(private config: { organizationId: string; environmentId: string }) {}

  private notificationTemplateRepository = new NotificationTemplateRepository();
  private notificationGroupRepository = new NotificationGroupRepository();
  private tenantRepository = new TenantRepository();
  private workflowOverrideRepository = new WorkflowOverrideRepository();

  async createWorkflowOverride(override: Partial<ICreateWorkflowOverrideRequestDto> = {}) {
    const { organizationId, environmentId } = this.config;
    const tenant = await this.tenantRepository.create({
      _organizationId: organizationId,
      _environmentId: environmentId,
      identifier: 'identifier_123',
      name: 'name_123',
      data: { test1: 'test value1', test2: 'test value2' },
    });

    const groups = await this.notificationGroupRepository.find({
      _environmentId: environmentId,
    });

    const workflowId = override._workflowId || (await this.createWorkflow(groups))._id;

    return await this.workflowOverrideRepository.create({
      _organizationId: organizationId,
      _environmentId: environmentId,
      _workflowId: workflowId,
      _tenantId: tenant._id,
    });
  }

  private async createWorkflow(groups) {
    const { organizationId, environmentId } = this.config;

    return await this.notificationTemplateRepository.create({
      _organizationId: organizationId,
      _environmentId: environmentId,
      name: 'test api template',
      description: 'This is a test description',
      tags: ['test-tag-api'],
      notificationGroupId: groups[0]._id,
      steps: [],
      triggers: [{ identifier: 'test-trigger-api' }],
    });
  }
}
