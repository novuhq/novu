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

  async getList(options: { skip: number; limit: number }, query: { environmentId: string }) {
    {
      const requestQuery: Partial<IWorkflowOverride> = {
        _environmentId: query.environmentId,
      };

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
