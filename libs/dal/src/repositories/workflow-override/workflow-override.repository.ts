import { SoftDeleteModel } from 'mongoose-delete';

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
}
