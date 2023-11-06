import { SoftDeleteModel } from 'mongoose-delete';

import { IWorkflowOverride } from '@novu/shared';

import { BaseRepository } from '../base-repository';
import { EnforceEnvId } from '../../types';
import { WorkflowOverrideDBModel, WorkflowOverrideEntity } from './workflow-override.entity';
import { WorkflowOverride } from './workflow-override.schema';

export class WorkflowOverrideRepository extends BaseRepository<
  WorkflowOverrideDBModel,
  WorkflowOverrideEntity,
  EnforceEnvId
> {
  private workflowOverride: SoftDeleteModel;

  constructor() {
    super(WorkflowOverride, WorkflowOverrideEntity);
    this.workflowOverride = WorkflowOverride;
  }

  async getList(options: { environmentId: string; skip: number; limit: number }, query: { _workflowId: string }) {
    {
      const requestQuery: Partial<IWorkflowOverride> = {
        _environmentId: options.environmentId,
      };

      if (query._workflowId != null) {
        requestQuery._workflowId = query._workflowId;
      }

      const response = await this.MongooseModel.find(requestQuery)
        .read('secondaryPreferred')
        .skip(options.skip || 0)
        .limit(options.limit || 10)
        .sort('-createdAt');

      return {
        data: this.mapEntities(response),
      };
    }
  }
}
